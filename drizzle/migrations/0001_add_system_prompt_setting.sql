ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS system_prompt text NOT NULL DEFAULT 'Você é o assistente do Hub de IA Universal. Responda de forma clara, útil e em markdown quando ajudar.';

CREATE OR REPLACE FUNCTION public.admin_update_settings(
  _min integer,
  _max integer,
  _default_base integer,
  _system_prompt text DEFAULT NULL
)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.app_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE public.app_settings
     SET min_interval_seconds = _min,
         max_interval_seconds = _max,
         default_base_credits = _default_base,
         system_prompt = COALESCE(NULLIF(btrim(_system_prompt), ''), system_prompt),
         updated_at = now()
   WHERE id = 1
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_settings(integer, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_settings(integer, integer, integer, text) TO authenticated;