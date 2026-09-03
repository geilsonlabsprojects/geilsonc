import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export const PROMPT_TEMPLATES = [
  {
    id: "code",
    name: "Escrever Código",
    prompt: "Escreva um código {language} para {task}. Use boas práticas e adicione comentários.",
  },
  {
    id: "explain",
    name: "Explicar Conceito",
    prompt: "Explique {concept} de forma simples e com exemplos práticos.",
  },
  {
    id: "creative",
    name: "Escrita Criativa",
    prompt: "Escreva uma {type} sobre {topic}. Seja criativo e detalhado.",
  },
  {
    id: "summary",
    name: "Resumir Texto",
    prompt: "Resuma o seguinte texto em 3 pontos principais: {text}",
  },
];

export function PromptTemplate({ onSelect }: { onSelect: (prompt: string) => void }) {
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const saveCustom = () => {
    if (!customPrompt.trim()) return;
    try {
      const custom = JSON.parse(localStorage.getItem("custom_prompts") || "[]") as unknown[];
      custom.push({ id: Date.now(), name: customName || "Template", prompt: customPrompt });
      localStorage.setItem("custom_prompts", JSON.stringify(custom));
      toast.success("Template salvo!");
      setCustomPrompt("");
      setCustomName("");
    } catch {
      toast.error("Erro ao salvar template");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PROMPT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.prompt)}
          className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {t.name}
        </button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Criar novo template"
          >
            <Plus className="size-3" /> Novo template
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,20rem)] space-y-2">
          <Input
            placeholder="Nome"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="h-8 text-xs"
          />
          <Textarea
            placeholder="Escreva o template. Use {variavel} para campos."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-20 text-xs"
          />
          <Button size="sm" className="h-8 w-full gap-1 text-xs" onClick={saveCustom}>
            <Save className="size-3" /> Salvar template
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
