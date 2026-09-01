import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Menu } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useHub } from "@/lib/hub-store";
import { ChatSidebar } from "./ChatSidebar";
import { CreditsBar } from "./CreditsBar";
import { SettingsDialog } from "./SettingsDialog";
import { PwaInstallBanner } from "./PwaInstallBanner";

export function AppShell({
  title,
  toolbar,
  children,
  scroll = true,
}: {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
  /** when false the page manages its own scrolling (chat) */
  scroll?: boolean;
}) {
  const { loading, user } = useHub();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">
        <ChatSidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <ChatSidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <PwaInstallBanner />

        <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden lg:block" />
            <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight sm:text-base">
              {title}
            </h1>
            <div className="flex shrink-0 items-center gap-1.5">
              <CreditsBar />
              <SettingsDialog />
            </div>
          </div>
          {toolbar ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2 md:px-6">
              {toolbar}
            </div>
          ) : null}
        </header>

        {scroll ? (
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        ) : (
          children
        )}
        </main>
      </div>
    </div>
  );
}
