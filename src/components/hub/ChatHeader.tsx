import { Eraser, Gauge, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HF_MODELS, POLICIES, type PolicyId } from "@/lib/hf";
import { useHub } from "@/lib/hub-store";
import { SettingsDialog } from "./SettingsDialog";

export function ChatHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { model, setModel, policy, setPolicy, clearActive } = useHub();

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background/80 px-3 py-3 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir histórico"
      >
        <Menu className="size-5" />
      </Button>

      <Select value={model} onValueChange={setModel}>
        <SelectTrigger className="w-[180px] sm:w-[240px]">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          {HF_MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex flex-col items-start">
                <span>{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.hint}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={policy} onValueChange={(v) => setPolicy(v as PolicyId)}>
        <SelectTrigger className="w-[150px]">
          <Gauge className="size-4 text-primary" />
          <SelectValue placeholder="Política" />
        </SelectTrigger>
        <SelectContent>
          {POLICIES.map((p) => (
            <SelectItem key={p.id} value={p.id} title={p.hint}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={clearActive} aria-label="Limpar conversa">
          <Eraser className="size-4" />
        </Button>
        <SettingsDialog />
      </div>
    </header>
  );
}
