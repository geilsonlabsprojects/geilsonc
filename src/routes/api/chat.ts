import { createFileRoute } from "@tanstack/react-router";
import { findModel, type ProviderId } from "@/lib/ai";
import { jsonError, requireUser } from "@/lib/api-auth.server";

interface Body {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
}

/** OpenAI-compatible chat endpoints per provider. */
const OPENAI_COMPATIBLE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  hf: "https://router.huggingface.co/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

/** Server-side secret used by each provider (never exposed to the client). */
const ENV_KEY: Partial<Record<ProviderId, string>> = {
  google: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  hf: "HUGGING_FACE_API_KEY",
};

const PROVIDER_LABEL: Record<ProviderId, string> = {
  lovable: "Hub",
  hf: "Hugging Face",
  google: "Google Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/** Maps upstream failures to friendly Portuguese messages, never leaking keys. */
function providerError(provider: ProviderId, status: number, detail: string) {
  const name = PROVIDER_LABEL[provider];
  const messages: Record<number, string> = {
    400: `Requisição inválida para ${name}. Verifique o modelo escolhido.`,
    401: `Chave de API do ${name} inválida ou ausente. Avise o administrador.`,
    403: `Acesso negado pelo ${name} para este modelo.`,
    404: `Modelo indisponível no ${name}. Escolha outro modelo.`,
    408: `${name} demorou demais para responder. Tente novamente.`,
    429: `Limite de requisições do ${name} atingido. Tente em instantes.`,
    402: `Créditos insuficientes na conta do ${name}.`,
    500: `${name} está instável no momento. Tente novamente.`,
    502: `${name} indisponível no momento.`,
    503: `${name} indisponível no momento.`,
  };
  const safe = detail.replace(/(sk-[\w-]+|gsk_[\w-]+|hf_[\w-]+|AIza[\w-]+)/g, "***");
  return jsonError(
    messages[status] ?? `Falha no ${name}: ${safe.slice(0, 200) || `erro ${status}`}`,
    status >= 400 && status <= 599 ? status : 500,
  );
}

function sseFromText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`,
        ),
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

function sseStream(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabase, user } = await requireUser(request);
        if (!user) return jsonError("Faça login para conversar.", 401);

        const body = (await request.json()) as Body;
        const model = findModel(body.model);
        const provider = model.provider;
        const targetModel = model.id === "auto" ? "google/gemini-3.7-flash" : model.id;

        const { error: spendError } = await supabase.rpc("spend_credits", {
          _amount: model.credits,
          _action: "chat",
          _provider: provider,
          _model: targetModel,
          _cost: model.cost,
        });
        if (spendError) {
          const insufficient = spendError.message.includes("INSUFFICIENT_CREDITS");
          return jsonError(
            insufficient
              ? "Energia esgotada! Aguarde a recarga automática ou resgate um código."
              : "Não foi possível validar seus créditos.",
            insufficient ? 402 : 500,
          );
        }

        // 1) Hub models via Lovable AI Gateway
        if (provider === "lovable") {
          const key = process.env["LOVABLE_API_KEY"];
          if (!key) return jsonError("Modelos inclusos indisponíveis no momento.", 500);
          const payload: Record<string, unknown> = {
            model: targetModel,
            messages: body.messages,
            stream: true,
          };
          if (targetModel.startsWith("openai/gpt-5.6")) payload["reasoning_effort"] = "none";
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            return providerError("lovable", upstream.status, detail);
          }
          return sseStream(upstream.body);
        }

        // 2) Server secret first, user-provided key as fallback
        const envName = ENV_KEY[provider];
        let apiKey = envName ? process.env[envName] : undefined;
        if (!apiKey) {
          const { data: keyRow } = await supabase
            .from("api_keys")
            .select("secret")
            .eq("provider", provider)
            .maybeSingle();
          apiKey = keyRow?.secret ?? undefined;
        }
        if (!apiKey)
          return jsonError(
            `Chave de API do ${PROVIDER_LABEL[provider]} não configurada. Cadastre a sua em Configurações.`,
            400,
          );

        if (provider === "anthropic") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: targetModel,
              max_tokens: 2048,
              messages: body.messages
                .filter((m) => m.role !== "system")
                .map((m) => ({
                  role: m.role,
                  content: typeof m.content === "string" ? m.content : String(m.content),
                })),
            }),
          });
          if (!res.ok) return providerError(provider, res.status, await res.text().catch(() => ""));
          const json = (await res.json()) as { content?: Array<{ text?: string }> };
          return sseFromText(json.content?.map((c) => c.text ?? "").join("") ?? "");
        }

        const endpoint = OPENAI_COMPATIBLE[provider]!;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (provider === "openrouter") {
          headers["HTTP-Referer"] = new URL(request.url).origin;
          headers["X-Title"] = "Hub de IA Universal";
        }

        let upstream: Response;
        try {
          upstream = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({ model: targetModel, messages: body.messages, stream: true }),
            signal: AbortSignal.timeout(120_000),
          });
        } catch {
          return providerError(provider, 503, "");
        }
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return providerError(provider, upstream.status, detail);
        }
        return sseStream(upstream.body);
      },
    },
  },
});
