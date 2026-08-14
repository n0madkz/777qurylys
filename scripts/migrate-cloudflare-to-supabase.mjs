/**
 * One-time migration of the current public Cloudflare catalogue into Supabase.
 *
 * Run locally with:
 *   $env:SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
 *   $env:SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVER_ONLY_KEY'
 *   node scripts/migrate-cloudflare-to-supabase.mjs
 *
 * The key is read only from the environment and is never written to the repo.
 */

const sourceUrl = (process.env.SOURCE_URL || "https://kurylys-hypermarket.pages.dev").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before starting migration.");
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}: HTTP ${response.status}`);
  return response.json();
}

async function rest(method, path, payload, prefer = "return=representation") {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${method} ${path} failed: ${response.status} ${message}`);
  }
  const responseBody = await response.text();
  return responseBody ? JSON.parse(responseBody) : null;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function categoryRow(category, index) {
  return {
    id: String(category.id || "").trim().toLowerCase(),
    parent_id: String(category.parent || "").trim().toLowerCase() || null,
    name: String(category.name || "").trim(),
    translations: asObject(category.translations),
    icon: category.icon ? String(category.icon) : null,
    sort_order: Number.isFinite(Number(category.sort_order)) ? Number(category.sort_order) : index,
    is_active: category.active !== false
  };
}

function productRow(product, index) {
  const canonical = new Set(["id", "name", "title", "brand", "manufacturer", "cat", "category", "category_id", "image", "description", "specs", "specifications", "active", "is_active", "translations"]);
  const metadata = {};
  Object.entries(asObject(product)).forEach(([key, value]) => {
    if (!canonical.has(key)) metadata[key] = value;
  });
  return {
    id: String(product.id || "").trim(),
    category_id: String(product.cat || product.category || product.category_id || "").trim().toLowerCase() || null,
    name: String(product.name || product.title || "").trim(),
    translations: asObject(product.translations),
    brand: String(product.brand || product.manufacturer || ""),
    description: String(product.description || ""),
    specifications: asArray(product.specs || product.specifications),
    image_path: product.image ? String(product.image) : null,
    image_alt: "",
    badge: product.badge ? String(product.badge) : null,
    sort_order: Number.isFinite(Number(product.sort_order)) ? Number(product.sort_order) : index,
    is_active: product.active === true || product.is_active === true,
    metadata
  };
}

async function upsertCategories(categories) {
  const pending = categories.slice();
  const complete = new Set();
  while (pending.length) {
    const ready = pending.filter(category => !category.parent_id || complete.has(category.parent_id) || !pending.some(item => item.id === category.parent_id));
    const rows = ready.length ? ready : [pending[0]];
    await rest("POST", "categories?on_conflict=id", rows, "resolution=merge-duplicates,return=minimal");
    rows.forEach(row => {
      complete.add(row.id);
      pending.splice(pending.indexOf(row), 1);
    });
  }
}

const [catalog, slideResponse] = await Promise.all([
  getJson(`${sourceUrl}/api/catalog`),
  getJson(`${sourceUrl}/api/hero-slides`)
]);

const categories = asArray(catalog.categories).map(categoryRow).filter(row => row.id && row.name);
const products = asArray(catalog.products).map(productRow).filter(row => row.id && row.name);
const settings = asObject(catalog.settings);
const slides = asArray(slideResponse.slides).map((slide, index) => ({
  id: String(slide.id || "").trim(),
  storage_path: String(slide.src || "").trim(),
  width: Math.max(1, Math.min(3840, Number(slide.width) || 1920)),
  height: Math.max(1, Math.min(2160, Number(slide.height) || 1080)),
  label: String(slide.label || ""),
  translations: asObject(slide.translations),
  sort_order: index,
  is_active: slide.active !== false
})).filter(row => row.id && row.storage_path);

await upsertCategories(categories);
if (products.length) await rest("POST", "products?on_conflict=id", products, "resolution=merge-duplicates,return=minimal");
await rest("POST", "site_settings?on_conflict=key", [{ key: "site", value: settings }], "resolution=merge-duplicates,return=minimal");
if (slides.length) await rest("POST", "hero_slides?on_conflict=id", slides, "resolution=merge-duplicates,return=minimal");

console.log(`Migration complete: ${categories.length} categories, ${products.length} products, ${slides.length} hero slides.`);
