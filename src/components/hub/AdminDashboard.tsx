import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { BarChart3, Copy, KeyRound, RefreshCw, Save, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  total_users: number;
  active_today: number;
  credits_renewed_today: number;
  cost_today: number;
  cost_total: number;
  by_provider: Array<{ provider: string; calls: number; cost: number }>;
  daily: Array<{ day: string; calls: number; cost: number; credits: number }>;
}

interface AppSettings {
  min_interval_seconds: number;
  max_interval_seconds: number;
  default_base_credits: number;
}

interface AccessCode {
  id: string;
  code: string;
  type: string;
  bonus_base_credits: number;
  instant_bonus: number;
  is_used: boolean;
  expires_at: string | null;
}

const initialSettings: AppSettings = {
  min_interval_seconds: 7200,
  max_interval_seconds: 18000,
  default_base_credits: 100,
};

const asStats = (value: unknown): AdminStats => {
  const stats = (value ?? {}) as Partial<AdminStats>;
  return {
    total_users: Number(stats.total_users ?? 0),
    active_today: Number(stats.active_today ?? 0),
    credits_renewed_today: Number(stats.credits_renewed_today ?? 0),
    cost_today: Number(stats.cost_today ?? 0),
    cost_total: Number(stats.cost_total ?? 0),
    by_provider: stats.by_provider ?? [],
    daily: stats.daily ?? [],
  };
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeType, setCodeType] = useState("HUB");
  const [codeCount, setCodeCount] = useState("1");
  const [baseBonus, setBaseBonus] = useState("0");
  const [instantBonus, setInstantBonus] = useState("100");

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: statsData, error: statsError },
      { data: settingsData, error: settingsError },
      { data: codesData, error: codesError },
    ] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase
        .from("app_settings")
        .select("min_interval_seconds,max_interval_seconds,default_base_credits")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("access_codes")
        .select("id,code,type,bonus_base_credits,instant_bonus,is_used,expires_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (statsError || settingsError || codesError) {
      toast.error("Não foi possível carregar todos os dados administrativos.");
    }
    if (statsData) setStats(asStats(statsData));
    if (settingsData) setSettings(settingsData);
    if (codesData) setCodes(codesData);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    const min = Number(settings.min_interval_seconds);
    const max = Number(settings.max_interval_seconds);
    const base = Number(settings.default_base_credits);
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      !Number.isInteger(base) ||
      min < 600 ||
      max <= min ||
      base < 0
    ) {
      toast.error("Use valores inteiros válidos. O mínimo deve ser ao menos 600 segundos.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_settings", {
      _min: min,
      _max: max,
      _default_base: base,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar as configurações.");
      return;
    }
    toast.success("Configurações salvas.");
    void load();
  };

  const generateCodes = async () => {
    const count = Number(codeCount);
    const base = Number(baseBonus);
    const instant = Number(instantBonus);
    if (
      !/^[A-Za-z0-9_-]{2,20}$/.test(codeType) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 200 ||
      !Number.isInteger(base) ||
      !Number.isInteger(instant) ||
      base < 0 ||
      instant < 0
    ) {
      toast.error("Revise o tipo e os valores do lote de códigos.");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.rpc("admin_generate_codes", {
      _type: codeType.toUpperCase(),
      _count: count,
      _bonus_base: base,
      _instant: instant,
    });
    setGenerating(false);
    if (error) {
      toast.error("Não foi possível gerar os códigos.");
      return;
    }
    setCodes((prev) => [...(data ?? []), ...prev].slice(0, 20));
    toast.success(`${data?.length ?? count} código(s) gerado(s).`);
  };

  const copyCode = async (code: string) => {
    const ok = await copyText(code);
    if (ok) toast.success(`Código copiado: ${code}`);
    else toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
  };

  const copyAll = async () => {
    const list = codes
      .filter((c) => !c.is_used)
      .map((c) => c.code)
      .join("\n");
    if (!list) {
      toast.error("Nenhum código ativo para copiar.");
      return;
    }
    const ok = await copyText(list);
    if (ok) toast.success("Todos os códigos ativos copiados.");
    else toast.error("Não foi possível copiar a lista.");
  };

  const metrics = [
    { label: "Usuários", value: stats?.total_users ?? 0, icon: Users },
    { label: "Ativos hoje", value: stats?.active_today ?? 0, icon: BarChart3 },
    { label: "Energia renovada", value: stats?.credits_renewed_today ?? 0, icon: RefreshCw },
    { label: "Custo hoje", value: `$${(stats?.cost_today ?? 0).toFixed(4)}`, icon: Wallet },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Painel administrativo</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o uso, créditos e custos do Hub.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{label}</span>
              <Icon className="size-4" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{loading ? "—" : value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium">Configuração de créditos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina a recarga aleatória para novos perfis.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field
              label="Intervalo mínimo (s)"
              value={settings.min_interval_seconds}
              onChange={(value) =>
                setSettings((current) => ({ ...current, min_interval_seconds: Number(value) }))
              }
            />
            <Field
              label="Intervalo máximo (s)"
              value={settings.max_interval_seconds}
              onChange={(value) =>
                setSettings((current) => ({ ...current, max_interval_seconds: Number(value) }))
              }
            />
            <Field
              label="Créditos base"
              value={settings.default_base_credits}
              onChange={(value) =>
                setSettings((current) => ({ ...current, default_base_credits: Number(value) }))
              }
            />
          </div>
          <Button className="mt-4 gap-2" onClick={() => void saveSettings()} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium">Gerar códigos de energia</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie até 200 códigos por lote.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TextField label="Tipo" value={codeType} onChange={setCodeType} />
            <TextField
              label="Quantidade"
              type="number"
              min="1"
              max="200"
              value={codeCount}
              onChange={setCodeCount}
            />
            <TextField
              label="Bônus na recarga"
              type="number"
              min="0"
              value={baseBonus}
              onChange={setBaseBonus}
            />
            <TextField
              label="Bônus imediato"
              type="number"
              min="0"
              value={instantBonus}
              onChange={setInstantBonus}
            />
          </div>
          <Button className="mt-4 gap-2" onClick={() => void generateCodes()} disabled={generating}>
            <KeyRound className="size-4" />
            {generating ? "Gerando..." : "Gerar códigos"}
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-medium">Uso por provedor (30 dias)</h3>
            <p className="text-sm text-muted-foreground">
              Custo acumulado: ${(stats?.cost_total ?? 0).toFixed(4)}
            </p>
          </div>
          <div className="divide-y divide-border">
            {stats?.by_provider.length ? (
              stats.by_provider.map((entry) => (
                <div
                  key={entry.provider}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span>{entry.provider}</span>
                  <span className="text-muted-foreground">
                    {entry.calls} chamadas · ${Number(entry.cost).toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                Nenhum uso registrado ainda.
              </p>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-medium">Códigos recentes</h3>
            <p className="text-sm text-muted-foreground">
              Clique para copiar um código não utilizado.
            </p>
          </div>
          <div className="divide-y divide-border">
            {codes.length ? (
              codes.map((code) => (
                <div key={code.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <button
                    className="min-w-0 flex-1 truncate text-left font-mono hover:text-primary"
                    onClick={() => void copyCode(code.code)}
                    title="Copiar código"
                  >
                    {code.code}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    +{code.instant_bonus} agora
                    {code.bonus_base_credits ? ` · +${code.bonus_base_credits} base` : ""}
                  </span>
                  <Copy className="size-4 shrink-0 text-muted-foreground" />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${code.is_used ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}
                  >
                    {code.is_used ? "Usado" : "Ativo"}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum código gerado ainda.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange"
>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}
