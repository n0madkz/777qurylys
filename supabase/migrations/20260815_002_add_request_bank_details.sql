-- Add banking requisites for legal entity requests.
-- Safe to run once on an existing 777 Qurylys Supabase project.

alter table public.customer_requests
  add column if not exists iik text,
  add column if not exists bik text,
  add column if not exists bank_name text;
