# Supabase setup for 777

This folder prepares the production database and file storage for the website.

## What is stored

- `categories`, `products` and `hero_slides` — catalogue and the home-page gallery;
- `site_settings` — editable site settings;
- `customer_requests`, `request_items`, `request_documents` — applications, selected quantities and uploaded documents;
- private Storage buckets for product images, hero images and request documents.

## One-time setup

1. Create a Supabase project in a region close to Kazakhstan.
2. Open **SQL Editor** → **New query**, paste and run
   `supabase/migrations/20260814_001_initial_schema.sql`.
3. In **Project Settings → API**, copy the project URL and keys into a local `.env` using `.env.example`.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` on the Plesk/Cloudflare server only. Never put it in HTML or browser JavaScript.

## Migration from the current website

The running site currently keeps products, categories, settings and requests in
Cloudflare KV. After Supabase access is provided, the next step is to export those
four datasets, load them into these tables, and switch the API endpoints to
Supabase. This avoids data loss and keeps existing request items intact.

## File rules

- Product and hero images: JPG, PNG or WebP, maximum 10 MB each.
- Request files: PDF, JPG, PNG, XLS/XLSX, DOC/DOCX, maximum 10 MB each.
- All buckets are private; authorised downloads should use short-lived signed URLs.
