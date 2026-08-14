const SITE_URL = "https://kurylys-hypermarket.pages.dev";

const escapeXml = value => String(value).replace(/[<>&'\"]/g, char => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;"
}[char]));

const urlEntry = ({ path, changefreq, priority }) => {
  const parts = ["<url><loc>" + escapeXml(SITE_URL + path) + "</loc>"];
  if (changefreq) parts.push("<changefreq>" + changefreq + "</changefreq>");
  if (priority) parts.push("<priority>" + priority + "</priority>");
  parts.push("</url>");
  return parts.join("");
};

export async function onRequestGet({ env }) {
  let products = [];
  try {
    products = await env.KURYLYS_DATA?.get("products", "json");
  } catch {
    products = [];
  }
  const publicProducts = Array.isArray(products)
    ? products.filter(product => product && typeof product === "object" && product.active !== false && product.id != null)
    : [];

  const staticUrls = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/catalog.html", changefreq: "daily", priority: "0.9" },
    { path: "/services.html", changefreq: "monthly", priority: "0.7" },
    { path: "/about.html", changefreq: "monthly", priority: "0.6" },
    { path: "/contacts.html", changefreq: "monthly", priority: "0.6" }
  ];
  const productUrls = publicProducts.slice(0, 49000).map(product => ({
    path: "/product.html?id=" + encodeURIComponent(String(product.id)),
    changefreq: "weekly",
    priority: "0.7"
  }));
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    staticUrls.concat(productUrls).map(urlEntry).join("") +
    "</urlset>";

  return new Response(sitemap, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
