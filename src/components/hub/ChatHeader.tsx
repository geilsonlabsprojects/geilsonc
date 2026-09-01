import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsBar } from "./CreditsBar";
import { SettingsDialog } from "./SettingsDialog";

export function ChatHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
        <span className="hidden md:block" />
        <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight sm:text-base">
          Hub de IA Universal
        </h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <CreditsBar />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}
