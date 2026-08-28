import { Image as ImageIcon, LogOut, MessageSquarePlus, Shield, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHub } from "@/lib/hub-store";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const {
    chats,
    activeChatId,
    selectChat,
    newChat,
    deleteChat,
    tab,
    setTab,
    isAdmin,
    profile,
    signOut,
  } = useHub();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Hub de IA Universal</span>
      </div>

      <div className="space-y-1 px-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            newChat();
            onNavigate?.();
          }}
        >
          <MessageSquarePlus className="size-4" />
          Nova conversa
        </Button>
        <Button
          variant={tab === "images" ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => {
            setTab("images");
            onNavigate?.();
          }}
        >
          <ImageIcon className="size-4" />
          Estúdio de imagens
        </Button>
        {isAdmin ? (
          <Button
            variant={tab === "admin" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => {
              setTab("admin");
              onNavigate?.();
            }}
          >
            <Shield className="size-4" />
            Painel admin
          </Button>
        ) : null}
      </div>

      <p className="px-4 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Conversas
      </p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {chats.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors",
                c.id === activeChatId && tab === "chat"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => {
                  selectChat(c.id);
                  onNavigate?.();
                }}
              >
                {c.title}
              </button>
              <button
                aria-label={`Excluir ${c.title}`}
                onClick={() => void deleteChat(c.id)}
                className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <p className="truncate px-1 text-xs text-muted-foreground">{profile?.email}</p>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-2 text-sm"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
