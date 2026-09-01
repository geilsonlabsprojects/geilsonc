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
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2 px-4 py-4 transition-opacity hover:opacity-80"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <span className="truncate text-sm font-semibold tracking-tight">Hub de IA Universal</span>
      </Link>

      <div className="space-y-1 px-3">
        <Button
          className="h-10 w-full justify-start gap-2"
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
          className="h-10 w-full justify-start gap-2"
          onClick={() => go("/")}
        >
          <MessageSquare className="size-4" />
          Chat
        </Button>
        <Button
          variant={pathname.startsWith("/imagens") ? "secondary" : "ghost"}
          className="h-10 w-full justify-start gap-2"
          onClick={() => go("/imagens")}
        >
          <ImageIcon className="size-4" />
          Estúdio de imagens
        </Button>
        {isAdmin ? (
          <Button
            variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
            className="h-10 w-full justify-start gap-2"
            onClick={() => go("/admin")}
          >
            <Shield className="size-4" />
            Painel admin
          </Button>
        ) : null}
      </div>

      <p className="px-4 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Conversas
      </p>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {chats.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg pl-2 pr-1 text-sm transition-colors",
                c.id === activeChatId && pathname === "/"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
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
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="truncate px-1 text-xs text-muted-foreground">{profile?.email}</p>
        <Button
          variant="ghost"
          className="mt-1 h-10 w-full justify-start gap-2 text-sm"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
