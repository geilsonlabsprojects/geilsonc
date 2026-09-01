import { useState } from "react";
import { AlertTriangle, Download, Filter, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMAGE_MODELS } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";
import { ErrorReportButton } from "./ErrorReportButton";
import { filterImages } from "@/lib/gallery-utils";

const IDEAS = [
  "Retrato cinematográfico de uma astronauta ao amanhecer, luz suave",
  "Cidade cyberpunk sob chuva neon, reflexos no asfalto",
  "Ilustração isométrica de um escritório futurista minimalista",
];

export function ImageStudio() {
  const {
    images,
    imageLoading,
    imageError,
    imageModel,
    setImageModel,
    createImage,
    deleteImage,
    profile,
  } = useHub();
  const [prompt, setPrompt] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [modelFilter, setModelFilter] = useState<string | undefined>();
  const latest = images[0];

  const filteredImages = filterImages(images, {
    search: searchFilter,
    model: modelFilter,
  });

  const submit = () => {
    if (!prompt.trim() || imageLoading) return;
    void createImage(prompt);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 md:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-studio/15 text-studio">
          <Wand2 className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Galeria de Imagens</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">Gere imagens com modelos IA.</p>
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
            <SelectTrigger className="w-full text-xs sm:w-[200px]">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((m, index) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={Boolean(profile?.is_guest && index > 0)}
                  className="text-xs"
                >
                  {m.label} - {m.hint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full gap-2 bg-studio text-studio-foreground hover:bg-studio/90 sm:ml-auto sm:w-auto sm:text-xs"
            onClick={submit}
            disabled={!prompt.trim() || imageLoading}
            size="sm"
          >
            {imageLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {imageLoading ? "Gerando..." : "Gerar"}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 sm:gap-2">
        {IDEAS.map((i) => (
          <button
            key={i}
            onClick={() => setPrompt(i)}
            className="rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-studio/60 hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {i.slice(0, 20)}...
          </button>
        ))}
      </div>

      {profile?.is_guest ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Acesso sem conta: até 5 imagens com o modelo básico. Crie uma conta gratuita para salvar
          mais e usar o modelo avançado.
        </p>
      ) : null}

      {imageError ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm animate-message-in">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p>{imageError}</p>
            <ErrorReportButton error={imageError} area="images" />
          </div>
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
            className="mx-auto block max-h-[60vh] w-full object-contain"
            loading="lazy"
          />
          <figcaption className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
            <span className="min-w-0 flex-1 text-muted-foreground line-clamp-2 sm:truncate">
              {latest.prompt}
            </span>
            <a
              href={latest.image_url}
              download={`hub-ia-${latest.id}.png`}
              className="shrink-0"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="sm" className="w-full gap-2 sm:w-auto">
                <Download className="size-4" /> Baixar
              </Button>
            </a>
          </figcaption>
        </figure>
      ) : null}

      <h3 className="mt-8 mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Histórico ({filteredImages.length} de {images.length})
      </h3>
      
      {images.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Buscar por prompt..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs sm:flex-1"
          />
          <Select value={modelFilter || ""} onValueChange={(v) => setModelFilter(v || undefined)}>
            <SelectTrigger className="w-full text-xs sm:w-[180px]">
              <SelectValue placeholder="Todos os modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os modelos</SelectItem>
              {[...new Set(images.map((i) => i.model))].map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {filteredImages.length === 0 ? (
        <p className="text-xs text-muted-foreground sm:text-sm">
          {searchFilter || modelFilter ? "Nenhuma imagem encontrada com esses filtros." : "Nenhuma imagem ainda — gere a primeira acima."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 gap-3 lg:grid-cols-4">
          {filteredImages.map((img) => (
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
                <a
                  href={img.image_url}
                  download={`hub-ia-${img.id}.png`}
                  aria-label="Baixar imagem"
                >
                  <Download className="size-4 text-muted-foreground hover:text-foreground" />
                </a>
                <button onClick={() => void deleteImage(img.id)} aria-label="Excluir imagem">
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
