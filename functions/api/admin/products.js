const DEFAULT_CATEGORIES = [
  { id: "materials", name: "Стройматериалы", parent: "" },
  { id: "dry-mixes", name: "Сухие смеси", parent: "materials" },
  { id: "cement", name: "Цемент и добавки", parent: "materials" },
  { id: "brick-blocks", name: "Кирпич и блоки", parent: "materials" },
  { id: "lumber", name: "Пиломатериалы", parent: "materials" },
  { id: "sheet-materials", name: "Листовые материалы", parent: "materials" },
  { id: "insulation", name: "Утеплители и изоляция", parent: "materials" },
  { id: "waterproofing", name: "Гидроизоляция", parent: "materials" },
  { id: "roofing", name: "Кровля и водосток", parent: "materials" },
  { id: "metal-products", name: "Металлопрокат", parent: "materials" },
  { id: "fasteners", name: "Крепёж", parent: "materials" },
  { id: "masonry", name: "Кладочные материалы", parent: "materials" },
  { id: "tools", name: "Инструменты", parent: "" },
  { id: "power-tools", name: "Электроинструмент", parent: "tools" },
  { id: "hand-tools", name: "Ручной инструмент", parent: "tools" },
  { id: "measuring-tools", name: "Измерительный инструмент", parent: "tools" },
  { id: "finishing", name: "Отделка", parent: "" },
  { id: "paint", name: "Краски и покрытия", parent: "finishing" },
  { id: "tile", name: "Плитка и затирка", parent: "finishing" },
  { id: "flooring", name: "Напольные покрытия", parent: "finishing" },
  { id: "plumbing", name: "Сантехника", parent: "" },
  { id: "pipes-fittings", name: "Трубы и фитинги", parent: "plumbing" },
  { id: "faucets", name: "Смесители", parent: "plumbing" },
  { id: "electrics", name: "Электрика", parent: "" },
  { id: "lighting", name: "Освещение", parent: "electrics" }
];

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

const normalizeCategories = value => {
  if (!Array.isArray(value)) return DEFAULT_CATEGORIES;

  const unique = new Map();
  value.forEach(item => {
    const id = String(item && item.id || "").trim().toLowerCase();
    const name = String(item && item.name || "").trim();
    if (id && name && /^[a-z0-9-]+$/.test(id) && !unique.has(id)) {
      unique.set(id, { id, name, parent: String(item.parent || "").trim().toLowerCase() });
    }
  });

  const categories = Array.from(unique.values());
  return categories.length ? categories.map(item => ({
    id: item.id,
    name: item.name,
    parent: unique.has(item.parent) && item.parent !== item.id ? item.parent : ""
  })) : DEFAULT_CATEGORIES;
};

const MAX_HERO_SLIDES = 5;
const MAX_HERO_SOURCE_LENGTH = 2.1 * 1024 * 1024;
const isHeroSource = value => /^(?:assets\/[a-z0-9_./-]+|https:\/\/[^\s"'<>]+|data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+)$/i.test(value);

const normalizeHeroSlides = value => {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.reduce((slides, item) => {
    const id = String(item?.id || "").trim();
    const src = String(item?.src || "").trim();
    if (!/^[a-z0-9-]{1,100}$/i.test(id) || ids.has(id) || src.length > MAX_HERO_SOURCE_LENGTH || !isHeroSource(src)) {
      return slides;
    }
    ids.add(id);
    slides.push({
      id,
      src,
      width: Math.min(3840, Math.max(1, Number(item?.width) || 1920)),
      height: Math.min(2160, Math.max(1, Number(item?.height) || 1080)),
      label: String(item?.label || "Фон баннера").trim().slice(0, 60)
    });
    return slides;
  }, []).slice(0, MAX_HERO_SLIDES);
};

const normalizeSettings = value => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = { ...value };
  if (Object.prototype.hasOwnProperty.call(settings, "heroSlides")) {
    settings.heroSlides = normalizeHeroSlides(settings.heroSlides);
  }
  return settings;
};

export async function onRequestGet({ env }) {
  const [products, settings, storedCategories] = await Promise.all([
    env.KURYLYS_DATA?.get("products", "json"),
    env.KURYLYS_DATA?.get("settings", "json"),
    env.KURYLYS_DATA?.get("categories", "json")
  ]);

  return json({
    products,
    settings: normalizeSettings(settings),
    categories: normalizeCategories(storedCategories)
  });
}

export async function onRequestPut({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некорректный JSON" }, 400);
  }

  if (!Array.isArray(body.products)) {
    return json({ error: "Нужен массив товаров" }, 400);
  }

  const categories = normalizeCategories(body.categories);
  await env.KURYLYS_DATA.put("products", JSON.stringify(body.products));
  await env.KURYLYS_DATA.put("categories", JSON.stringify(categories));
  const settings = normalizeSettings(body.settings);
  if (settings) await env.KURYLYS_DATA.put("settings", JSON.stringify(settings));

  return json({
    ok: true,
    products: body.products,
    settings,
    categories
  });
}
