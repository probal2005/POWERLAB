-- Keep trigger/event-trigger helpers out of the exposed Supabase RPC surface.
revoke all on function public.handle_new_powerlab_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.is_powerlab_admin() from anon;
grant execute on function public.is_powerlab_admin() to authenticated;
