import { useEffect, useState } from "react";
import { Gift, KeyRound, Monitor, Settings2, ShieldCheck, Zap } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS, modelKey, modelsForProvider, type ProviderId } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { useHub } from "@/lib/hub-store";

export function SettingsDialog() {
  const { provider, setProvider, model, setModel, user, redeemCode, profile } = useHub();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [theme, setTheme] = useState(() =>
    typeof window === "undefined" ? "dark" : (localStorage.getItem("hub.theme") ?? "dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const info = PROVIDERS.find((p) => p.id === provider)!;
  const models = modelsForProvider(provider);

  const saveKey = async () => {
    if (!secret.trim() || !user) return;
    await supabase.from("api_keys").delete().eq("provider", provider);
    const { error } = await supabase
      .from("api_keys")
      .insert({ user_id: user.id, provider, secret: secret.trim() });
    setSecret("");
    setStatus(error ? "Não foi possível salvar sua chave." : "Chave salva com segurança.");
  };

  const redeem = async () => {
    try {
      setStatus(await redeemCode(code));
      setCode("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };
  const setAppearance = (next: string) => {
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem("hub.theme", next);
  };

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
            <Settings2 className="size-4 text-primary" />
            Configurações
          </DialogTitle>
          <DialogDescription>
            Personalize sua experiência. O Hub continua gratuito e suas chaves ficam protegidas no
            servidor.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2 border-b border-border pb-4">
          <Label className="flex items-center gap-2">
            <Monitor className="size-4 text-primary" /> Geral
          </Label>
          <Select value={theme} onValueChange={setAppearance}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Aparência escura</SelectItem>
              <SelectItem value="light">Aparência clara</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <Label>Provedor</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
            <SelectTrigger>
              <SelectValue placeholder="Provedor" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <Label>Modelo</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={modelKey(m)} value={modelKey(m)}>
                  {m.label} · {m.credits} energia
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {info.free ? (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            {info.label} já está configurado no servidor — nenhuma chave é exposta no navegador.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="own-key" className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> Sua chave {info.label}
            </Label>
            <div className="flex gap-2">
              <Input
                id="own-key"
                type="password"
                placeholder={info.keyPlaceholder}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <Button variant="secondary" onClick={() => void saveKey()}>
                Salvar
              </Button>
            </div>
          </div>
        )}

        <section className="space-y-2 border-t border-border pt-4">
          <Label className="flex items-center gap-2">
            <Zap className="size-4 text-primary" /> Energia
          </Label>
          <p className="text-xs text-muted-foreground">
            {profile
              ? `${profile.current_credits} / ${profile.base_credits} energia disponível. A recarga é automática.`
              : "Carregando energia..."}
          </p>
          <Label htmlFor="code" className="flex items-center gap-2">
            <Gift className="size-4 text-primary" /> Resgatar código de energia
          </Label>
          <div className="flex gap-2">
            <Input
              id="code"
              placeholder="HUB-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button variant="secondary" onClick={() => void redeem()}>
              Resgatar
            </Button>
          </div>
        </section>

        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
