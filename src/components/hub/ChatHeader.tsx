import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS, modelKey, modelsForProvider, type ProviderId } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";
import { CreditsBar } from "./CreditsBar";
import { SettingsDialog } from "./SettingsDialog";

export function ChatHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { provider, setProvider, model, setModel } = useHub();
  const models = modelsForProvider(provider);

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background/80 px-3 py-3 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </Button>

      <Select value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
        <SelectTrigger className="w-[150px]" aria-label="Provedor de IA">
          <SelectValue placeholder="Provedor" />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={model} onValueChange={setModel}>
        <SelectTrigger className="w-[190px] sm:w-[240px]" aria-label="Modelo">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={modelKey(m)} value={modelKey(m)}>
              <span className="flex flex-col items-start">
                <span>{m.label}</span>
                <span className="text-xs text-muted-foreground">
                  {m.hint} · {m.credits} energia
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <CreditsBar />
        <SettingsDialog />
      </div>
    </header>
  );
}
