
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.sync_credits() from public, anon;
revoke execute on function public.spend_credits(int, text, text, text, numeric) from public, anon;
revoke execute on function public.redeem_access_code(text) from public, anon;
revoke execute on function public.admin_generate_codes(text, int, int, int, timestamptz) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_update_settings(int, int, int) from public, anon;
revoke execute on function public.claim_first_admin() from public, anon;

grant execute on function public.sync_credits() to authenticated;
grant execute on function public.spend_credits(int, text, text, text, numeric) to authenticated;
grant execute on function public.redeem_access_code(text) to authenticated;
grant execute on function public.admin_generate_codes(text, int, int, int, timestamptz) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_update_settings(int, int, int) to authenticated;
grant execute on function public.claim_first_admin() to authenticated;
