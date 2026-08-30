import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useHub } from "@/lib/hub-store";
import { AuthGate } from "./AuthGate";
import { AdminDashboard } from "./AdminDashboard";
import { ChatHeader } from "./ChatHeader";
import { ChatSidebar } from "./ChatSidebar";
import { Composer } from "./Composer";
import { ImageStudio } from "./ImageStudio";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS = [
  "Explique a diferença entre RAG e fine-tuning.",
  "Escreva um roteiro de 30s para um app de IA.",
  "Refatore esta função em TypeScript para ser mais legível.",
  "Resuma as tendências de LLMs open source.",
];

export function ChatWindow() {
  const { loading, user, tab, messages, streaming, error, sendMessage } = useHub();
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthGate />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border md:block">
        <ChatSidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <ChatSidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader onOpenMenu={() => setMenuOpen(true)} />

        {tab === "images" ? (
          <div className="flex-1 overflow-y-auto">
            <ImageStudio />
          </div>
        ) : tab === "admin" ? (
          <div className="flex-1 overflow-y-auto">
            <AdminDashboard />
          </div>
        ) : (
          <>
            <div className="relative flex-1 overflow-y-auto">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-64 surface-glow" />
              <div className="relative mx-auto w-full max-w-3xl px-3 py-6 md:px-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-6 py-10 text-center animate-message-in">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-primary/15 text-primary">
                      <Bot className="size-7" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-2xl font-semibold tracking-tight">Hub de IA Universal</h1>
                      <p className="max-w-md text-sm text-muted-foreground">
                        Converse com modelos do Hub, Hugging Face, Google Gemini, Groq e OpenRouter
                        — escolha o provedor e o modelo no topo da tela.
                      </p>
                    </div>
                    <div className="grid w-full gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => void sendMessage(s)}
                          className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-card-foreground transition-colors hover:border-primary/60 hover:bg-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((m, i) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        pending={streaming && i === messages.length - 1 && m.role === "assistant"}
                      />
                    ))}
                  </div>
                )}

                {error ? (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground animate-message-in">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p>{error}</p>
                  </div>
                ) : null}

                <div ref={bottomRef} className="h-px" />
              </div>
            </div>

            <Composer />
          </>
        )}
      </main>
    </div>
  );
}
