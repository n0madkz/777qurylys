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

const publicSettings = settings => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return settings || null;
  const { heroSlides, ...visibleSettings } = settings;
  return visibleSettings;
};

const publicProducts = products => Array.isArray(products)
  ? products.filter(product => product && typeof product === "object" && product.active !== false)
  : products;

export async function onRequestGet({ env }) {
  const [products, settings, storedCategories] = await Promise.all([
    env.KURYLYS_DATA?.get("products", "json"),
    env.KURYLYS_DATA?.get("settings", "json"),
    env.KURYLYS_DATA?.get("categories", "json")
  ]);

  return json({
    products: publicProducts(products),
    settings: publicSettings(settings),
    categories: Array.isArray(storedCategories) && storedCategories.length
      ? storedCategories
      : DEFAULT_CATEGORIES
  });
}
