import { createFileRoute } from "@tanstack/react-router";
import { findModel, type ProviderId } from "@/lib/ai";
import { jsonError, requireUser } from "@/lib/api-auth.server";

interface Body {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
}

const OPENAI_COMPATIBLE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  hf: "https://router.huggingface.co/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
};

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

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabase, user } = await requireUser(request);
        if (!user) return jsonError("Faça login para conversar.", 401);

        const body = (await request.json()) as Body;
        const model = findModel(body.model);
        const targetModel = model.id === "auto" ? "google/gemini-3.7-flash" : model.id;

        const { error: spendError } = await supabase.rpc("spend_credits", {
          _amount: model.credits,
          _action: "chat",
          _provider: model.provider,
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

        if (model.provider === "lovable") {
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
            if (upstream.status === 429)
              return jsonError("Muitas requisições agora. Tente em instantes.", 429);
            if (upstream.status === 402)
              return jsonError("Os créditos de IA do hub acabaram por hoje.", 402);
            return jsonError(detail.slice(0, 300) || "Falha no provedor.", upstream.status);
          }
          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }

        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("secret")
          .eq("provider", model.provider)
          .maybeSingle();
        if (!keyRow?.secret)
          return jsonError(
            `Cadastre sua chave ${model.provider.toUpperCase()} em Configurações para usar este modelo.`,
            400,
          );

        if (model.provider === "anthropic") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": keyRow.secret,
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
          if (!res.ok) return jsonError((await res.text()).slice(0, 300), res.status);
          const json = (await res.json()) as { content?: Array<{ text?: string }> };
          return sseFromText(json.content?.map((c) => c.text ?? "").join("") ?? "");
        }

        const endpoint = OPENAI_COMPATIBLE[model.provider]!;
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyRow.secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: targetModel, messages: body.messages, stream: true }),
        });
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return jsonError(detail.slice(0, 300) || "Falha no provedor.", upstream.status);
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
