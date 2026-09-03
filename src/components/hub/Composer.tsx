import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHub, type Attachment } from "@/lib/hub-store";
import { PromptTemplate } from "@/components/PromptTemplate";

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

export function Composer({ showTemplates = false }: { showTemplates?: boolean }) {
  const { sendMessage, streaming, stop } = useHub();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
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

  const acceptFile = async (file?: File) => {
    if (!file) return;
    setAttachment(await readFile(file));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void acceptFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:px-6">
      <div className="mx-auto w-full max-w-[820px] space-y-2">
        {showTemplates ? <PromptTemplate onSelect={(p) => setValue((v) => (v ? v + "\n" : "") + p)} /> : null}

        {attachment ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            {attachment.kind === "image" && attachment.dataUrl ? (
              <img
                src={attachment.dataUrl}
                alt="Prévia do anexo"
                className="size-7 rounded-md object-cover"
              />
            ) : null}
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

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex items-end gap-1 rounded-2xl border border-border bg-card px-1.5 py-1.5 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
        >
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
            className="size-9 shrink-0 rounded-xl"
          >
            <Paperclip className="size-4" />
          </Button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            placeholder={
              attachment ? "Adicione uma instrução para o anexo..." : "Pergunte qualquer coisa..."
            }
            className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {streaming ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={stop}
              aria-label="Parar geração"
              className="size-9 shrink-0 rounded-xl"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim() && !attachment}
              aria-label="Enviar mensagem"
              className="size-9 shrink-0 rounded-xl"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        {focused || value ? (
          <p className="text-center text-[10px] text-muted-foreground/60">
            Enter envia · Shift + Enter nova linha · arraste arquivos para anexar
          </p>
        ) : null}
      </div>
    </div>
  );
}
