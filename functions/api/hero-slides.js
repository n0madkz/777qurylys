const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

const MAX_HERO_SOURCE_LENGTH = 2.1 * 1024 * 1024;
const isHeroSource = value => /^(?:assets\/[a-z0-9_./-]+|https:\/\/[^\s"'<>]+|data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+)$/i.test(value);

export async function onRequestGet({ env }) {
  const settings = await env.KURYLYS_DATA?.get("settings", "json");
  const slides = Array.isArray(settings?.heroSlides) ? settings.heroSlides.reduce((result, item) => {
    const id = String(item?.id || "").trim();
    const src = String(item?.src || "").trim();
    if (result.length < 5 && /^[a-z0-9-]{1,100}$/i.test(id) && src.length <= MAX_HERO_SOURCE_LENGTH && isHeroSource(src)) {
      result.push({
        id,
        src,
        width: Math.min(3840, Math.max(1, Number(item?.width) || 1920)),
        height: Math.min(2160, Math.max(1, Number(item?.height) || 1080)),
        label: String(item?.label || "Фон баннера").trim().slice(0, 60)
      });
    }
    return result;
  }, []) : [];
  return json({ slides });
}
