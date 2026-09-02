import { useState, type ReactNode } from "react";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useHub } from "@/lib/hub-store";
import { ChatSidebar } from "./ChatSidebar";
import { CreditsBar } from "./CreditsBar";
import { SettingsDialog } from "./SettingsDialog";
import { PwaInstallBanner } from "./PwaInstallBanner";
import { AuthGate } from "./AuthGate";

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
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Authentication is intentionally optional. If anonymous sign-in is disabled
  // on an environment, the regular sign-in screen remains the recovery path.
  if (!user) return <AuthGate />;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[280px] shrink-0 border-r border-sidebar-border lg:flex xl:w-[320px]">
        <ChatSidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <ChatSidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <PwaInstallBanner />

        <main className="flex min-w-0 flex-1 flex-col min-h-0">
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
            <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:px-4 md:px-6">
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
              <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight sm:text-base md:text-lg">
                {title}
              </h1>
              <div className="flex shrink-0 items-center gap-1.5">
                <CreditsBar />
                <SettingsDialog />
              </div>
            </div>
            {toolbar ? (
              <div className="mx-auto w-full max-w-[1600px] border-t border-border/60 px-3 py-2 sm:px-4 md:px-6">
                <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
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
