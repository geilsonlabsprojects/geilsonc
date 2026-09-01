import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { formatCountdown } from "@/lib/ai";
import { useHub } from "@/lib/hub-store";

export function CreditsBar() {
  const { profile, refreshProfile } = useHub();
  const [now, setNow] = useState(() => Date.now());

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

  const pct = Math.max(
    0,
    Math.min(100, Math.round((profile.current_credits / Math.max(1, profile.base_credits)) * 100)),
  );

  return (
    <div
      className="flex min-w-[190px] flex-col gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5"
      title={`${profile.current_credits} de ${profile.base_credits} de energia`}
    >
      <div className="flex items-center gap-1.5 text-xs">
        <Zap className="size-3.5 shrink-0 text-primary" />
        <span className="font-medium tabular-nums">
          {profile.current_credits}
          <span className="text-muted-foreground">/{profile.base_credits}</span>
        </span>
        <span className="hidden sm:inline">energia</span>
        {profile.is_guest ? <span className="text-muted-foreground"> · visitante</span> : null}
        <span className="ml-2 tabular-nums text-muted-foreground sm:ml-auto">
          {due ? "..." : formatCountdown(remaining)}
        </span>
      </div>
      {profile.is_guest ? (
        <p className="text-[10px] text-muted-foreground">
          Recargas gratuitas restantes: {Math.max(0, 5 - (profile.guest_renewal_count ?? 0))}
        </p>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
