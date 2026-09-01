import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function PromptTemplate({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  const [showSave, setShowSave] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const saveCustom = () => {
    if (!customPrompt.trim()) return;
    try {
      const custom = JSON.parse(localStorage.getItem("custom_prompts") || "[]") as any[];
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
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPT_TEMPLATES.map((t) => (
          <Button
            key={t.id}
            variant="outline"
            size="sm"
            className="text-left text-xs"
            onClick={() => onSelect(t.prompt)}
          >
            {t.name}
          </Button>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="w-full gap-1 text-xs"
        onClick={() => setShowSave(!showSave)}
      >
        <Plus className="size-3" /> Novo Template
      </Button>
      {showSave && (
        <div className="space-y-2 rounded-lg border p-2">
          <Input
            placeholder="Nome"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            size={30}
            className="text-xs"
          />
          <Textarea
            placeholder="Seu template (use {variável} para placeholders)"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button size="sm" onClick={saveCustom} className="w-full gap-1 text-xs">
            <Save className="size-3" /> Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
