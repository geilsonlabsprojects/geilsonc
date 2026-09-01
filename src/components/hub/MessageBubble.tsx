import { Bot, Paperclip, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { MessageRow } from "@/lib/hub-store";

export function MessageBubble({ message, pending }: { message: MessageRow; pending?: boolean }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full max-w-full gap-2.5 sm:gap-3 animate-message-in",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border sm:size-8",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary",
        )}
      >
        {isUser ? <User className="size-3.5 sm:size-4" /> : <Bot className="size-3.5 sm:size-4" />}
      </div>

      <div
        className={cn(
          "w-full max-w-[min(46rem,92%)] rounded-2xl px-3 py-3 text-sm sm:px-4 sm:py-3.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "border border-border bg-card text-card-foreground rounded-tl-sm",
        )}
      >
        {message.attachment_url ? (
          <img
            src={message.attachment_url}
            alt={message.attachment_name ?? "Anexo enviado"}
            className="mb-2 max-h-56 rounded-lg border border-border object-contain"
          />
        ) : message.attachment_name ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs opacity-80">
            <Paperclip className="size-3" />
            {message.attachment_name}
          </p>
        ) : null}

        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : message.content ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
      </div>
    </div>
  );
}
