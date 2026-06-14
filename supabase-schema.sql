create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  sku text not null,
  size text,
  color text,
  supplier text,
  cost numeric not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  price numeric not null default 0,
  created_at timestamptz not null default now()
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

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;

drop policy if exists "Public products access" on public.products;
drop policy if exists "Public sales access" on public.sales;
drop policy if exists "Public customers access" on public.customers;
drop policy if exists "User products access" on public.products;
drop policy if exists "User sales access" on public.sales;
drop policy if exists "User customers access" on public.customers;

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
