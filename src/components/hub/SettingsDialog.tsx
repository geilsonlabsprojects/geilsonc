import { useState } from "react";
import { Eye, EyeOff, KeyRound, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHub } from "@/lib/hub-store";

export function SettingsDialog() {
  const { token, setToken } = useHub();
  const [visible, setVisible] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Configurações">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Hugging Face Token
          </DialogTitle>
          <DialogDescription>
            Seu token é salvo apenas neste navegador e enviado exclusivamente para
            router.huggingface.co.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="hf-token">Access token</Label>
          <div className="flex gap-2">
            <Input
              id="hf-token"
              type={visible ? "text" : "password"}
              placeholder="hf_..."
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar token" : "Mostrar token"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie um token em huggingface.co/settings/tokens com permissão de Inference.
          </p>
        </div>

        {token ? (
          <Button variant="ghost" className="justify-start text-destructive" onClick={() => setToken("")}>
            Remover token deste navegador
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
