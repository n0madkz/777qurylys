-- 777 Construction Hypermarket: primary data schema.
-- Run this file in Supabase SQL Editor or via the Supabase CLI.
-- The service role key must stay only on the server (Plesk/Cloudflare Functions).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  parent_id text references public.categories(id) on update cascade on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  translations jsonb not null default '{}'::jsonb,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists categories_parent_order_idx
  on public.categories(parent_id, sort_order, name);

create table if not exists public.products (
  -- Text ID allows a lossless migration of existing numeric and imported IDs.
  id text primary key default gen_random_uuid()::text,
  category_id text references public.categories(id) on update cascade on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 300),
  translations jsonb not null default '{}'::jsonb,
  brand text not null default '',
  sku text,
  description text not null default '',
  specifications jsonb not null default '[]'::jsonb,
  image_path text,
  image_alt text not null default '',
  badge text,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_specifications_array check (jsonb_typeof(specifications) = 'array'),
  constraint product_translations_object check (jsonb_typeof(translations) = 'object'),
  constraint product_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists products_catalog_idx
  on public.products(category_id, is_active, sort_order, created_at desc);
create index if not exists products_active_idx
  on public.products(is_active) where is_active;
create index if not exists products_name_search_idx
  on public.products using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '')));

create table if not exists public.hero_slides (
  id text primary key default gen_random_uuid()::text,
  storage_path text not null,
  width integer not null check (width between 1 and 3840),
  height integer not null check (height between 1 and 2160),
  label text not null default '' check (char_length(label) <= 100),
  translations jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hero_translations_object check (jsonb_typeof(translations) = 'object')
);

create index if not exists hero_slides_active_order_idx
  on public.hero_slides(is_active, sort_order, created_at);

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint site_settings_value_object check (jsonb_typeof(value) = 'object')
);

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  phone text not null check (char_length(trim(phone)) between 3 and 80),
  email text,
  client_type text not null default 'individual' check (client_type in ('individual', 'legal')),
  company_name text,
  bin text check (bin is null or bin ~ '^\\d{12}$'),
  legal_address text,
  position text,
  description text not null default '',
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint legal_client_details check (
    client_type = 'individual'
    or (company_name is not null and bin is not null and legal_address is not null)
  )
);

create index if not exists customer_requests_created_idx
  on public.customer_requests(created_at desc);
create index if not exists customer_requests_status_created_idx
  on public.customer_requests(status, created_at desc);

create table if not exists public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_requests(id) on delete cascade,
  product_id text references public.products(id) on update cascade on delete set null,
  product_name text not null,
  brand text not null default '',
  category_id text,
  quantity integer not null default 1 check (quantity between 1 and 9999),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint request_item_snapshot_object check (jsonb_typeof(product_snapshot) = 'object')
);

create index if not exists request_items_request_idx on public.request_items(request_id);

create table if not exists public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_requests(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(trim(original_name)) between 1 and 255),
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists request_documents_request_idx on public.request_documents(request_id);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at before update on public.hero_slides
  for each row execute function public.set_updated_at();
drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
drop trigger if exists customer_requests_set_updated_at on public.customer_requests;
create trigger customer_requests_set_updated_at before update on public.customer_requests
  for each row execute function public.set_updated_at();

-- All uploaded documents are private: the application generates authorised download URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('request-documents', 'request-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('hero-images', 'hero-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Direct browser writes are deliberately disabled. The Plesk/Cloudflare server uses
-- SUPABASE_SERVICE_ROLE_KEY for controlled uploads and database mutations.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.hero_slides enable row level security;
alter table public.site_settings enable row level security;
alter table public.customer_requests enable row level security;
alter table public.request_items enable row level security;
alter table public.request_documents enable row level security;

drop policy if exists "Public can view active categories" on public.categories;
create policy "Public can view active categories"
  on public.categories for select to anon, authenticated using (is_active);

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
  on public.products for select to anon, authenticated using (is_active);

drop policy if exists "Public can view active hero slides" on public.hero_slides;
create policy "Public can view active hero slides"
  on public.hero_slides for select to anon, authenticated using (is_active);

drop policy if exists "Public can view site settings" on public.site_settings;
create policy "Public can view site settings"
  on public.site_settings for select to anon, authenticated using (true);
