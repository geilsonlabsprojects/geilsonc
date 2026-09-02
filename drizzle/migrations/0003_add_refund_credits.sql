CREATE OR REPLACE FUNCTION public.refund_credits(
  _amount integer,
  _action text DEFAULT 'refund',
  _provider text DEFAULT NULL,
  _model text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE public.profiles
     SET current_credits = current_credits + _amount,
         updated_at = now()
   WHERE user_id = auth.uid()
  RETURNING * INTO result;

  INSERT INTO public.usage_logs (user_id, action, provider, model, credits, cost_usd)
  VALUES (auth.uid(), _action, _provider, _model, -_amount, 0);

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.refund_credits(integer, text, text, text) TO authenticated;