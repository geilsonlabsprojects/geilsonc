import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorRecovery({
  error,
  onRetry,
  onDismiss,
}: {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm animate-message-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dica: tente outra combinação de modelo/provider ou aguarde um momento.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="gap-1 text-xs"
              >
                <RotateCw className="size-3" /> Tentar novamente
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs"
              >
                Descartar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
