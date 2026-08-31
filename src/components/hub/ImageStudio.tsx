import { useState } from "react";
import { AlertTriangle, Download, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMAGE_MODELS } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";

const IDEAS = [
  "Retrato cinematográfico de uma astronauta ao amanhecer, luz suave",
  "Cidade cyberpunk sob chuva neon, reflexos no asfalto",
  "Ilustração isométrica de um escritório futurista minimalista",
];

export function ImageStudio() {
  const { images, imageLoading, imageError, imageModel, setImageModel, createImage, deleteImage } =
    useHub();
  const [prompt, setPrompt] = useState("");
  const latest = images[0];

  const submit = () => {
    if (!prompt.trim() || imageLoading) return;
    void createImage(prompt);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 md:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-studio/15 text-studio">
          <Wand2 className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Galeria de Imagens</h2>
          <p className="text-sm text-muted-foreground">
            Gere imagens pelos modelos inclusos do Hub.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-lg">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a imagem que você quer gerar..."
          className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={imageModel} onValueChange={setImageModel}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex flex-col items-start">
                    <span>{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="ml-auto gap-2 bg-studio text-studio-foreground hover:bg-studio/90"
            onClick={submit}
            disabled={!prompt.trim() || imageLoading}
          >
            {imageLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {imageLoading ? "Gerando..." : "Gerar imagem"}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {IDEAS.map((i) => (
          <button
            key={i}
            onClick={() => setPrompt(i)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-studio/60 hover:text-foreground"
          >
            {i}
          </button>
        ))}
      </div>

      {imageError ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm animate-message-in">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{imageError}</p>
        </div>
      ) : null}

      {imageLoading ? (
        <div className="mt-6 flex aspect-square w-full max-w-md animate-pulse items-center justify-center rounded-2xl border border-studio/40 bg-studio/10 text-sm text-muted-foreground">
          Gerando sua imagem...
        </div>
      ) : latest ? (
        <figure className="mt-6 animate-message-in overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={latest.image_url}
            alt={latest.prompt}
            className="w-full object-contain"
            loading="lazy"
          />
          <figcaption className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{latest.prompt}</span>
            <a href={latest.image_url} download={`hub-ia-${latest.id}.png`}>
              <Button variant="secondary" size="sm" className="gap-2">
                <Download className="size-4" /> Baixar
              </Button>
            </a>
          </figcaption>
        </figure>
      ) : null}

      <h3 className="mt-8 mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Histórico ({images.length})
      </h3>
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma imagem ainda — gere a primeira acima. As imagens ficam salvas na sua conta.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li
              key={img.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <img
                src={img.image_url}
                alt={img.prompt}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-background/85 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {img.prompt}
                </span>
                <a href={img.image_url} download={`hub-ia-${img.id}.png`} aria-label="Baixar imagem">
                  <Download className="size-4 text-muted-foreground hover:text-foreground" />
                </a>
                <button onClick={() => deleteImage(img.id)} aria-label="Excluir imagem">
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
