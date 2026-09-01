import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallBanner() {
  const { installPrompt, isInstalled, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || !installPrompt || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    await install();
    setDismissed(true);
  };

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-500/20 px-3 py-2 sm:px-4 sm:py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
        <Download className="size-4 shrink-0" />
        <span>Instale como app para melhor experiência</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" onClick={handleInstall} className="text-xs">
          Instalar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="inline-flex items-center justify-center rounded p-1 hover:bg-background/50 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
