import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/hub/ChatWindow";
import { HubProvider } from "@/lib/hub-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hub de IA Universal — Chat com modelos Hugging Face" },
      {
        name: "description",
        content:
          "Converse com modelos open source (GPT-OSS, DeepSeek R1, Mistral, Llama) via Inference Providers da Hugging Face, com streaming em tempo real e histórico local.",
      },
      { property: "og:title", content: "Hub de IA Universal" },
      {
        property: "og:description",
        content:
          "Chatbot avançado com múltiplos modelos open source da Hugging Face, streaming de tokens e histórico salvo no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <HubProvider>
      <ChatWindow />
    </HubProvider>
  );
}
