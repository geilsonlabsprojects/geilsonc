import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHub, type Attachment } from "@/lib/hub-store";

async function readFile(file: File): Promise<Attachment> {
  if (file.type.startsWith("image/")) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read error"));
      reader.readAsDataURL(file);
    });
    return { name: file.name, kind: "image", dataUrl };
  }
  const text = await file.text();
  return { name: file.name, kind: "text", text: text.slice(0, 30_000) };
}

export function Composer() {
  const { sendMessage, streaming, stop } = useHub();
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const submit = () => {
    if ((!value.trim() && !attachment) || streaming) return;
    void sendMessage(value, attachment ?? undefined);
    setValue("");
    setAttachment(null);
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(await readFile(file));
    e.target.value = "";
  };

  return (
    <div className="border-t border-border bg-background/85 px-3 py-3 backdrop-blur md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {attachment ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <Paperclip className="size-3.5 text-primary" />
            <span className="truncate">{attachment.name}</span>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setAttachment(null)}
              aria-label="Remover anexo"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg transition-colors focus-within:border-primary/60">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.txt,.md,.csv,.json,.ts,.tsx,.js,.py"
            onChange={(e) => void onFile(e)}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            aria-label="Anexar arquivo"
          >
            <Paperclip className="size-4" />
          </Button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            placeholder="Pergunte qualquer coisa..."
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {streaming ? (
            <Button size="icon" variant="secondary" onClick={stop} aria-label="Parar geração">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim() && !attachment}
              aria-label="Enviar mensagem"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter envia · Shift + Enter cria nova linha
        </p>
      </div>
    </div>
  );
}
