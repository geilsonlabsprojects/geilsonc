import { useEffect, useRef } from "react";
import { AlertTriangle, Bot } from "lucide-react";
import { useHub } from "@/lib/hub-store";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS = [
  "Explique a diferença entre RAG e fine-tuning.",
  "Escreva um roteiro de 30s para um app de IA.",
  "Refatore esta função em TypeScript para ser mais legível.",
  "Resuma as tendências de LLMs open source.",
];

export function ChatPanel() {
  const { messages, streaming, error, sendMessage } = useHub();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 surface-glow" />
        <div className="relative mx-auto w-full max-w-3xl px-3 py-6 md:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-6 text-center animate-message-in sm:py-10">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-primary/15 text-primary">
                <Bot className="size-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Hub de IA Universal
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Converse com modelos do Hub, Hugging Face, Google Gemini, Groq e OpenRouter —
                  escolha o provedor e o modelo no topo da tela.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void sendMessage(s)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-card-foreground transition-colors hover:border-primary/60 hover:bg-accent active:scale-[0.99]"
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
              <p className="min-w-0">{error}</p>
            </div>
          ) : null}

          <div ref={bottomRef} className="h-px" />
        </div>
      </div>

      <Composer />
    </div>
  );
}
