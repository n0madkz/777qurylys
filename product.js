(() => {
  const fallbackProducts = [
    { id: 1, cat: "materials", name: "Керамзитобетонный блок 390×190×188", brand: "KZ Build", image: "https://media.adeo.com/media/2719703/media.png" },
    { id: 2, cat: "materials", name: "Профиль гипсокартонный 60×27", brand: "Knauf", image: "https://media.siniat.de/pi57691/preview/471426647/siniat-cd-profil" },
    { id: 3, cat: "tools", name: "Перфоратор аккумуляторный PRO 20V", brand: "DeWalt", image: "https://mobileimages.lowes.com/productimages/63528a1b-80c9-4744-96fc-8c8a5a5e2e5a/73851761.jpeg?size=xl" }
  ];
  let categoryNames = { materials: "Стройматериалы", tools: "Инструменты", finishing: "Отделка", plumbing: "Сантехника" };
  const defaultSpecs = {
    materials: [["Категория", "Строительный материал"], ["Наличие", "Уточняйте у менеджера"]],
    tools: [["Категория", "Профессиональный инструмент"], ["Наличие", "Уточняйте у менеджера"]],
    finishing: [["Категория", "Отделочные материалы"], ["Наличие", "Уточняйте у менеджера"]],
    plumbing: [["Категория", "Сантехника"], ["Наличие", "Уточняйте у менеджера"]]
  };
  const maxQuantity = 9999;
  let selectedQuantity = 1;
  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const productName = product => typeof product.name === "object" ? (product.name.ru || product.name.kz || product.name.en || product.title || "Товар без названия") : (product.name || product.title || "Товар без названия");
  const productDescription = product => product.description || "Оставьте заявку — менеджер уточнит наличие, комплектацию и подготовит точный расчёт.";
  const localProductImages = {
    "https://media.adeo.com/media/2719703/media.png": "assets/product-block.jpg",
    "https://media.siniat.de/pi57691/preview/471426647/siniat-cd-profil": "assets/product-profile.jpg",
    "https://mobileimages.lowes.com/productimages/63528a1b-80c9-4744-96fc-8c8a5a5e2e5a/73851761.jpeg?size=xl": "assets/product-drill.jpg"
  };
  const productImage = product => localProductImages[product.image] || product.image || "assets/building-materials-hero.png";
  const isProductActive = product => product && product.active !== false;
  const normalizeQuantity = value => {
    const quantity = Math.floor(Number(value));
    return Number.isFinite(quantity) ? Math.min(maxQuantity, Math.max(1, quantity)) : 1;
  };
  function normalizedSpecs(value, category) {
    if (Array.isArray(value) && value.length) return value.map(item => Array.isArray(item) ? [item[0], item[1]] : [item.label || item.name || "Характеристика", item.value || item.text || "—"]);
    if (value && typeof value === "object") return Object.entries(value);
    return defaultSpecs[category] || [["Наличие", "Уточняйте у менеджера"]];
  }
  const siteUrl = "https://kurylys-hypermarket.pages.dev";
  const setSeoValue = (selector, value) => {
    const element = document.head.querySelector(selector);
    if (element) element.setAttribute("content", value);
  };
  const setCanonical = value => {
    const element = document.head.querySelector('link[rel="canonical"]');
    if (element) element.setAttribute("href", value);
  };
  function updateProductSeo(product, name) {
    const url = siteUrl + "/product.html?id=" + encodeURIComponent(product.id);
    const image = new URL(productImage(product), location.origin).href;
    const description = productDescription(product).slice(0, 160);
    document.title = name + " — 777 строительный гипермаркет";
    setSeoValue('meta[name="description"]', description);
    setSeoValue('meta[property="og:title"]', name + " — 777");
    setSeoValue('meta[property="og:description"]', description);
    setSeoValue('meta[property="og:url"]', url);
    setSeoValue('meta[property="og:image"]', image);
    setSeoValue('meta[name="twitter:title"]', name + " — 777");
    setSeoValue('meta[name="twitter:description"]', description);
    setSeoValue('meta[name="twitter:image"]', image);
    setCanonical(url);

    let schema = document.getElementById("productStructuredData");
    if (!schema) {
      schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.id = "productStructuredData";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      image: [image],
      description,
      sku: String(product.id),
      category: categoryNames[product.cat] || "Строительные товары",
      brand: { "@type": "Brand", name: product.brand || product.manufacturer || "777" }
    });
  }
  function setNotFoundSeo() {
    document.title = "Товар не найден — 777 строительный гипермаркет";
    setSeoValue('meta[name="robots"]', "noindex, nofollow");
  }
  function draw(product) {
    const mount = document.getElementById("productDetail");
    if (!product) {
      setNotFoundSeo();
      mount.innerHTML = '<section class="product-not-found"><p class="eyebrow"><span class="eyebrow__line"></span>Каталог</p><h1>Товар не найден</h1><p>Возможно, позиция была удалена или ссылка устарела.</p><a class="button button--primary" href="catalog.html">Вернуться в каталог</a></section>';
      return;
    }
    const name = productName(product);
    const specs = normalizedSpecs(product.specs || product.specifications, product.cat);
    const specMarkup = specs.map(spec => '<div class="product-spec"><dt>' + escapeHtml(spec[0]) + '</dt><dd>' + escapeHtml(spec[1]) + "</dd></div>").join("");
    updateProductSeo(product, name);
    mount.innerHTML =
      '<a class="product-back has-inline-icon" href="catalog.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>Вернуться в каталог</span></a>' +
      '<article class="product-detail">' +
      '<div class="product-detail__left"><div class="product-detail__media"><img src="' + escapeHtml(productImage(product)) + '" alt="' + escapeHtml(name) + '" width="900" height="700" decoding="async" onerror="this.onerror=null;this.src=\'assets/building-materials-hero.png\'"></div><aside class="product-detail__support"><strong>Нужен расчёт?</strong><p>Добавьте товар в корзину и опишите задачу — менеджер поможет подобрать количество и сопутствующие материалы.</p><a href="cart.html">Открыть корзину <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"></path></svg></a></aside></div>' +
      '<div class="product-detail__content"><p class="eyebrow"><span class="eyebrow__line"></span>' + escapeHtml(categoryNames[product.cat] || "Товар") + '</p>' +
      '<p class="product-detail__brand">' + escapeHtml(product.brand || product.manufacturer || "777 Құрылыс") + '</p>' +
      '<h1>' + escapeHtml(name) + '</h1><p class="product-detail__description">' + escapeHtml(productDescription(product)) + '</p>' +
      '<div class="product-detail__actions"><div class="quantity-stepper quantity-stepper--product" role="group" aria-label="Количество товара"><button type="button" data-product-quantity="-1" aria-label="Уменьшить количество">−</button><input type="number" min="1" max="' + maxQuantity + '" value="' + selectedQuantity + '" inputmode="numeric" data-product-quantity-input aria-label="Количество товара"><button type="button" data-product-quantity="1" aria-label="Увеличить количество">+</button></div><button class="button button--primary has-inline-icon product-add-to-cart" type="button" data-add-to-cart="' + escapeHtml(product.id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14l-1 12H6L5 6Z"></path><path d="M9 10h6M9 14h4"></path><path d="M8 6a4 4 0 0 1 8 0"></path></svg><span>Добавить в корзину</span></button><a class="button button--ghost has-inline-icon" href="cart.html"><span>Перейти в корзину</span><b data-cart-count>0</b></a></div><p class="cart-added-feedback" data-cart-feedback role="status" aria-live="polite"></p>' +
      '<section class="product-detail__specs"><h2>Характеристики</h2><dl>' + specMarkup + "</dl></section>" +
      "</div></article>";
    updateCartButton();
  }
  function updateCartButton() {
    const button = document.querySelector("[data-add-to-cart]");
    const feedback = document.querySelector("[data-cart-feedback]");
    if (!button || !window.CartStore) return;
    const quantityInCart = window.CartStore.quantity(button.dataset.addToCart);
    const added = quantityInCart > 0;
    button.classList.toggle("is-in-cart", added);
    button.setAttribute("aria-pressed", String(added));
    button.querySelector("span").textContent = added ? "Добавить ещё" : "Добавить в корзину";
    if (feedback && !added) feedback.textContent = "";
    window.CartStore.refresh();
  }
  document.addEventListener("click", event => {
    const quantityButton = event.target.closest("[data-product-quantity]");
    if (quantityButton) {
      selectedQuantity = normalizeQuantity(selectedQuantity + Number(quantityButton.dataset.productQuantity));
      const input = document.querySelector("[data-product-quantity-input]");
      if (input) input.value = String(selectedQuantity);
      return;
    }
    const button = event.target.closest("[data-add-to-cart]");
    if (!button || !window.CartStore) return;
    const added = window.CartStore.add(button.dataset.addToCart, selectedQuantity);
    const feedback = document.querySelector("[data-cart-feedback]");
    if (feedback) feedback.textContent = "Добавлено: " + selectedQuantity + " шт. В корзине: " + added + " шт.";
    updateCartButton();
  });
  document.addEventListener("change", event => {
    if (!event.target.matches("[data-product-quantity-input]")) return;
    selectedQuantity = normalizeQuantity(event.target.value);
    event.target.value = String(selectedQuantity);
  });
  const id = new URLSearchParams(location.search).get("id");
  const mount = document.getElementById("productDetail");
  if (!id) {
    draw(null);
    return;
  }
  fetch("/api/catalog", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Product catalogue is unavailable");
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data && data.products)) throw new Error("Invalid catalogue response");
      if (Array.isArray(data.categories)) {
        categoryNames = data.categories.reduce((result, category) => {
          result[category.id] = category.name;
          return result;
        }, categoryNames);
      }
      draw(data.products.filter(isProductActive).find(product => String(product.id) === String(id)));
    })
    .catch(() => {
      mount.innerHTML = '<section class="product-not-found"><p class="eyebrow"><span class="eyebrow__line"></span>Каталог</p><h1>Каталог временно недоступен</h1><p>Обновите страницу или попробуйте немного позже.</p><a class="button button--primary" href="catalog.html">Вернуться в каталог</a></section>';
    });
})();
