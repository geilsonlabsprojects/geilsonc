import { createFileRoute } from "@tanstack/react-router";
import { findModel, type ModelInfo, type ProviderId } from "@/lib/ai";
import { jsonError, requireUser } from "@/lib/api-auth.server";
import { consumeGuest, isValidDeviceId, refundGuest } from "@/lib/guest-limits.server";

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
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

/** Server-side secret used by each provider (never exposed to the client). */
const ENV_KEY: Partial<Record<ProviderId, string>> = {
  google: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  hf: "HUGGING_FACE_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

const PROVIDER_LABEL: Record<ProviderId, string> = {
  lovable: "Hub",
  hf: "Hugging Face",
  google: "Google Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  mistral: "Mistral",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/** Status codes that mean "this provider/model is having a bad moment" — worth trying the next candidate instead of giving up. */
const RETRYABLE_STATUS = new Set([401, 402, 403, 404, 429, 500, 502, 503, 504]);

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
        const deviceId = request.headers.get("x-guest-id");
        const guestMode = !user;
        if (guestMode && !isValidDeviceId(deviceId))
          return jsonError("Faça login para conversar.", 401);

        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages) || body.messages.length === 0)
          return jsonError("Envie ao menos uma mensagem para iniciar o chat.", 400);
        const model = findModel(body.model);
        const provider = model.provider;
        const targetModel = model.id === "auto" ? "google/gemini-3.7-flash" : model.id;
        const { data: settings } = guestMode
          ? { data: null }
          : await supabase.from("app_settings").select("system_prompt").eq("id", 1).maybeSingle();
        const systemPrompt =
          settings?.system_prompt ?? "Você é o assistente do Hub de IA Universal.";
        body.messages = [
          { role: "system", content: systemPrompt },
          ...body.messages.filter((message) => message.role !== "system"),
        ];

        // Account-free mode: no backend account, quota metered per device.
        if (guestMode) {
          const check = await consumeGuest(deviceId!, "chat", model.credits);
          if (!check.ok) return jsonError(check.message, check.status);
        } else {
          const { error: spendError } = await supabase.rpc("spend_credits", {
            _amount: model.credits,
            _action: "chat",
            _provider: provider,
            _model: targetModel,
            _cost: model.cost,
          });
          if (spendError) {
            const insufficient = spendError.message.includes("INSUFFICIENT_CREDITS");
            const { data: profile } = insufficient
              ? await supabase
                  .from("profiles")
                  .select("last_renewal_at,renewal_interval_seconds")
                  .eq("user_id", user!.id)
                  .maybeSingle()
              : { data: null };
            const nextRenewal = profile
              ? new Date(profile.last_renewal_at).getTime() +
                profile.renewal_interval_seconds * 1000
              : 0;
            const minutes = Math.max(1, Math.ceil((nextRenewal - Date.now()) / 60_000));
            const rechargeIn = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
            return jsonError(
              insufficient
                ? `Energia esgotada! Sua recarga automática ocorre em ${rechargeIn}. Resgate um código para ganhar mais agora.`
                : "Não foi possível validar seus créditos.",
              insufficient ? 402 : 500,
            );
          }
        }

        const refund = async () => {
          if (guestMode) {
            await refundGuest(deviceId!, "chat", model.credits);
            return;
          }
          await supabase.rpc("refund_credits", {
            _amount: model.credits,
            _action: "chat_refund",
            _provider: provider,
            _model: targetModel,
          });
        };

        /** Result of one attempt: either a ready-to-stream response, or a retryable failure. */
        type Attempt =
          | { ok: true; response: Response }
          | { ok: false; status: number; detail: string; noKey?: boolean };

        async function attemptModel(candidate: ModelInfo): Promise<Attempt> {
          const candidateProvider = candidate.provider;
          const candidateTarget =
            candidate.id === "auto" ? "google/gemini-3.7-flash" : candidate.id;

          // Hub models via Lovable AI Gateway
          if (candidateProvider === "lovable") {
            const key = process.env["LOVABLE_API_KEY"];
            if (!key) return { ok: false, status: 500, detail: "", noKey: true };
            const payload: Record<string, unknown> = {
              model: candidateTarget,
              messages: body.messages,
              stream: true,
            };
            if (candidateTarget.startsWith("openai/gpt-5.6")) payload["reasoning_effort"] = "none";
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => null);
            if (!upstream || !upstream.ok || !upstream.body) {
              const detail = upstream ? await upstream.text().catch(() => "") : "";
              return { ok: false, status: upstream?.status ?? 503, detail };
            }
            return { ok: true, response: sseStream(upstream.body) };
          }

          // Server secret first, user-provided key as fallback
          const envName = ENV_KEY[candidateProvider];
          let apiKey = envName ? process.env[envName] : undefined;
          if (!apiKey && user) {
            const { data: keyRow } = await supabase
              .from("api_keys")
              .select("secret")
              .eq("user_id", user.id)
              .eq("provider", candidateProvider)
              .maybeSingle();
            apiKey = keyRow?.secret ?? undefined;
          }
          if (!apiKey) return { ok: false, status: 400, detail: "", noKey: true };

          if (candidateProvider === "anthropic") {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: candidateTarget,
                max_tokens: 2048,
                messages: body.messages
                  .filter((m) => m.role !== "system")
                  .map((m) => ({
                    role: m.role,
                    content: typeof m.content === "string" ? m.content : String(m.content),
                  })),
              }),
            }).catch(() => null);
            if (!res || !res.ok) {
              const detail = res ? await res.text().catch(() => "") : "";
              return { ok: false, status: res?.status ?? 503, detail };
            }
            const json = (await res.json()) as { content?: Array<{ text?: string }> };
            return {
              ok: true,
              response: sseFromText(json.content?.map((c) => c.text ?? "").join("") ?? ""),
            };
          }

          const endpoint = OPENAI_COMPATIBLE[candidateProvider]!;
          const headers: Record<string, string> = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };
          if (candidateProvider === "openrouter") {
            headers["HTTP-Referer"] = new URL(request.url).origin;
            headers["X-Title"] = "Hub de IA Universal";
          }

          let upstream: Response;
          try {
            upstream = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify({
                model: candidateTarget,
                messages: body.messages,
                stream: true,
              }),
              signal: AbortSignal.timeout(120_000),
            });
          } catch {
            return { ok: false, status: 503, detail: "" };
          }
          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            return { ok: false, status: upstream.status, detail };
          }
          return { ok: true, response: sseStream(upstream.body) };
        }

        // Try the chosen model first, then its declared fallbacks (equivalent
        // models on other providers) until one works. Only refund the user's
        // credits — and only report an error — once every candidate failed.
        const candidates: ModelInfo[] = [model, ...(model.fallbacks ?? []).map(findModel)];
        let lastFailure: { provider: ProviderId; status: number; detail: string } | null = null;

        for (const candidate of candidates) {
          const result = await attemptModel(candidate);
          if (result.ok) return result.response;
          if (!RETRYABLE_STATUS.has(result.status) && !result.noKey) {
            // Non-retryable (e.g. bad request from our own payload): stop here, don't waste other providers on the same bug.
            await refund();
            return providerError(candidate.provider, result.status, result.detail);
          }
          if (!result.noKey)
            lastFailure = {
              provider: candidate.provider,
              status: result.status,
              detail: result.detail,
            };
        }

        await refund();
        if (lastFailure)
          return providerError(lastFailure.provider, lastFailure.status, lastFailure.detail);
        return jsonError(
          "Nenhum provedor de IA está configurado no momento. Avise o administrador.",
          500,
        );
      },
    },
  },
});
