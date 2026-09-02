import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { snapshotAnonymousHistory, syncGuestDataToAuth } from "@/lib/history-sync";
import { useHub } from "@/lib/hub-store";

export function AuthGate() {
  const { activeChatId } = useHub();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await snapshotAnonymousHistory(activeChatId);
    } catch {
      setError("Não foi possível preparar seu histórico de visitante. Tente novamente.");
      setBusy(false);
      return;
    }
    const { error: err, data } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    if (err) setError(err.message);
    else if (mode === "signin" || data.session) {
      try {
        await syncGuestDataToAuth();
      } catch {
        setError(
          "Sua conta entrou, mas não foi possível migrar o histórico agora. Tente entrar novamente.",
        );
      }
    } else {
      setError("Sua conta foi criada. Seu histórico será sincronizado quando você entrar.");
    }
    setBusy(false);
  };

  const google = async () => {
    setError(null);
    try {
      await snapshotAnonymousHistory(activeChatId);
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar com Google");
    }
  };

  const continueAsGuest = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) {
      setError("O acesso sem conta não está disponível agora. Entre com e-mail ou Google.");
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_35%),_linear-gradient(to_bottom,_#050816,_#0b1120)] px-3 py-6 sm:px-4 sm:py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-border/80 bg-card/90 shadow-[0_20px_65px_rgba(37,99,235,0.15)] backdrop-blur-xl sm:max-w-lg">
        <div className="border-b border-border/80 bg-primary/5 px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-primary/15 text-primary shadow-lg shadow-primary/10 sm:size-16">
              <Bot className="size-7 sm:size-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Hub de IA Universal
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Entre para usar modelos de IA em qualquer lugar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="h-11"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2.5 pt-1">
            <Button className="h-11 w-full gap-2" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
            <Button variant="secondary" className="h-11 w-full" onClick={() => void google()}>
              Continuar com Google
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full gap-2"
              onClick={() => void continueAsGuest()}
              disabled={busy}
            >
              <Sparkles className="size-4" /> Experimentar sem conta
            </Button>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            Acesso sem conta: até 5 recargas automáticas, modelos básicos e geração de imagens
            limitada.
          </p>

          <button
            className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
