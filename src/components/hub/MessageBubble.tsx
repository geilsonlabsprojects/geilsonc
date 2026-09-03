import { Bot, Check, Copy, Paperclip } from "lucide-react";
import { useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";
import type { MessageRow } from "@/lib/hub-store";

function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
  const [copied, setCopied] = useState(false);
  const language = className?.match(/language-([\w+-]+)/)?.[1] ?? "código";
  const content = String(children).replace(/\n$/, "");
  const copy = async () => {
    await copyText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="my-3 max-w-full overflow-hidden rounded-lg border border-border bg-background/70">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{language}</span>
        <button
          onClick={() => void copy()}
          className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-secondary hover:text-foreground"
          aria-label="Copiar código"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto p-3 text-[13px]">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message, pending }: { message: MessageRow; pending?: boolean }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const copyMessage = async () => {
    await copyText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end animate-message-in">
        <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground sm:max-w-[78%]">
          {message.attachment_url ? (
            <img
              src={message.attachment_url}
              alt={message.attachment_name ?? "Anexo enviado"}
              className="mb-2 max-h-48 rounded-lg object-contain"
            />
          ) : message.attachment_name ? (
            <p className="mb-1.5 flex items-center gap-1.5 text-xs opacity-80">
              <Paperclip className="size-3" />
              {message.attachment_name}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/message flex w-full min-w-0 gap-2.5 animate-message-in">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
        <Bot className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 text-sm text-foreground">
        {message.content ? (
          <div className="prose-chat max-w-full break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ className, children, ...props }) =>
                  className ? (
                    <CodeBlock className={className} {...props}>
                      {children}
                    </CodeBlock>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ),
                table: ({ children, ...props }) => (
                  <div className="my-3 max-w-full overflow-x-auto">
                    <table {...props}>{children}</table>
                  </div>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {pending ? (
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] animate-caret bg-primary" />
            ) : null}
          </div>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            digitando...
          </span>
        )}

        {message.content && !pending ? (
          <div className={cn("mt-1.5 flex transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100")}>
            <button
              onClick={() => void copyMessage()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Copiar resposta"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
