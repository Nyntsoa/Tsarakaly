create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  allergens text[] not null default '{}',
  labels text[] not null default '{}',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_email text not null check (char_length(customer_email) <= 254),
  customer_phone text not null check (char_length(customer_phone) between 6 and 30),
  reservation_date date not null,
  reservation_time time not null,
  guest_count integer not null check (guest_count between 1 and 30),
  occasion text check (occasion is null or char_length(occasion) <= 100),
  special_requests text check (special_requests is null or char_length(special_requests) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reservation_date >= current_date)
);

create index if not exists reservations_date_status_idx on public.reservations (reservation_date, status);
create index if not exists reservations_date_time_idx on public.reservations (reservation_date, reservation_time);
create index if not exists menu_items_category_order_idx on public.menu_items (category_id, sort_order) where is_available;

create table if not exists public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  restaurant_name text not null default 'Tsarakaly',
  description text not null default 'Restaurant de démonstration — informations à confirmer.',
  address text not null default 'Adresse à compléter',
  phone text not null default '',
  email text not null default '',
  opening_hours jsonb not null default '{"2":["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00"],"3":["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00"],"4":["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00"],"5":["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00"],"6":["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00"]}',
  closed_days integer[] not null default '{0,1}',
  max_party_size integer not null default 8 check (max_party_size between 1 and 30),
  max_guests_per_slot integer not null default 24 check (max_guests_per_slot between 1 and 300),
  timezone text not null default 'Indian/Antananarivo',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

insert into public.restaurant_settings (id) values (1) on conflict (id) do nothing;
insert into public.categories (name, slug, sort_order) values
  ('Entrées', 'entrees', 1), ('Plats principaux', 'plats-principaux', 2),
  ('Desserts', 'desserts', 3), ('Boissons', 'boissons', 4)
on conflict (slug) do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), 'customer');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.create_reservation(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_reservation_date date, p_reservation_time time, p_guest_count integer,
  p_occasion text default null, p_special_requests text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  cfg public.restaurant_settings%rowtype;
  new_id uuid;
  dow integer;
  slot_key text;
  reserved integer;
begin
  select * into strict cfg from public.restaurant_settings where id = 1;
  if p_reservation_date < (now() at time zone cfg.timezone)::date then
    raise exception 'La date de réservation est passée.' using errcode = '22023';
  end if;
  if p_guest_count < 1 or p_guest_count > cfg.max_party_size then
    raise exception 'Le nombre de personnes dépasse la limite configurée.' using errcode = '22023';
  end if;
  dow := extract(dow from p_reservation_date)::integer;
  if dow = any(cfg.closed_days) then
    raise exception 'Le restaurant est fermé ce jour-là.' using errcode = '22023';
  end if;
  slot_key := to_char(p_reservation_time, 'HH24:MI');
  if not coalesce((cfg.opening_hours -> dow::text) ? slot_key, false) then
    raise exception 'Ce créneau ne fait pas partie des horaires de réservation.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_reservation_date::text || slot_key));
  select coalesce(sum(guest_count), 0) into reserved from public.reservations
    where reservation_date = p_reservation_date and reservation_time = p_reservation_time
      and status in ('pending', 'confirmed');
  if reserved + p_guest_count > cfg.max_guests_per_slot then
    raise exception 'Ce créneau n’a plus assez de places.' using errcode = 'P0001';
  end if;
  insert into public.reservations (
    customer_name, customer_email, customer_phone, reservation_date,
    reservation_time, guest_count, occasion, special_requests, status
  ) values (
    trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
    p_reservation_date, p_reservation_time, p_guest_count,
    nullif(trim(p_occasion), ''), nullif(trim(p_special_requests), ''), 'pending'
  ) returning id into new_id;
  return new_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.reservations enable row level security;
alter table public.restaurant_settings enable row level security;

create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins can manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads active categories" on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads available menu" on public.menu_items for select to anon, authenticated using (is_available or public.is_admin());
create policy "admins manage menu" on public.menu_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read reservations" on public.reservations for select to authenticated using (public.is_admin());
create policy "admins update reservations" on public.reservations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads restaurant settings" on public.restaurant_settings for select to anon, authenticated using (true);
create policy "admins manage restaurant settings" on public.restaurant_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.reservations from anon, authenticated;
grant select, update on public.reservations to authenticated;
grant select on public.categories, public.menu_items, public.restaurant_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.menu_items, public.restaurant_settings to authenticated;
grant select on public.profiles to authenticated;
grant execute on function public.create_reservation(text,text,text,date,time,integer,text,text) to anon, authenticated;
revoke execute on function public.create_reservation(text,text,text,date,time,integer,text,text) from public;

comment on table public.reservations is 'Client data is never readable by anon; public submissions use a validating SECURITY DEFINER RPC.';
comment on function public.create_reservation(text,text,text,date,time,integer,text,text) is 'Validates configured opening slots and capacity, then creates a pending reservation.';
