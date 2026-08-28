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

  if (!profile) return null;

  const next =
    new Date(profile.last_renewal_at).getTime() + profile.renewal_interval_seconds * 1000;
  const remaining = next - now;
  useEffectRefresh(remaining, refreshProfile);

  const pct = Math.max(
    0,
    Math.min(100, Math.round((profile.current_credits / Math.max(1, profile.base_credits)) * 100)),
  );

  return (
    <div className="flex min-w-[190px] flex-col gap-1 rounded-xl border border-border bg-card px-3 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <Zap className="size-3.5 text-primary" />
        <span className="font-medium">
          {profile.current_credits}/{profile.base_credits} energia
        </span>
        <span className="ml-auto text-muted-foreground">{formatCountdown(remaining)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function useEffectRefresh(remaining: number, refresh: () => Promise<void>) {
  useEffect(() => {
    if (remaining <= 0) void refresh();
  }, [remaining <= 0, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
}
