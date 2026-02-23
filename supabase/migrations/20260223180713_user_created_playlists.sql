begin;

-- =============================================================================
-- User Created Playlists & Tags Schema Update
-- =============================================================================

-- 1. Add new columns
alter table public.playlists
  add column if not exists is_system boolean not null default false,
  add column if not exists tag text;

-- 2. Migrate existing data (assume all existing are system playlists)
update public.playlists set is_system = true;

-- 3. Drop old playlist_type column and enum
drop index if exists playlists_type_status_idx;

alter table public.playlists
  drop column if exists playlist_type;

drop type if exists public.playlist_type;

-- 4. Re-create index for the new system
create index if not exists playlists_system_status_idx
  on public.playlists (is_system, status, published_at desc);

create index if not exists playlists_tag_idx
  on public.playlists (tag)
  where tag is not null;

-- =============================================================================
-- Row Level Security (RLS) Updates
-- =============================================================================

-- Playlists
drop policy if exists playlists_select_policy on public.playlists;
create policy playlists_select_policy
on public.playlists
for select
using (
  status = 'published'
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
  or (created_by = auth.uid() and is_system = false)
);

drop policy if exists playlists_manage_policy on public.playlists;
-- Admins/editors can manage all policies
create policy playlists_manage_policy
on public.playlists
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- Users can insert their own non-system playlists
create policy playlists_user_insert_policy
on public.playlists
for insert
with check (
  created_by = auth.uid() 
  and is_system = false
);

-- Users can update/delete their own non-system playlists
create policy playlists_user_update_delete_policy
on public.playlists
for update
using (
  created_by = auth.uid() 
  and is_system = false
)
with check (
  created_by = auth.uid() 
  and is_system = false
);

create policy playlists_user_delete_policy
on public.playlists
for delete
using (
  created_by = auth.uid() 
  and is_system = false
);

-- Playlist Items
drop policy if exists playlist_items_select_policy on public.playlist_items;
create policy playlist_items_select_policy
on public.playlist_items
for select
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and (
        p.status = 'published'
        or (p.created_by = auth.uid() and p.is_system = false)
      )
  )
  or public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- Admins/Editors can manage all items
drop policy if exists playlist_items_manage_policy on public.playlist_items;
create policy playlist_items_manage_policy
on public.playlist_items
for all
using (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
)
with check (
  public.has_any_role(array['admin'::public.app_role, 'editor'::public.app_role])
);

-- Users can manage items in their own non-system playlists
create policy playlist_items_user_insert_policy
on public.playlist_items
for insert
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.created_by = auth.uid()
      and p.is_system = false
  )
);

create policy playlist_items_user_update_policy
on public.playlist_items
for update
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.created_by = auth.uid()
      and p.is_system = false
  )
)
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.created_by = auth.uid()
      and p.is_system = false
  )
);

create policy playlist_items_user_delete_policy
on public.playlist_items
for delete
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.created_by = auth.uid()
      and p.is_system = false
  )
);

-- =============================================================================
-- Triggers for User Playlists
-- =============================================================================

-- Auto-generate a unique slug for user-created playlists if one isn't provided
create or replace function public.auto_generate_playlist_slug()
returns trigger as $$
declare
  base_slug text;
  new_slug text;
  counter integer := 1;
begin
  -- Only apply to user-created playlists (is_system = false)
  if new.is_system = false then
    -- If no slug is provided, or we just want to ensure it's slugified from title
    if new.slug is null or new.slug = '' then
      base_slug := public.slugify(new.title);
      new_slug := base_slug;
      
      -- Ensure uniqueness
      while exists (select 1 from public.playlists where slug = new_slug and id != new.id) loop
        new_slug := base_slug || '-' || counter;
        counter := counter + 1;
      end loop;
      
      new.slug := new_slug;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists ensure_user_playlist_slug on public.playlists;
create trigger ensure_user_playlist_slug
before insert or update on public.playlists
for each row
execute function public.auto_generate_playlist_slug();

commit;
