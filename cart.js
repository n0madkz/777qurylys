(() => {
  const allowed = /\.(pdf|png|jpe?g|xlsx?|docx?)$/i;
  const maxFileSize = 10 * 1024 * 1024;
  const $ = selector => document.querySelector(selector);
  const itemsNode = $("#cartItems");
  const countNode = $("#cartItemsCount");
  const form = $("#cartRequestForm");
  const submit = $("#cartSubmit");
  const input = $("#cartFiles");
  const fileList = $("#cartFileList");
  const status = $("#cartStatus");
  const clientType = $("#cartClientType");
  const legalFields = $("#cartLegalFields");
  const legalRequiredFields = [$("#cartCompanyName"), $("#cartBin"), $("#cartLegalAddress")];
  let products = [];
  let loading = true;
  let loadVersion = 0;

  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const productName = product => typeof product?.name === "object"
    ? (product.name.ru || product.name.kz || product.name.en || product.title || "Товар без названия")
    : (product?.name || product?.title || "Товар без названия");
  const productBrand = product => product?.brand || product?.manufacturer || "777";
  const productImage = product => product?.image || "assets/building-materials-hero.png";
  const categoryLabel = product => product?.cat ? "Категория: " + product.cat : "";
  const selectedProducts = () => {
    const items = window.CartStore ? window.CartStore.get() : [];
    return items.map(item => {
      const product = products.find(candidate => String(candidate.id) === String(item.id)) || item.snapshot;
      return product ? { ...product, cartQuantity: item.quantity } : {
        id:item.id, name:loading ? 'Загружаем товар…' : 'Товар недоступен: ' + item.id,
        cartQuantity:item.quantity, unavailable:true
      };
    });
  };

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = "form-status" + (type ? " is-" + type : "");
  }

  function setClientType(value) {
    const type = value === "legal" ? "legal" : "individual";
    clientType.value = type;
    legalFields.hidden = type !== "legal";
    legalRequiredFields.forEach(field => {
      field.required = type === "legal";
    });
    document.querySelectorAll("[data-cart-client-type]").forEach(button => {
      const active = button.dataset.cartClientType === type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function cartEmptyMarkup() {
    return '<div class="cart-empty"><span class="cart-empty__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14l-1 12H6L5 6Z"></path><path d="M8 6a4 4 0 0 1 8 0"></path></svg></span><b>Корзина пока пуста</b><p>Добавьте нужные товары из каталога.</p></div>';
  }

  function productMarkup(product) {
    const name = productName(product);
    const quantity = Math.max(1, Math.min(9999, Number(product.cartQuantity) || 1));
    return '<article class="cart-item"><a class="cart-item__image" href="product.html?id=' + encodeURIComponent(product.id) + '" aria-label="Открыть товар: ' + escapeHtml(name) + '"><img src="' + escapeHtml(productImage(product)) + '" alt="' + escapeHtml(name) + '" width="160" height="128" loading="lazy" onerror="this.onerror=null;this.src=\'assets/building-materials-hero.png\'"></a><div class="cart-item__content"><span class="cart-item__brand">' + escapeHtml(productBrand(product)) + '</span><a class="cart-item__name" href="product.html?id=' + encodeURIComponent(product.id) + '">' + escapeHtml(name) + '</a><div class="cart-item__meta">' + escapeHtml(categoryLabel(product)) + '</div><div class="quantity-stepper cart-item__quantity" role="group" aria-label="Количество товара ' + escapeHtml(name) + '"><button type="button" data-cart-quantity="' + escapeHtml(product.id) + '" data-quantity-change="-1" aria-label="Уменьшить количество">−</button><input type="number" min="1" max="9999" value="' + quantity + '" inputmode="numeric" data-cart-quantity-input="' + escapeHtml(product.id) + '" aria-label="Количество товара ' + escapeHtml(name) + '"><button type="button" data-cart-quantity="' + escapeHtml(product.id) + '" data-quantity-change="1" aria-label="Увеличить количество">+</button></div></div><button class="cart-remove" type="button" data-remove-cart="' + escapeHtml(product.id) + '" aria-label="Удалить товар ' + escapeHtml(name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></article>';
  }

  function render() {
    const selected = selectedProducts();
    const quantity = selected.reduce((total, product) => total + (Number(product.cartQuantity) || 1), 0);
    countNode.textContent = quantity ? quantity + " " + plural(quantity) : "";
    itemsNode.innerHTML = selected.length ? selected.map(productMarkup).join("") : cartEmptyMarkup();
    const unresolved = selected.some(product => product.unavailable);
    submit.disabled = loading || unresolved;
    if (!loading && unresolved) {
      itemsNode.innerHTML += '<p class="form-status is-error">Не удалось загрузить часть товаров. Повторите загрузку или удалите недоступные позиции.</p><button type="button" class="button button--outline" data-retry-cart>Повторить загрузку</button>';
    }
  }

  function plural(value) {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo > 10 && lastTwo < 20) return "товаров";
    if (last === 1) return "товар";
    if (last > 1 && last < 5) return "товара";
    return "товаров";
  }

  function validateFiles() {
    const invalid = Array.from(input.files).find(file => file.size > maxFileSize || !allowed.test(file.name));
    if (invalid) {
      input.value = "";
      fileList.innerHTML = "";
      setStatus("Файл «" + invalid.name + "» не подходит. Разрешены документы и изображения до 10 МБ.", "error");
      return false;
    }
    fileList.innerHTML = Array.from(input.files).map(file => '<span class="selected-file">' + escapeHtml(file.name) + "</span>").join("");
    setStatus("");
    return true;
  }

  itemsNode.addEventListener("click", event => {
    if (event.target.closest('[data-retry-cart]')) { loadProducts(); return; }
    const button = event.target.closest("[data-remove-cart]");
    if (button && window.CartStore) {
      window.CartStore.remove(button.dataset.removeCart);
      render();
      return;
    }
    const quantityButton = event.target.closest("[data-cart-quantity]");
    if (!quantityButton || !window.CartStore) return;
    const id = quantityButton.dataset.cartQuantity;
    const current = window.CartStore.quantity(id);
    window.CartStore.update(id, current + Number(quantityButton.dataset.quantityChange));
    render();
  });

  itemsNode.addEventListener("change", event => {
    const input = event.target.closest("[data-cart-quantity-input]");
    if (!input || !window.CartStore) return;
    const quantity = Math.max(1, Math.min(9999, Math.floor(Number(input.value) || 1)));
    window.CartStore.update(input.dataset.cartQuantityInput, quantity);
    render();
  });

  input.addEventListener("change", validateFiles);
  document.querySelectorAll("[data-cart-client-type]").forEach(button => {
    button.addEventListener("click", () => setClientType(button.dataset.cartClientType));
  });
  document.addEventListener("kurylys:cart-change", render);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const selected = selectedProducts();
    if (loading || selected.some(product => product.unavailable)) {
      setStatus("Дождитесь загрузки товаров или удалите недоступные позиции.", "error");
      return;
    }
    if (!form.reportValidity() || !validateFiles()) return;

    const payload = new FormData(form);
    const requestProducts = selected.map(product => ({ id: product.id, name: productName(product), brand: productBrand(product), category: product.cat || "", quantity: Math.max(1, Number(product.cartQuantity) || 1) }));
    payload.set("products", JSON.stringify(requestProducts));
    Array.from(input.files).forEach(file => payload.append("documents", file, file.name));
    submit.disabled = true;
    submit.querySelector("span").textContent = "Отправляем…";
    let response;
    try {
      response = await fetch("/api/requests", { method: "POST", body: payload });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Не удалось отправить заявку. Проверьте данные и повторите попытку.");
      }
      if (window.CartStore) window.CartStore.clear();
      form.reset();
      setClientType("individual");
      fileList.innerHTML = "";
      render();
      setStatus("Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "success");
    } catch (error) {
      if (response) {
        setStatus(error.message || "Не удалось отправить заявку.", "error");
        return;
      }
      window.KurylysRequestQueue?.enqueue({ name: payload.get("name"), phone: payload.get("phone"), email: payload.get("email"), clientType: payload.get("clientType"), companyName: payload.get("companyName"), bin: payload.get("bin"), iik: payload.get("iik"), bik: payload.get("bik"), bankName: payload.get("bankName"), legalAddress: payload.get("legalAddress"), position: payload.get("position"), description: payload.get("description"), products: requestProducts, documents: Array.from(input.files).map(file => ({ name: file.name, size: file.size })), createdAt: new Date().toISOString() });
      setStatus("Нет соединения с сервером. Заявка ожидает автоматической отправки с этого устройства.", "error");
      submit.disabled = false;
    } finally {
      submit.disabled = false;
      submit.querySelector("span").textContent = "Отправить заявку";
    }
  });

  async function loadProducts() {
    const version = ++loadVersion;
    loading = true;
    render();
    const entries = window.CartStore?.get() || [];
    const resolved = [];
    // Resolve only the selected IDs; do not depend on a full catalogue response.
    for (let start = 0; start < entries.length; start += 5) {
      await Promise.all(entries.slice(start,start+5).map(async item => {
        const controller = new AbortController();
        const timer = setTimeout(()=>controller.abort(),15000);
        try {
          const response = await fetch('/api/product?id=' + encodeURIComponent(item.id), {cache:'no-store',signal:controller.signal});
          if (!response.ok) return;
          const data = await response.json();
          if (data.product && String(data.product.id) === String(item.id)) {
            resolved.push(data.product);
            if (version === loadVersion) { products = resolved.slice(); render(); }
          }
        } catch (_) {} finally {
          clearTimeout(timer);
          if (item.snapshot && !resolved.some(product=>String(product.id)===String(item.id))) resolved.push({...item.snapshot,unavailable:true});
        }
      }));
    }
    if (version !== loadVersion) return;
    products = resolved;
    loading = false;
    render();
  }

  window.addEventListener('storage', event => { if (event.key === 'kurylys_cart') loadProducts(); });

  render();
  setClientType(clientType.value);
  loadProducts();
})();
