CREATE TABLE IF NOT EXISTS public.guest_devices (
  device_id text PRIMARY KEY,
  day date NOT NULL DEFAULT CURRENT_DATE,
  credits_used integer NOT NULL DEFAULT 0,
  recharge_count integer NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  violations integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  cycle_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.guest_devices TO service_role;

ALTER TABLE public.guest_devices ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: only trusted server code (service role) may read/write.
