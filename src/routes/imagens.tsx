import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hub/AppShell";
import { ImageStudio } from "@/components/hub/ImageStudio";

export const Route = createFileRoute("/imagens")({
  head: () => ({
    meta: [
      { title: "Estúdio de imagens — Hub de IA Universal" },
      {
        name: "description",
        content:
          "Gere imagens com modelos de IA inclusos no Hub, salve na galeria e baixe em alta qualidade.",
      },
      { property: "og:title", content: "Estúdio de imagens — Hub de IA Universal" },
      {
        property: "og:description",
        content: "Geração de imagens por IA com galeria pessoal e download imediato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImagesRoute,
});

function ImagesRoute() {
  return (
    <AppShell title="Estúdio de imagens">
      <ImageStudio />
    </AppShell>
  );
}
