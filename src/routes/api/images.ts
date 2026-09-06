import { createFileRoute } from "@tanstack/react-router";
import { IMAGE_MODELS } from "@/lib/ai";
import { jsonError, requireUser } from "@/lib/api-auth.server";
import { consumeGuest, isValidDeviceId, refundGuest } from "@/lib/guest-limits.server";

interface Body {
  prompt: string;
  model: string;
}

export const Route = createFileRoute("/api/images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabase, user } = await requireUser(request);
        const deviceId = request.headers.get("x-guest-id");
        const guestMode = !user;
        if (guestMode && !isValidDeviceId(deviceId))
          return jsonError("Faça login para gerar imagens.", 401);

        const body = (await request.json()) as Body;
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return jsonError("Descreva a imagem que você quer gerar.", 400);
        const model = IMAGE_MODELS.find((m) => m.id === body.model) ?? IMAGE_MODELS[0];

        if (guestMode) {
          const check = await consumeGuest(deviceId!, "image", model.credits);
          if (!check.ok) return jsonError(check.message, check.status);
        } else {
          const { error: spendError } = await supabase.rpc("spend_credits", {
            _amount: model.credits,
            _action: "image",
            _provider: "lovable",
            _model: model.id,
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
        }

        const refund = async () => {
          if (guestMode) {
            await refundGuest(deviceId!, "image", model.credits);
            return;
          }
          await supabase.rpc("refund_credits", {
            _amount: model.credits,
            _action: "image_refund",
            _provider: "lovable",
            _model: model.id,
          });
        };

        /** Result of one attempt: a data-URI image, or a retryable failure. */
        type Attempt =
          | { ok: true; url: string; usedModel: string }
          | { ok: false; status: number; detail: string; noKey?: boolean };

        const RETRYABLE_STATUS = new Set([401, 402, 403, 404, 429, 500, 502, 503, 504]);

        // 1) The model the user picked, via the Lovable AI Gateway (Google Nano Banana family).
        async function attemptLovable(): Promise<Attempt> {
          const key = process.env["LOVABLE_API_KEY"];
          if (!key) return { ok: false, status: 500, detail: "", noKey: true };
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model.id,
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          }).catch(() => null);
          if (!upstream || !upstream.ok) {
            const detail = upstream ? await upstream.text().catch(() => "") : "";
            return { ok: false, status: upstream?.status ?? 503, detail };
          }
          const json = (await upstream.json()) as {
            choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
          };
          const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!url) return { ok: false, status: 502, detail: "sem imagem na resposta" };
          return { ok: true, url, usedModel: model.id };
        }

        // 2) Fallback: Google's own Gemini image endpoint, using the same GEMINI_API_KEY
        // already configured for text chat — independent of the Lovable gateway.
        async function attemptGemini(): Promise<Attempt> {
          const key = process.env["GEMINI_API_KEY"];
          if (!key) return { ok: false, status: 500, detail: "", noKey: true };
          const geminiModel = "gemini-2.5-flash-image";
          const upstream = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/openai/images/generations",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: geminiModel,
                prompt,
                response_format: "b64_json",
                n: 1,
              }),
            },
          ).catch(() => null);
          if (!upstream || !upstream.ok) {
            const detail = upstream ? await upstream.text().catch(() => "") : "";
            return { ok: false, status: upstream?.status ?? 503, detail };
          }
          const json = (await upstream.json()) as { data?: Array<{ b64_json?: string }> };
          const b64 = json.data?.[0]?.b64_json;
          if (!b64) return { ok: false, status: 502, detail: "sem imagem na resposta" };
          return { ok: true, url: `data:image/png;base64,${b64}`, usedModel: geminiModel };
        }

        // 3) Last resort: a real open-weights image model on Hugging Face, using the same
        // HUGGING_FACE_API_KEY already configured for text chat.
        async function attemptHuggingFace(): Promise<Attempt> {
          const key = process.env["HUGGING_FACE_API_KEY"];
          if (!key) return { ok: false, status: 500, detail: "", noKey: true };
          const hfModel = "black-forest-labs/FLUX.1-schnell";
          const upstream = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt }),
          }).catch(() => null);
          if (!upstream || !upstream.ok) {
            const detail = upstream ? await upstream.text().catch(() => "") : "";
            return { ok: false, status: upstream?.status ?? 503, detail };
          }
          const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
          const buf = await upstream.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          return { ok: true, url: `data:${contentType};base64,${b64}`, usedModel: hfModel };
        }

        let result: Attempt | null = null;
        for (const attempt of [attemptLovable, attemptGemini, attemptHuggingFace]) {
          const r = await attempt();
          if (r.ok) {
            result = r;
            break;
          }
          if (!RETRYABLE_STATUS.has(r.status) && !r.noKey) {
            await refund();
            if (r.status === 429)
              return jsonError("Muitas requisições agora. Tente em instantes.", 429);
            if (r.status === 402) return jsonError("Os créditos de IA acabaram por hoje.", 402);
            return jsonError(
              "Não foi possível gerar a imagem no momento. Tente novamente.",
              r.status,
            );
          }
        }

        if (!result) {
          await refund();
          return jsonError(
            "Não foi possível gerar a imagem em nenhum provedor disponível no momento. Tente novamente.",
            502,
          );
        }

        const { url, usedModel } = result;

        // Guests keep their gallery locally; nothing is persisted in the backend.
        const { data: row } = guestMode
          ? { data: null }
          : await supabase
              .from("generated_images")
              .insert({ user_id: user!.id, prompt, model: usedModel, image_url: url })
              .select()
              .maybeSingle();

        return new Response(
          JSON.stringify({
            image: row ?? {
              id: crypto.randomUUID(),
              prompt,
              model: usedModel,
              image_url: url,
              created_at: new Date().toISOString(),
            },
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
