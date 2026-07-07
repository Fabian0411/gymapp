-- ============================================================
-- GymApp — Esquema Fase 1 (MVP: rutinas + social)
-- Pegar este archivo completo en: Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFILES
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  avatar_url  text,
  bio         text check (char_length(bio) <= 300),
  created_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse (el username viene
-- en los metadatos del signUp desde la app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. CATÁLOGO DE EJERCICIOS (importado con scripts/import-exercises.mjs)
-- ------------------------------------------------------------
create table public.exercises (
  id                text primary key,          -- slug del dataset free-exercise-db
  name              text not null,
  category          text,                      -- strength, stretching, cardio...
  equipment         text,
  level             text,                      -- beginner, intermediate, expert
  mechanic          text,                      -- compound / isolation
  force             text,                      -- push / pull / static
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions      text[] not null default '{}',
  images            text[] not null default '{}'  -- rutas relativas de imagen
);

create index exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);
create index exercises_name_idx on public.exercises (lower(name));

-- ------------------------------------------------------------
-- 3. RUTINAS
-- ------------------------------------------------------------
create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index routines_owner_idx on public.routines (owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references public.routines (id) on delete cascade,
  exercise_id  text not null references public.exercises (id),
  position     int  not null default 0,
  sets         int  not null default 3 check (sets between 1 and 20),
  reps         int  not null default 10 check (reps between 1 and 100),
  weight_kg    numeric(6,2) check (weight_kg >= 0),
  rest_seconds int check (rest_seconds between 0 and 3600),
  notes        text check (char_length(notes) <= 200)
);

create index routine_exercises_routine_idx on public.routine_exercises (routine_id);

-- ------------------------------------------------------------
-- 4. AMISTADES
-- ------------------------------------------------------------
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- Evita solicitudes duplicadas en cualquier dirección
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_addressee_idx on public.friendships (addressee_id, status);

-- ------------------------------------------------------------
-- 5. RUTINAS COMPARTIDAS
-- ------------------------------------------------------------
create table public.routine_shares (
  routine_id  uuid not null references public.routines (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  shared_by   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (routine_id, shared_with)
);

create index routine_shares_shared_with_idx on public.routine_shares (shared_with);

-- ------------------------------------------------------------
-- 6. FUNCIONES AUXILIARES PARA RLS
-- (security definer: evalúan sin RLS para evitar recursión entre políticas)
-- ------------------------------------------------------------
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = user_a and f.addressee_id = user_b)
        or (f.requester_id = user_b and f.addressee_id = user_a))
  );
$$;

create or replace function public.is_routine_owner(r_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from routines r where r.id = r_id and r.owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_routine(r_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from routines r
    where r.id = r_id
      and (r.owner_id = auth.uid()
        or r.is_public
        or exists (select 1 from routine_shares s
                   where s.routine_id = r_id and s.shared_with = auth.uid()))
  );
$$;

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (la defensa principal de la app)
-- ------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.friendships       enable row level security;
alter table public.routine_shares    enable row level security;

-- PROFILES: cualquier usuario autenticado puede buscar perfiles;
-- solo el dueño edita el suyo. (El perfil se crea vía trigger.)
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- EXERCISES: catálogo de solo lectura (se importa con la service key,
-- que no pasa por RLS; ningún usuario normal puede modificarlo).
create policy "exercises_select" on public.exercises
  for select to authenticated using (true);

-- ROUTINES: visibles si son tuyas, públicas o compartidas contigo.
create policy "routines_select" on public.routines
  for select to authenticated
  using (
    owner_id = auth.uid()
    or is_public
    or exists (select 1 from public.routine_shares s
               where s.routine_id = id and s.shared_with = auth.uid())
  );

create policy "routines_insert_own" on public.routines
  for insert to authenticated with check (owner_id = auth.uid());

create policy "routines_update_own" on public.routines
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "routines_delete_own" on public.routines
  for delete to authenticated using (owner_id = auth.uid());

-- ROUTINE_EXERCISES: siguen la visibilidad de su rutina;
-- solo el dueño de la rutina los modifica.
create policy "routine_exercises_select" on public.routine_exercises
  for select to authenticated using (public.can_view_routine(routine_id));

create policy "routine_exercises_insert" on public.routine_exercises
  for insert to authenticated with check (public.is_routine_owner(routine_id));

create policy "routine_exercises_update" on public.routine_exercises
  for update to authenticated
  using (public.is_routine_owner(routine_id))
  with check (public.is_routine_owner(routine_id));

create policy "routine_exercises_delete" on public.routine_exercises
  for delete to authenticated using (public.is_routine_owner(routine_id));

-- FRIENDSHIPS: solo ven la fila los dos implicados; el receptor acepta.
create policy "friendships_select" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "friendships_accept" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

create policy "friendships_delete" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ROUTINE_SHARES: solo puedes compartir rutinas tuyas y con amigos.
create policy "routine_shares_select" on public.routine_shares
  for select to authenticated
  using (shared_with = auth.uid() or public.is_routine_owner(routine_id));

create policy "routine_shares_insert" on public.routine_shares
  for insert to authenticated
  with check (
    shared_by = auth.uid()
    and public.is_routine_owner(routine_id)
    and public.are_friends(auth.uid(), shared_with)
  );

create policy "routine_shares_delete" on public.routine_shares
  for delete to authenticated
  using (shared_with = auth.uid() or public.is_routine_owner(routine_id));

-- ------------------------------------------------------------
-- 8. STORAGE: bucket de avatares
-- Cada usuario solo puede escribir dentro de su propia carpeta ({uid}/...).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
