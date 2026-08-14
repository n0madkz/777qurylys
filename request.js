const form = document.getElementById("requestFormPage");
const input = document.getElementById("requestFiles");
const list = document.getElementById("requestFileList");
const status = document.getElementById("requestStatus");
const descriptionField = form ? form.querySelector('[name="description"]') : null;
const limit = 10 * 1024 * 1024;
const allowed = /\.(pdf|png|jpe?g|xlsx?|docx?)$/i;
const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const productName = product => typeof product.name === "object" ? (product.name.ru || product.name.kz || product.name.en || product.title || "") : (product.name || product.title || "");
function setStatus(message, type) {
  status.textContent = message;
  status.className = "form-status is-" + type;
}
function showFiles() {
  list.innerHTML = Array.from(input.files).map(file => '<span class="selected-file">' + escapeHtml(file.name) + "</span>").join("");
}
async function prefillSelectedProduct() {
  const id = new URLSearchParams(location.search).get("product");
  if (!id || !form) return;
  let product;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    const data = await response.json();
    product = Array.isArray(data.products) ? data.products.find(item => String(item.id) === String(id)) : null;
  } catch (error) {
    const local = JSON.parse(localStorage.getItem("kurylys_products") || "[]");
    product = local.find ? local.find(item => String(item.id) === String(id)) : null;
  }
  if (!product) return;
  const name = productName(product);
  const note = document.createElement("div");
  note.className = "selected-product";
  note.innerHTML = '<b>Выбранный товар</b><span>' + escapeHtml(name) + "</span>";
  form.insertBefore(note, form.firstChild);
  if (descriptionField && !descriptionField.value.trim()) descriptionField.value = "Интересует товар: " + name + ". ";
}
if (input) input.onchange = () => {
  const invalid = Array.from(input.files).find(file => file.size > limit || !allowed.test(file.name));
  if (invalid) {
    input.value = "";
    list.innerHTML = "";
    setStatus("Файл «" + invalid.name + "» не подходит. Проверьте формат и размер.", "error");
    return;
  }
  status.className = "form-status";
  showFiles();
};
if (form) form.onsubmit = async event => {
  event.preventDefault();
  const data = new FormData(form);
  Array.from(input.files).forEach(file => data.append("documents", file, file.name));
  const payload = {
    name: data.get("name"),
    phone: data.get("phone"),
    description: data.get("description"),
    documents: Array.from(input.files).map(file => ({ name: file.name, size: file.size })),
    createdAt: new Date().toISOString()
  };
  let response;
  try {
    response = await fetch("/api/requests", { method: "POST", body: data });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error || "Не удалось отправить заявку.");
    }
  } catch (error) {
    if (response) {
      setStatus(error.message || "Не удалось отправить заявку.", "error");
      return;
    }
    window.KurylysRequestQueue?.enqueue(payload);
    setStatus("Нет соединения с сервером. Заявка ожидает автоматической отправки с этого устройства.", "error");
    return;
  }
  setStatus("Заявка принята. Мы свяжемся с вами в ближайшее время.", "success");
  form.reset();
  list.innerHTML = "";
};
prefillSelectedProduct();
