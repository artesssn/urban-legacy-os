create extension if not exists pgcrypto;

create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  sku text,
  description text,
  color text,
  material text,
  fit text,
  measurements text,
  care text,
  sizes text[] not null default '{}',
  price numeric not null default 0,
  compare_at_price numeric,
  cost numeric not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  image_url text,
  gallery_urls text[] not null default '{}',
  badge text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text not null default 'Novo',
  total numeric not null default 0,
  whatsapp_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  category text,
  color text,
  size text,
  qty integer not null default 1,
  unit_price numeric not null default 0,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists material text;
alter table public.products add column if not exists fit text;
alter table public.products add column if not exists measurements text;
alter table public.products add column if not exists care text;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists customer_profiles_touch_updated_at on public.customer_profiles;
create trigger customer_profiles_touch_updated_at
before update on public.customer_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

alter table public.store_admins enable row level security;
alter table public.products enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Admins read admins" on public.store_admins;
drop policy if exists "Admins manage products" on public.products;
drop policy if exists "Public read published products" on public.products;
drop policy if exists "Customers read own profile" on public.customer_profiles;
drop policy if exists "Customers insert own profile" on public.customer_profiles;
drop policy if exists "Customers update own profile" on public.customer_profiles;
drop policy if exists "Admins read customer profiles" on public.customer_profiles;
drop policy if exists "Customers insert own orders" on public.orders;
drop policy if exists "Customers read own orders" on public.orders;
drop policy if exists "Admins manage orders" on public.orders;
drop policy if exists "Customers insert own order items" on public.order_items;
drop policy if exists "Customers read own order items" on public.order_items;
drop policy if exists "Admins manage order items" on public.order_items;

create policy "Admins read admins"
on public.store_admins
for select
using (user_id = auth.uid());

create policy "Public read published products"
on public.products
for select
using (published = true);

create policy "Admins manage products"
on public.products
for all
using (exists (select 1 from public.store_admins where user_id = auth.uid()))
with check (exists (select 1 from public.store_admins where user_id = auth.uid()));

create policy "Customers read own profile"
on public.customer_profiles
for select
using (user_id = auth.uid());

create policy "Customers insert own profile"
on public.customer_profiles
for insert
with check (user_id = auth.uid());

create policy "Customers update own profile"
on public.customer_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins read customer profiles"
on public.customer_profiles
for select
using (exists (select 1 from public.store_admins where user_id = auth.uid()));

create policy "Customers insert own orders"
on public.orders
for insert
with check (customer_user_id = auth.uid());

create policy "Customers read own orders"
on public.orders
for select
using (customer_user_id = auth.uid());

create policy "Admins manage orders"
on public.orders
for all
using (exists (select 1 from public.store_admins where user_id = auth.uid()))
with check (exists (select 1 from public.store_admins where user_id = auth.uid()));

create policy "Customers insert own order items"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.customer_user_id = auth.uid()
  )
);

create policy "Customers read own order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.customer_user_id = auth.uid()
  )
);

create policy "Admins manage order items"
on public.order_items
for all
using (exists (select 1 from public.store_admins where user_id = auth.uid()))
with check (exists (select 1 from public.store_admins where user_id = auth.uid()));

-- Depois de criar sua conta admin no site ou no Supabase Auth, rode:
-- insert into public.store_admins (user_id) values ('COLE_AQUI_O_ID_DO_USUARIO_ADMIN');
