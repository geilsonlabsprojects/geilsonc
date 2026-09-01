import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hub/AppShell";
import { ChatPanel } from "@/components/hub/ChatPanel";
import { ModelPicker } from "@/components/hub/ModelPicker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chat multimodal — Hub de IA Universal" },
      {
        name: "description",
        content:
          "Converse com modelos do Hub, Hugging Face, Gemini, Groq e OpenRouter com streaming em tempo real, anexos e créditos de energia renováveis.",
      },
      { property: "og:title", content: "Chat multimodal — Hub de IA Universal" },
      {
        property: "og:description",
        content:
          "Chat com múltiplos provedores de IA, streaming de tokens, anexos e energia que renova automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <AppShell title="Chat" scroll={false} toolbar={<ModelPicker />}>
      <ChatPanel />
    </AppShell>
  );
}
