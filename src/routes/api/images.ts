import { createFileRoute } from "@tanstack/react-router";
import { IMAGE_MODELS } from "@/lib/ai";
import { jsonError, requireUser } from "@/lib/api-auth.server";

interface Body {
  prompt: string;
  model: string;
}

export const Route = createFileRoute("/api/images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabase, user } = await requireUser(request);
        if (!user) return jsonError("Faça login para gerar imagens.", 401);

        const body = (await request.json()) as Body;
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return jsonError("Descreva a imagem que você quer gerar.", 400);
        const model = IMAGE_MODELS.find((m) => m.id === body.model) ?? IMAGE_MODELS[0];
        const isGuest = Boolean(user.is_anonymous);
        if (isGuest && model !== IMAGE_MODELS[0])
          return jsonError(
            "No acesso sem conta, use o modelo de imagem básico. Crie uma conta gratuita para liberar modelos avançados.",
            403,
          );
        if (isGuest) {
          const { count, error: countError } = await supabase
            .from("generated_images")
            .select("id", { count: "exact", head: true });
          if (countError) return jsonError("Não foi possível verificar o limite do Estúdio.", 500);
          if ((count ?? 0) >= 5)
            return jsonError(
              "O limite de 5 imagens do acesso sem conta foi atingido. Crie uma conta gratuita para continuar.",
              403,
            );
        }

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

        const refund = async () => {
          await supabase.rpc("refund_credits", {
            _amount: model.credits,
            _action: "image_refund",
            _provider: "lovable",
            _model: model.id,
          });
        };

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          await refund();
          return jsonError("Geração de imagens indisponível no momento.", 500);
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model.id,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!upstream.ok) {
          await refund();
          const detail = await upstream.text().catch(() => "");
          if (upstream.status === 429)
            return jsonError("Muitas requisições agora. Tente em instantes.", 429);
          if (upstream.status === 402)
            return jsonError("Os créditos de IA do hub acabaram por hoje.", 402);
          return jsonError(detail.slice(0, 300) || "Falha ao gerar a imagem.", upstream.status);
        }

        const json = (await upstream.json()) as {
          choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
        };
        const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!url) {
          await refund();
          return jsonError("O modelo não retornou nenhuma imagem.", 502);
        }

        const { data: row } = await supabase
          .from("generated_images")
          .insert({ user_id: user.id, prompt, model: model.id, image_url: url })
          .select()
          .maybeSingle();

        return new Response(JSON.stringify({ image: row ?? { prompt, image_url: url } }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
