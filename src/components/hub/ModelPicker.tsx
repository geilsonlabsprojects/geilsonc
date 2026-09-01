import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS, modelKey, modelsForProvider, type ProviderId } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";

export function ModelPicker() {
  const { provider, setProvider, model, setModel } = useHub();
  const models = modelsForProvider(provider);

  return (
    <>
      <Select value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
        <SelectTrigger
          className="h-9 w-[calc(50%-0.25rem)] sm:w-[150px]"
          aria-label="Provedor de IA"
        >
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
        <SelectTrigger className="h-9 w-[calc(50%-0.25rem)] sm:w-[260px]" aria-label="Modelo">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent className="max-w-[92vw]">
          {models.map((m) => (
            <SelectItem key={modelKey(m)} value={modelKey(m)}>
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate">{m.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {m.hint} · {m.credits} energia
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
