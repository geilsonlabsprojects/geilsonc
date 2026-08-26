import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHub } from "@/lib/hub-store";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { conversations, activeId, selectConversation, createConversation, deleteConversation } =
    useHub();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">Hub de IA Universal</p>
          <p className="text-xs text-muted-foreground">Hugging Face Inference</p>
        </div>
        {onNavigate ? (
          <Button variant="ghost" size="icon" onClick={onNavigate} aria-label="Fechar menu">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            createConversation();
            onNavigate?.();
          }}
        >
          <Plus className="size-4" />
          Nova conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Histórico
        </p>
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <div
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                  c.id === activeId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    selectConversation(c.id);
                    onNavigate?.();
                  }}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => deleteConversation(c.id)}
                  aria-label={`Excluir ${c.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Conversas e token ficam apenas no seu navegador (localStorage).
      </div>
    </div>
  );
}
