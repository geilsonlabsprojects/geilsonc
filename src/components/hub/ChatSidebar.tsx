import {
  Image as ImageIcon,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHub } from "@/lib/hub-store";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { chats, activeChatId, selectChat, newChat, deleteChat, isAdmin, profile, signOut } =
    useHub();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const go = (to: "/" | "/imagens" | "/admin") => {
    void navigate({ to });
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border/80 px-3 py-3 sm:px-4 sm:py-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-opacity hover:opacity-80"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm shadow-primary/10">
            <Sparkles className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight">Hub de IA Universal</span>
        </Link>
      </div>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <Button
          className="h-11 w-full justify-start gap-2 text-sm shadow-sm"
          onClick={() => {
            newChat();
            go("/");
          }}
        >
          <MessageSquarePlus className="size-4" />
          Nova conversa
        </Button>
        <Button
          variant={pathname === "/" ? "secondary" : "ghost"}
          className="h-11 w-full justify-start gap-2 text-sm"
          onClick={() => go("/")}
        >
          <MessageSquare className="size-4" />
          Chat
        </Button>
        <Button
          variant={pathname.startsWith("/imagens") ? "secondary" : "ghost"}
          className="h-11 w-full justify-start gap-2 text-sm"
          onClick={() => go("/imagens")}
        >
          <ImageIcon className="size-4" />
          Estúdio de imagens
        </Button>
        {isAdmin ? (
          <Button
            variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
            className="h-11 w-full justify-start gap-2 text-sm"
            onClick={() => go("/admin")}
          >
            <Shield className="size-4" />
            Painel admin
          </Button>
        ) : null}
      </div>

      <div className="px-3 pb-2 pt-4 sm:px-4">
        <p className="px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
          Conversas
        </p>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 sm:px-4">
        {chats.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-xl pl-2 pr-1 text-sm transition-colors",
                c.id === activeChatId && pathname === "/"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <button
                className="min-w-0 flex-1 truncate py-2.5 text-left"
                onClick={() => {
                  selectChat(c.id);
                  go("/");
                }}
              >
                {c.title}
              </button>
              <button
                aria-label={`Excluir ${c.title}`}
                onClick={() => void deleteChat(c.id)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border bg-sidebar/60 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <p className="truncate px-1 text-[11px] text-muted-foreground sm:text-xs">{profile?.email}</p>
        <Button
          variant="ghost"
          className="mt-2 h-10 w-full justify-start gap-2 text-sm"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
