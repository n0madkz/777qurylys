const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const stringValue = value => String(value == null ? "" : value).trim();
const requestQuantity = value => Math.min(9999, Math.max(1, Math.floor(Number(value) || 1)));
const emailValue = value => stringValue(value).slice(0, 160);
const emailValid = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENTS = 10;
const allowedDocument = file => /\.(pdf|png|jpe?g|xlsx?|docx?)$/i.test(stringValue(file?.name));

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Некорректные данные заявки" }, 400);
  }

  const name = stringValue(form.get("name"));
  const phone = stringValue(form.get("phone"));
  const email = emailValue(form.get("email"));
  const clientType = stringValue(form.get("clientType")) === "legal" ? "legal" : "individual";
  const companyName = stringValue(form.get("companyName")).slice(0, 200);
  const bin = stringValue(form.get("bin")).replace(/\D/g, "").slice(0, 12);
  const legalAddress = stringValue(form.get("legalAddress")).slice(0, 400);
  const position = stringValue(form.get("position")).slice(0, 160);
  const description = stringValue(form.get("description"));
  if (!name || !phone) return json({ error: "Укажите имя и телефон" }, 400);
  if (!emailValid(email)) return json({ error: "Укажите корректный адрес электронной почты" }, 400);
  if (clientType === "legal" && (!companyName || !/^\d{12}$/.test(bin) || !legalAddress)) {
    return json({ error: "Для юридического лица укажите компанию, БИН из 12 цифр и юридический адрес" }, 400);
  }

  let products = [];
  try {
    const parsed = JSON.parse(stringValue(form.get("products")) || "[]");
    products = Array.isArray(parsed) ? parsed.slice(0, 100).map(item => ({
      id: stringValue(item?.id),
      name: stringValue(item?.name) || "Товар без названия",
      brand: stringValue(item?.brand),
      category: stringValue(item?.category),
      quantity: requestQuantity(item?.quantity)
    })) : [];
  } catch {}

  const uploadedDocuments = form.getAll("documents").filter(value => value && typeof value === "object" && "name" in value);
  if (uploadedDocuments.length > MAX_DOCUMENTS) {
    return json({ error: "Можно прикрепить не более 10 файлов к одной заявке" }, 400);
  }

  const tooLarge = uploadedDocuments.find(file => Number(file.size) > MAX_DOCUMENT_SIZE);
  if (tooLarge) {
    return json({ error: "Размер каждого прикреплённого файла не должен превышать 10 МБ" }, 400);
  }

  const unsupported = uploadedDocuments.find(file => !allowedDocument(file));
  if (unsupported) {
    return json({ error: "Поддерживаются только PDF, JPG, PNG, XLS, XLSX, DOC и DOCX" }, 400);
  }

  const documents = uploadedDocuments.map(file => ({
    name: stringValue(file.name), size: Number(file.size) || 0, type: stringValue(file.type)
  }));
  const record = { id: crypto.randomUUID(), name, phone, email, clientType, companyName, bin, legalAddress, position, description, products, documents, createdAt: new Date().toISOString() };

  if (!env.KURYLYS_DATA) return json({ error: "Хранилище заявок не настроено" }, 503);
  const saved = await env.KURYLYS_DATA.get("requests", "json");
  const requests = Array.isArray(saved) ? saved : [];
  requests.unshift(record);
  await env.KURYLYS_DATA.put("requests", JSON.stringify(requests.slice(0, 1000)));
  return json({ ok: true, id: record.id });
}
