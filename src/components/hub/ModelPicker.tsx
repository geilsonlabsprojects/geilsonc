import { ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PROVIDERS, findModel, modelKey, modelsForProvider, type ProviderId } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";

export function ModelPicker() {
  const { provider, setProvider, model, setModel } = useHub();
  const models = modelsForProvider(provider);
  const current = findModel(model);
  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? "Hub";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 max-w-[70vw] gap-1.5 rounded-full border border-border/70 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          aria-label="Escolher provedor e modelo"
        >
          <span className="truncate">
            {providerLabel} · {current.label}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,22rem)] p-0">
        <div className="border-b border-border p-2">
          <p className="px-1 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Provedor
          </p>
          <div className="flex flex-wrap gap-1">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id as ProviderId)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  p.id === provider
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {models.map((m) => {
            const key = modelKey(m);
            return (
              <button
                key={key}
                onClick={() => setModel(key)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  key === modelKey(current) ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span className="flex w-full items-center gap-2 text-sm">
                  <span className="min-w-0 truncate">{m.label}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Zap className="size-3" />
                    {m.credits}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {m.hint}
                  {m.vision ? " · multimodal" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
