import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findModel, formatCountdown } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";

export function CreditsBar() {
  const { profile, refreshProfile, model, redeemCode } = useHub();
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = profile
    ? new Date(profile.last_renewal_at).getTime() + profile.renewal_interval_seconds * 1000
    : 0;
  const remaining = next - now;
  const due = Boolean(profile) && remaining <= 0;

  useEffect(() => {
    if (due) void refreshProfile();
  }, [due, refreshProfile]);

  if (!profile) return null;

  const current = findModel(model);
  const pct = Math.max(
    0,
    Math.min(100, Math.round((profile.current_credits / Math.max(1, profile.base_credits)) * 100)),
  );

  const redeem = async () => {
    try {
      setStatus(await redeemCode(code));
      setCode("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full border border-border/70 px-2.5 text-xs font-normal"
          aria-label="Ver detalhes da energia"
          title={`${profile.current_credits} de ${profile.base_credits} de energia`}
        >
          <Zap className="size-3.5 text-primary" />
          <span className="tabular-nums">
            {profile.current_credits}
            <span className="text-muted-foreground">/{profile.base_credits}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,18rem)] space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Energia
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {profile.current_credits}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {profile.base_credits}
            </span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Modelo atual</dt>
            <dd className="min-w-0 truncate text-right">{current.label}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Custo por mensagem</dt>
            <dd className="tabular-nums">{current.credits} energia</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Próxima renovação</dt>
            <dd className="tabular-nums">{due ? "..." : formatCountdown(remaining)}</dd>
          </div>
          {profile.is_guest ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Recargas de visitante</dt>
              <dd className="tabular-nums">{Math.max(0, 5 - (profile.guest_renewal_count ?? 0))}</dd>
            </div>
          ) : null}
        </dl>

        <div className="space-y-1.5 border-t border-border pt-3">
          <label htmlFor="energy-code" className="text-xs text-muted-foreground">
            Código de energia
          </label>
          <div className="flex gap-2">
            <Input
              id="energy-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="HUB-XXXX"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" onClick={() => void redeem()} disabled={!code.trim()}>
              Resgatar
            </Button>
          </div>
          {status ? <p className="text-[11px] text-muted-foreground">{status}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
