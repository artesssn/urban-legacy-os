create extension if not exists pgcrypto;

create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  sku text,
  size text,
  sizes text[] not null default '{}',
  color text,
  colors text[] not null default '{}',
  supplier text,
  description text,
  material text,
  fit text,
  measurements text,
  care text,
  cost numeric not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  price numeric not null default 0,
  compare_at_price numeric,
  image_url text,
  gallery_urls text[] not null default '{}',
  badge text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  qty integer not null default 1,
  customer text not null,
  channel text not null,
  status text not null,
  total numeric not null default 0,
  profit numeric not null default 0,
  sold_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  instagram text,
  style text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  customer_name text not null,
  type text not null,
  top_size text,
  bottom_size text,
  shoe_size text,
  colors text,
  style text,
  budget numeric,
  link text,
  notes text,
  created_at timestamptz not null default now()
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

alter table public.products add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.products add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists size text;
alter table public.products add column if not exists sizes text[] not null default '{}';
alter table public.products add column if not exists colors text[] not null default '{}';
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists material text;
alter table public.products add column if not exists fit text;
alter table public.products add column if not exists measurements text;
alter table public.products add column if not exists care text;
alter table public.products add column if not exists compare_at_price numeric;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists gallery_urls text[] not null default '{}';
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists published boolean not null default true;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists updated_at timestamptz not null default now();

alter table public.products enable row level security;
alter table public.store_admins enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;
alter table public.customer_references enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public products access" on public.products;
drop policy if exists "Admins read own admin access" on public.store_admins;
drop policy if exists "Public read published products" on public.products;
drop policy if exists "User products access" on public.products;
drop policy if exists "User sales access" on public.sales;
drop policy if exists "User customers access" on public.customers;
drop policy if exists "User customer references access" on public.customer_references;
drop policy if exists "Customers read own profile" on public.customer_profiles;
drop policy if exists "Customers insert own profile" on public.customer_profiles;
drop policy if exists "Customers update own profile" on public.customer_profiles;
drop policy if exists "Customers insert own orders" on public.orders;
drop policy if exists "Customers read own orders" on public.orders;
drop policy if exists "Customers insert own order items" on public.order_items;
drop policy if exists "Customers read own order items" on public.order_items;

create policy "Public read published products"
on public.products
for select
using (published = true);

create policy "Admins read own admin access"
on public.store_admins
for select
using (user_id = auth.uid());

create policy "User products access"
on public.products
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "User sales access"
on public.sales
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "User customers access"
on public.customers
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "User customer references access"
on public.customer_references
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

create policy "Customers insert own orders"
on public.orders
for insert
with check (customer_user_id = auth.uid());

create policy "Customers read own orders"
on public.orders
for select
using (customer_user_id = auth.uid());

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

-- Para separar cliente e admin, adicione somente seu usuario de gestao:
-- insert into public.store_admins (user_id, role)
-- select id, 'owner' from auth.users where email = 'joaogabrielbr31@gmail.com'
-- on conflict (user_id) do update set role = 'owner';

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
