-- =====================================================================
-- Migration 0006: admin branding.
-- guest_table_info() also returns the brand accent (a preset key stored
-- in restaurants.settings.accent) and the Wi-Fi name / opening hours the
-- guest screens may show. Still only what the printed QR already implies.
-- =====================================================================
create or replace function public.guest_table_info(p_qr_token text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'table_label',        t.label,
    'restaurant_id',      r.id,
    'restaurant_name',    r.name,
    'restaurant_slug',    r.slug,
    'tagline',            r.tagline,
    'logo_path',          r.logo_path,
    'currency',           r.currency,
    'vat_bps',            r.vat_bps,
    'service_charge_bps', r.service_charge_bps,
    'accent',             r.settings ->> 'accent',
    'wifi',               r.settings ->> 'wifi',
    'opening_hours',      r.settings ->> 'opening_hours'
  )
  from public.dining_tables t
  join public.restaurants r on r.id = t.restaurant_id
  where t.qr_token = p_qr_token
    and t.is_active
    and char_length(p_qr_token) between 1 and 128
$$;

revoke execute on function public.guest_table_info(text) from public;
grant execute on function public.guest_table_info(text) to anon, authenticated;
