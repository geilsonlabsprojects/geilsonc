import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useHub } from "@/lib/hub-store";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS = [
  { label: "Escrever", prompt: "Ajude-me a escrever um texto claro e envolvente sobre " },
  { label: "Programar", prompt: "Ajude-me a resolver este desafio de programação: " },
  { label: "Estudar", prompt: "Explique este assunto de forma simples, com exemplos: " },
  { label: "Ideias", prompt: "Crie ideias originais para " },
  { label: "Analisar", prompt: "Analise e resuma o seguinte conteúdo: " },
  { label: "Imagens", prompt: "Descreva um prompt de imagem detalhado para " },
];

export function ChatPanel() {
  const { messages, streaming, error, sendMessage } = useHub();
  const bottomRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[820px] px-4 py-6 md:px-6">
          {empty ? (
            <div className="flex flex-col items-center gap-5 py-10 text-center animate-message-in sm:py-16">
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Hub de IA Universal
                </h2>
                <p className="text-sm text-muted-foreground">Como posso ajudar você hoje?</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={() => void sendMessage(suggestion.prompt)}
                    className="rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-foreground animate-message-in">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="min-w-0">{error}</p>
            </div>
          ) : null}

          <div ref={bottomRef} className="h-8" />
        </div>
      </div>

      <Composer showTemplates={empty} />
    </div>
  );
}
