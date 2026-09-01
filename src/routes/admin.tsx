import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hub/AppShell";
import { AdminDashboard } from "@/components/hub/AdminDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel admin — Hub de IA Universal" },
      {
        name: "description",
        content:
          "Gerencie códigos de acesso, créditos de energia, usuários e regras globais do Hub de IA Universal.",
      },
      { property: "og:title", content: "Painel admin — Hub de IA Universal" },
      {
        property: "og:description",
        content: "Administração de códigos, créditos e usuários da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AppShell title="Painel admin">
      <AdminDashboard />
    </AppShell>
  );
}
