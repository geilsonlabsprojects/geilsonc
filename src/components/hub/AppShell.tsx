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
  const { loading, user, isGuest } = useHub();
  const [menuOpen, setMenuOpen] = useState(false);
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Authentication is optional: guests use the app with local history and a
  // device-metered energy quota. The sign-in screen is only the fallback.
  if (!user && !isGuest) return <AuthGate />;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border lg:flex xl:w-[280px]">
        <ChatSidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[300px] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <ChatSidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <PwaInstallBanner />

        <main className="flex min-w-0 flex-1 flex-col min-h-0">
          <header className="shrink-0 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 py-2 sm:px-4 md:px-6">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>
              <h1 className="shrink-0 text-sm font-medium tracking-tight">{title}</h1>
              {toolbar ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                  {toolbar}
                </div>
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                <CreditsBar />
                <SettingsDialog />
              </div>
            </div>
          </header>

          {scroll ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
