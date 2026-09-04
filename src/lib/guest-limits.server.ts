/**
 * Server-side limits for the account-free ("Experimentar sem conta") mode.
 *
 * Guests have no backend account: their history lives in the browser. Usage is
 * still metered here, per device id, so the free tier cannot be farmed. Repeated
 * attempts to go past the limits block the device for 24h.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const GUEST_SERVER_LIMITS = {
  /** energy pool per cycle */
  base_credits: 50,
  /** how long a cycle lasts before the single automatic recharge */
  renewal_interval_seconds: 5 * 60 * 60,
  /** automatic recharges allowed per day */
  max_recharges: 1,
  /** images per day */
  images_per_day: 5,
  /** only basic models */
  max_model_credits: 2,
  /** chat requests allowed per minute */
  burst_per_minute: 6,
  /** denied attempts before a 24h block */
  max_violations: 8,
} as const;

export interface GuestState {
  device_id: string;
  credits_left: number;
  base_credits: number;
  images_left: number;
  recharge_count: number;
  next_renewal_at: string | null;
  blocked_until: string | null;
}

type Row = Database["public"]["Tables"]["guest_devices"]["Row"];

const DEVICE_RE = /^[a-zA-Z0-9-]{8,64}$/;

export function isValidDeviceId(id: string | null | undefined): id is string {
  return typeof id === "string" && DEVICE_RE.test(id);
}

export async function getAdmin(): Promise<SupabaseClient<Database>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<Database>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toState(row: Row): GuestState {
  const cycleEnd =
    new Date(row.cycle_started_at).getTime() + GUEST_SERVER_LIMITS.renewal_interval_seconds * 1000;
  return {
    device_id: row.device_id,
    credits_left: Math.max(0, GUEST_SERVER_LIMITS.base_credits - row.credits_used),
    base_credits: GUEST_SERVER_LIMITS.base_credits,
    images_left: Math.max(0, GUEST_SERVER_LIMITS.images_per_day - row.image_count),
    recharge_count: row.recharge_count,
    next_renewal_at:
      row.recharge_count < GUEST_SERVER_LIMITS.max_recharges ? new Date(cycleEnd).toISOString() : null,
    blocked_until: row.blocked_until,
  };
}

/** Loads (creating when needed) the device row, applying daily reset and the automatic recharge. */
async function loadRow(db: SupabaseClient<Database>, deviceId: string): Promise<Row> {
  const { data: existing } = await db
    .from("guest_devices")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await db
      .from("guest_devices")
      .insert({ device_id: deviceId })
      .select("*")
      .single();
    if (error) throw error;
    return created;
  }

  const patch: Partial<Row> = {};
  if (existing.day !== today()) {
    patch.day = today();
    patch.credits_used = 0;
    patch.recharge_count = 0;
    patch.image_count = 0;
    patch.violations = 0;
    patch.cycle_started_at = new Date().toISOString();
  } else if (
    existing.credits_used >= GUEST_SERVER_LIMITS.base_credits &&
    existing.recharge_count < GUEST_SERVER_LIMITS.max_recharges &&
    Date.now() - new Date(existing.cycle_started_at).getTime() >=
      GUEST_SERVER_LIMITS.renewal_interval_seconds * 1000
  ) {
    patch.credits_used = 0;
    patch.recharge_count = existing.recharge_count + 1;
    patch.cycle_started_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return existing;
  const { data: updated, error } = await db
    .from("guest_devices")
    .update(patch)
    .eq("device_id", deviceId)
    .select("*")
    .single();
  if (error) throw error;
  return updated;
}

export async function getGuestState(deviceId: string): Promise<GuestState> {
  const db = await getAdmin();
  return toState(await loadRow(db, deviceId));
}

/** Records a denied attempt; too many in a row block the device for 24h. */
async function registerViolation(db: SupabaseClient<Database>, row: Row): Promise<string | null> {
  const violations = row.violations + 1;
  const blocked =
    violations >= GUEST_SERVER_LIMITS.max_violations
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : row.blocked_until;
  await db
    .from("guest_devices")
    .update({ violations, blocked_until: blocked })
    .eq("device_id", row.device_id);
  return blocked;
}

export type GuestConsumeResult =
  | { ok: true; state: GuestState }
  | { ok: false; status: number; message: string; state: GuestState };

const BLOCK_MESSAGE =
  "Detectamos tentativas repetidas de burlar os limites do acesso sem conta. Este dispositivo foi bloqueado por 24 horas. Crie uma conta gratuita para continuar.";

/**
 * Consumes guest quota for a chat message or an image.
 * `credits` is the model cost (chat) and is ignored for images.
 */
export async function consumeGuest(
  deviceId: string,
  kind: "chat" | "image",
  credits: number,
): Promise<GuestConsumeResult> {
  const db = await getAdmin();
  const row = await loadRow(db, deviceId);

  if (row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    return { ok: false, status: 429, message: BLOCK_MESSAGE, state: toState(row) };
  }

  const deny = async (status: number, message: string) => {
    const blocked = await registerViolation(db, row);
    return {
      ok: false as const,
      status: blocked && new Date(blocked).getTime() > Date.now() ? 429 : status,
      message: blocked && new Date(blocked).getTime() > Date.now() ? BLOCK_MESSAGE : message,
      state: { ...toState(row), blocked_until: blocked },
    };
  };

  if (kind === "chat" && credits > GUEST_SERVER_LIMITS.max_model_credits) {
    return deny(
      403,
      "No acesso sem conta apenas os modelos básicos estão liberados. Crie uma conta gratuita para usar os avançados.",
    );
  }

  if (kind === "image" && row.image_count >= GUEST_SERVER_LIMITS.images_per_day) {
    return deny(
      403,
      `Você usou as ${GUEST_SERVER_LIMITS.images_per_day} imagens diárias do acesso sem conta. Crie uma conta gratuita para gerar mais.`,
    );
  }

  const cost = kind === "image" ? Math.max(1, credits) : credits;
  if (row.credits_used + cost > GUEST_SERVER_LIMITS.base_credits) {
    const canRecharge = row.recharge_count < GUEST_SERVER_LIMITS.max_recharges;
    return deny(
      402,
      canRecharge
        ? "Energia esgotada. Sua única recarga automática do dia chega em algumas horas — ou crie uma conta gratuita para ter mais energia agora."
        : "Você já usou a energia e a recarga automática do acesso sem conta hoje. Crie uma conta gratuita para continuar.",
    );
  }

  const minuteAgo = Date.now() - 60_000;
  if (kind === "chat" && new Date(row.last_action_at).getTime() > minuteAgo) {
    // soft burst guard: at most one request every (60 / burst) seconds
    const minGap = 60_000 / GUEST_SERVER_LIMITS.burst_per_minute;
    if (Date.now() - new Date(row.last_action_at).getTime() < minGap) {
      return deny(429, "Muitas mensagens em pouco tempo. Aguarde alguns segundos e tente de novo.");
    }
  }

  const { data: updated, error } = await db
    .from("guest_devices")
    .update({
      credits_used: row.credits_used + cost,
      image_count: kind === "image" ? row.image_count + 1 : row.image_count,
      last_action_at: new Date().toISOString(),
    })
    .eq("device_id", deviceId)
    .select("*")
    .single();
  if (error) throw error;
  return { ok: true, state: toState(updated) };
}

/** Gives back the quota when the provider fails and nothing was delivered. */
export async function refundGuest(deviceId: string, kind: "chat" | "image", credits: number) {
  const db = await getAdmin();
  const { data: row } = await db
    .from("guest_devices")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (!row) return;
  await db
    .from("guest_devices")
    .update({
      credits_used: Math.max(0, row.credits_used - Math.max(1, credits)),
      image_count: kind === "image" ? Math.max(0, row.image_count - 1) : row.image_count,
    })
    .eq("device_id", deviceId);
}
