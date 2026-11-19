-- =====================================================================
-- Migration 0002: storage bucket for menu images and restaurant logo.
-- Public bucket = images are served by public URL (fine for menu photos).
-- Only owners/managers may upload/replace/delete, and only inside their
-- own restaurant folder:  menu-images/{restaurant_id}/{file}
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "menu images: managers upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
    and public.is_staff(public.my_restaurant_id(), array['owner','manager']::public.staff_role[])
  );

-- Needed for upsert/replace through the Storage API.
create policy "menu images: managers select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
  );

create policy "menu images: managers update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
    and public.is_staff(public.my_restaurant_id(), array['owner','manager']::public.staff_role[])
  );

create policy "menu images: managers delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
    and public.is_staff(public.my_restaurant_id(), array['owner','manager']::public.staff_role[])
  );
