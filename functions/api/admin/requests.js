const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const stringValue = (value, limit = 3000) => String(value == null ? "" : value).trim().slice(0, limit);
const emailValid = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const requestQuantity = value => Math.min(9999, Math.max(1, Math.floor(Number(value) || 1)));
const requestProducts = value => Array.isArray(value) ? value.slice(0, 100).map(item => ({
  id: stringValue(item?.id, 120),
  name: stringValue(item?.name || item?.title, 300) || "Товар без названия",
  brand: stringValue(item?.brand || item?.manufacturer, 160),
  category: stringValue(item?.category || item?.cat, 120),
  quantity: requestQuantity(item?.quantity)
})) : [];

async function getRequests(env) {
  if (!env.KURYLYS_DATA) return null;
  const saved = await env.KURYLYS_DATA.get("requests", "json");
  return Array.isArray(saved) ? saved : [];
}

async function requestBody(request) {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ env }) {
  const requests = await getRequests(env);
  if (!requests) return json({ error: "Хранилище заявок не настроено" }, 503);
  return json({ requests });
}

export async function onRequestPut({ request, env }) {
  const body = await requestBody(request);
  const id = stringValue(body?.id, 100);
  const name = stringValue(body?.name, 160);
  const phone = stringValue(body?.phone, 80);
  const email = stringValue(body?.email, 160);
  const clientType = stringValue(body?.clientType, 20) === "legal" ? "legal" : "individual";
  const companyName = stringValue(body?.companyName, 200);
  const bin = stringValue(body?.bin, 20).replace(/\D/g, "").slice(0, 12);
  const legalAddress = stringValue(body?.legalAddress, 400);
  const position = stringValue(body?.position, 160);
  const description = stringValue(body?.description, 3000);

  if (!id || !name || !phone) return json({ error: "Укажите имя и телефон клиента" }, 400);
  if (!emailValid(email)) return json({ error: "Укажите корректный адрес электронной почты" }, 400);
  if (clientType === "legal" && (!companyName || !/^\d{12}$/.test(bin) || !legalAddress)) {
    return json({ error: "Для юридического лица укажите компанию, БИН из 12 цифр и юридический адрес" }, 400);
  }
  const requests = await getRequests(env);
  if (!requests) return json({ error: "Хранилище заявок не настроено" }, 503);

  const index = requests.findIndex(item => String(item?.id) === id);
  if (index < 0) return json({ error: "Заявка не найдена" }, 404);

  const products = Object.prototype.hasOwnProperty.call(body || {}, "products")
    ? requestProducts(body.products)
    : requestProducts(requests[index].products);

  const updated = {
    ...requests[index],
    name,
    phone,
    email,
    clientType,
    companyName,
    bin,
    legalAddress,
    position,
    description,
    products,
    updatedAt: new Date().toISOString()
  };
  requests[index] = updated;
  await env.KURYLYS_DATA.put("requests", JSON.stringify(requests.slice(0, 1000)));
  return json({ ok: true, request: updated, requests });
}

export async function onRequestDelete({ request, env }) {
  const id = stringValue(new URL(request.url).searchParams.get("id"), 100);
  if (!id) return json({ error: "Не указана заявка для удаления" }, 400);

  const requests = await getRequests(env);
  if (!requests) return json({ error: "Хранилище заявок не настроено" }, 503);

  const next = requests.filter(item => String(item?.id) !== id);
  if (next.length === requests.length) return json({ error: "Заявка не найдена" }, 404);

  await env.KURYLYS_DATA.put("requests", JSON.stringify(next.slice(0, 1000)));
  return json({ ok: true, id, requests: next });
}
