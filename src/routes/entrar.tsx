import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthGate } from "@/components/hub/AuthGate";
import { useHub } from "@/lib/hub-store";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Hub de IA Universal" },
      {
        name: "description",
        content:
          "Acesse o Hub de IA Universal com e-mail ou Google e use modelos de IA com créditos de energia gratuitos.",
      },
      { property: "og:title", content: "Entrar — Hub de IA Universal" },
      {
        property: "og:description",
        content: "Login gratuito para usar chat multimodal e geração de imagens por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const { loading, user } = useHub();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthGate />;
}
