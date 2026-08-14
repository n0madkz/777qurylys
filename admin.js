(() => {
  const seedProducts = [
    { id: 1, name: "Керамзитобетонный блок 390×190×188", brand: "KZ Build", cat: "materials", image: "assets/product-block.jpg" },
    { id: 2, name: "Профиль гипсокартонный 60×27", brand: "Knauf", cat: "materials", image: "assets/product-profile.jpg" },
    { id: 3, name: "Перфоратор аккумуляторный PRO 20V", brand: "DeWalt", cat: "tools", image: "assets/product-drill.jpg" }
  ];

  const defaultCategories = [
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

  const defaultHeroSlides = [
    { id: "standard-materials", src: "assets/building-materials-hero.png", width: 1920, height: 1080, label: "Стандартный фон" }
  ];
  const maxHeroSlides = 5;
  const maxHeroSourceSize = 15 * 1024 * 1024;
  const maxStoredHeroSize = 1400 * 1024;

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));

  const cloneCategories = list => list.map(item => ({
    id: String(item.id),
    name: String(item.name),
    parent: String(item.parent || "")
  }));

  const cloneHeroSlides = list => (Array.isArray(list) ? list : []).map(item => ({
    id: String(item?.id || ""),
    src: String(item?.src || ""),
    width: Number(item?.width) || 1920,
    height: Number(item?.height) || 1080,
    label: String(item?.label || "Фон баннера")
  })).filter(item => item.id && item.src);

  const productName = product => {
    if (product && typeof product.name === "object") {
      return product.name.ru || product.name.kz || product.name.en || product.title || "Товар без названия";
    }
    return product && (product.name || product.title) || "Товар без названия";
  };

  const productId = product => String(product && product.id != null ? product.id : "");
  const isProductActive = product => !product || product.active !== false;
  const requestQuantity = value => Math.min(9999, Math.max(1, Math.floor(Number(value) || 1)));

  const specRows = product => {
    const specs = product && (product.specs || product.specifications);
    if (Array.isArray(specs)) {
      return specs.map(item => Array.isArray(item)
        ? [item[0], item[1]]
        : [item.label || item.name || "Характеристика", item.value || item.text || ""]);
    }
    if (specs && typeof specs === "object") return Object.entries(specs);
    return [];
  };

  const specsToText = product => specRows(product)
    .map(item => String(item[0]).trim() + ": " + String(item[1]).trim())
    .join("\n");

  const specsFromText = value => String(value || "").split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const divider = line.indexOf(":");
      return divider > -1
        ? { label: line.slice(0, divider).trim(), value: line.slice(divider + 1).trim() }
        : { label: "Характеристика", value: line };
    });

  const importColumns = {
    name: ["название", "наименование", "товар", "name", "title", "product"],
    brand: ["бренд", "производитель", "brand", "manufacturer"],
    category: ["категория", "category", "cat"],
    image: ["изображение", "image", "image url", "url", "фото"],
    description: ["описание", "description"],
    specs: ["характеристики", "характеристика", "specs", "specifications"]
  };
  const maxImportRows = 5000;

  const normaliseImportColumn = value => String(value || "").toLowerCase().trim()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

  function parseCsvRows(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const firstLine = source.split(/\r?\n/).find(line => line.trim()) || "";
    const delimiters = [",", ";", "\t"];
    const delimiter = delimiters.reduce((winner, candidate) =>
      firstLine.split(candidate).length > firstLine.split(winner).length ? candidate : winner, ",");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"') {
          if (source[index + 1] === '"') {
            cell += '"';
            index += 1;
          } else {
            quoted = false;
          }
        } else {
          cell += char;
        }
        continue;
      }
      if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        row.push(cell.trim());
        cell = "";
      } else if (char === "\r") {
        continue;
      } else if (char === "\n") {
        row.push(cell.trim());
        if (row.some(value => value)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some(value => value)) rows.push(row);
    return rows;
  }

  function importColumnValue(row, columns, aliases) {
    const index = columns.findIndex(column => aliases.includes(column));
    return index > -1 ? String(row[index] || "").trim() : "";
  }

  function categoryForImport(value) {
    const candidate = String(value || "").trim().toLocaleLowerCase("ru");
    const category = categories.find(item => item.id.toLocaleLowerCase("ru") === candidate ||
      item.name.trim().toLocaleLowerCase("ru") === candidate);
    return category ? category.id : (categories.find(item => item.id === "materials") || categories[0] || {}).id || "";
  }

  function nextProductId() {
    return products.reduce((highest, product) => {
      const value = Number(product && product.id);
      return Number.isSafeInteger(value) && value > highest ? value : highest;
    }, 0) + 1;
  }

  function parseImportedProducts(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) throw new Error("В файле должна быть строка с названиями колонок и хотя бы один товар.");

    const columns = rows[0].map(normaliseImportColumn);
    if (!importColumns.name.some(alias => columns.includes(alias))) {
      throw new Error("Не найдена колонка «Название». Скачайте шаблон CSV и заполните его.");
    }

    let nextId = nextProductId();
    let skipped = 0;
    const imported = [];
    const rowsToImport = rows.slice(1, maxImportRows + 1);
    rowsToImport.forEach(row => {
      const name = importColumnValue(row, columns, importColumns.name);
      if (!name) {
        skipped += 1;
        return;
      }
      const specifications = importColumnValue(row, columns, importColumns.specs);
      imported.push({
        id: String(nextId++),
        name,
        brand: importColumnValue(row, columns, importColumns.brand),
        cat: categoryForImport(importColumnValue(row, columns, importColumns.category)),
        image: importColumnValue(row, columns, importColumns.image),
        description: importColumnValue(row, columns, importColumns.description),
        specs: specifications ? specsFromText(specifications.replace(/\s*\|\s*/g, "\n")) : [],
        active: false
      });
    });
    if (rows.length - 1 > maxImportRows) skipped += rows.length - 1 - maxImportRows;
    return { imported, skipped };
  }

  const transliteration = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i"
  };

  const slugify = value => String(value || "").toLowerCase()
    .split("")
    .map(char => transliteration[char] === undefined ? char : transliteration[char])
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  let products = JSON.parse(localStorage.getItem("kurylys_products") || "null") || seedProducts;
  let settings = JSON.parse(localStorage.getItem("kurylys_settings") || "null") || {
    phone: "+7 775 824 43 80",
    email: "info@777.kz",
    address: "г. Атырау, ул. Гинаят Абдрахманов, 85в",
    heroSlides: cloneHeroSlides(defaultHeroSlides)
  };
  let categories = JSON.parse(localStorage.getItem("kurylys_categories") || "null") || cloneCategories(defaultCategories);
  let requests = JSON.parse(localStorage.getItem("kurylys_admin_requests_cache") || "[]");
  let editingRequestProducts = [];
  let adminProductsPage = 1;
  const adminPageSize = 30;
  let selectedProductIds = new Set();

  function ensureHeroSlides() {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) settings = {};
    if (!Object.prototype.hasOwnProperty.call(settings, "heroSlides")) {
      settings.heroSlides = cloneHeroSlides(defaultHeroSlides);
    } else {
      settings.heroSlides = cloneHeroSlides(settings.heroSlides);
    }
  }

  ensureHeroSlides();

  function categoryMap() {
    return new Map(categories.map(category => [category.id, category]));
  }

  function roots() {
    return categories.filter(category => !category.parent);
  }

  function childrenOf(id) {
    return categories.filter(category => category.parent === id);
  }

  function categoryProductCount(id) {
    const ids = new Set([id]);
    const pending = [id];
    while (pending.length) {
      const parent = pending.pop();
      childrenOf(parent).forEach(category => {
        if (!ids.has(category.id)) {
          ids.add(category.id);
          pending.push(category.id);
        }
      });
    }
    return products.filter(product => ids.has(product.cat)).length;
  }

  function categoryLabel(id) {
    const map = categoryMap();
    const category = map.get(id);
    if (!category) return id || "Без категории";
    const parent = map.get(category.parent);
    return parent ? parent.name + " → " + category.name : category.name;
  }

  function categoryOptions(selectedId, parentOnly, excludeId) {
    const map = categoryMap();
    const makeOption = category => {
      const selected = category.id === selectedId ? " selected" : "";
      const prefix = category.parent ? "— " : "";
      return '<option value="' + escapeHtml(category.id) + '"' + selected + ">" +
        escapeHtml(prefix + category.name) + "</option>";
    };

    const allowed = parentOnly
      ? roots().filter(category => category.id !== excludeId)
      : categories.filter(category => category.id !== excludeId && (!category.parent || map.has(category.parent)));

    return allowed.map(makeOption).join("");
  }

  function syncProductCategories(selectedId) {
    const select = $("#productCategory");
    select.innerHTML = categoryOptions(selectedId);
    if (!select.value && categories[0]) select.value = categories[0].id;
  }

  function syncCategoryParents(selectedId, excludeId) {
    const select = $("#categoryParent");
    select.innerHTML = '<option value="">Верхний уровень</option>' + categoryOptions(selectedId, true, excludeId);
  }

  function saveLocal() {
    localStorage.setItem("kurylys_products", JSON.stringify(products));
    const localSettings = { ...settings };
    delete localSettings.heroSlides;
    localStorage.setItem("kurylys_settings", JSON.stringify(localSettings));
    localStorage.setItem("kurylys_categories", JSON.stringify(categories));
  }

  async function loadRemote() {
    try {
      const response = await fetch("/api/admin/products", {
        credentials: "same-origin",
        cache: "no-store"
      });
      if (response.status === 401) {
        window.location.replace("/admin-login.html");
        return;
      }
      if (!response.ok) throw new Error("Не удалось загрузить каталог");
      const data = await response.json();
      if (Array.isArray(data.products)) products = data.products;
      if (data.settings && typeof data.settings === "object") settings = data.settings;
      ensureHeroSlides();
      if (Array.isArray(data.categories) && data.categories.length) categories = cloneCategories(data.categories);
      saveLocal();
    } catch (error) {
      console.warn(error);
    }
  }

  async function saveRemote() {
    const response = await fetch("/api/admin/products", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ products, settings, categories })
    });

    if (!response.ok) throw new Error("Сервер не сохранил изменения");
    const data = await response.json();
    if (Array.isArray(data.categories) && data.categories.length) categories = cloneCategories(data.categories);
    saveLocal();
  }

  async function loadRequests() {
    try {
      const response = await fetch("/api/admin/requests", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        window.location.replace("/admin-login.html");
        return;
      }
      if (!response.ok) throw new Error("Не удалось загрузить заявки");
      const data = await response.json();
      if (Array.isArray(data.requests)) {
        requests = data.requests;
        localStorage.setItem("kurylys_admin_requests_cache", JSON.stringify(requests));
      }
    } catch (error) {
      console.warn(error);
    }
  }

  function saveRequestsLocal() {
    localStorage.setItem("kurylys_admin_requests_cache", JSON.stringify(requests));
  }

  async function mutateRequest(method, payload, id) {
    const url = id ? "/api/admin/requests?id=" + encodeURIComponent(id) : "/api/admin/requests";
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: method === "PUT" ? { "content-type": "application/json" } : undefined,
      body: method === "PUT" ? JSON.stringify(payload) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Не удалось обновить заявку");
    if (Array.isArray(data.requests)) {
      requests = data.requests;
      saveRequestsLocal();
    }
    return data;
  }

  function setStatus(id, message, success) {
    const status = $(id);
    if (!status) return;
    status.textContent = message;
    status.className = "form-status " + (success ? "is-success" : "is-error");
  }

  function openProductForm(product) {
    $("#productForm").hidden = false;
    $("#productFormTitle").textContent = product ? "Редактирование товара" : "Новый товар";
    $("#editId").value = product ? product.id : "";
    $("#productName").value = product ? productName(product) : "";
    $("#productBrand").value = product ? product.brand || product.manufacturer || "" : "";
    $("#productImage").value = product ? product.image || "" : "";
    $("#productDescription").value = product ? product.description || "" : "";
    $("#productSpecs").value = product ? specsToText(product) : "";
    $("#productActive").checked = product ? isProductActive(product) : true;
    $("#productStatus").className = "form-status";
    $("#productStatus").textContent = "";
    syncProductCategories(product ? product.cat : "materials");
    $("#productName").focus();
  }

  function closeProductForm() {
    $("#productForm").hidden = true;
  }

  function filteredAdminProducts() {
    const query = ($("#adminProductSearch").value || "").trim().toLowerCase();
    if (!query) return products;
    return products.filter(product => {
      return (productName(product) + " " + (product.brand || product.manufacturer || ""))
        .toLowerCase()
        .includes(query);
    });
  }

  function visibleAdminProducts() {
    const list = filteredAdminProducts();
    const pages = Math.max(1, Math.ceil(list.length / adminPageSize));
    adminProductsPage = Math.min(adminProductsPage, pages);
    const start = (adminProductsPage - 1) * adminPageSize;
    return { list, pages, visible: list.slice(start, start + adminPageSize) };
  }

  function pruneProductSelection() {
    const available = new Set(products.map(productId));
    selectedProductIds.forEach(id => {
      if (!available.has(id)) selectedProductIds.delete(id);
    });
  }

  function syncBulkProductTools(visible) {
    pruneProductSelection();
    const selected = selectedProductIds.size;
    const toolbar = $("#adminBulkTools");
    const label = $("#adminSelectedProducts");
    if (toolbar) toolbar.hidden = selected === 0;
    if (label) label.textContent = "Выбрано: " + selected;

    const selectAll = $("#selectProductsPage");
    if (!selectAll) return;
    const selectedOnPage = visible.filter(product => selectedProductIds.has(productId(product))).length;
    selectAll.disabled = visible.length === 0;
    selectAll.checked = visible.length > 0 && selectedOnPage === visible.length;
    selectAll.indeterminate = selectedOnPage > 0 && selectedOnPage < visible.length;
  }

  function pageButtons(page, pages, action) {
    if (pages < 2) return "";
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, start + 4);
    let markup = '<button type="button" data-' + action + '="' + (page - 1) + '" ' +
      (page === 1 ? "disabled" : "") + ' aria-label="Предыдущая страница">Назад</button>';
    for (let item = start; item <= end; item += 1) {
      markup += '<button type="button" data-' + action + '="' + item + '"' +
        (item === page ? ' class="active" aria-current="page"' : "") + ">" + item + "</button>";
    }
    markup += '<button type="button" data-' + action + '="' + (page + 1) + '" ' +
      (page === pages ? "disabled" : "") + ' aria-label="Следующая страница">Далее</button>';
    return markup;
  }

  function drawProducts() {
    const { pages, visible } = visibleAdminProducts();

    $("#productsTable").innerHTML = visible.map(product => {
      const imageLabel = product.image ? "Есть" : "Нет";
      const id = productId(product);
      const active = isProductActive(product);
      const checked = selectedProductIds.has(id) ? " checked" : "";
      const activeChecked = active ? " checked" : "";
      return '<tr class="' + (active ? "" : "is-inactive") + '"><td class="admin-select-column"><label class="admin-row-select">' +
        '<input type="checkbox" data-select-product="' + escapeHtml(id) + '"' + checked +
        ' aria-label="Выбрать товар: ' + escapeHtml(productName(product)) + '"></label></td><td><b>' +
        escapeHtml(productName(product)) + '</b><small>' +
        escapeHtml(product.brand || product.manufacturer || "") + "</small></td><td>" +
        escapeHtml(categoryLabel(product.cat)) + '</td><td><label class="admin-status-switch admin-status-switch--row">' +
        '<input type="checkbox" data-active-product="' + escapeHtml(id) + '"' + activeChecked +
        ' aria-label="' + (active ? "Скрыть" : "Показать") + ' товар"><span class="admin-status-switch__track" aria-hidden="true"></span>' +
        '<span class="admin-status-switch__label">' + (active ? "Активен" : "Скрыт") + '</span></label></td><td>' + imageLabel +
        '</td><td><button class="table-action" type="button" data-edit="' + escapeHtml(id) +
        '">Изменить</button><button class="table-action danger" type="button" data-delete="' +
        escapeHtml(id) + '">Удалить</button></td></tr>';
    }).join("") || '<tr><td colspan="6">Товары не найдены.</td></tr>';

    $("#adminProductsPagination").innerHTML = pageButtons(adminProductsPage, pages, "admin-page");
    syncBulkProductTools(visible);
  }

  function drawCategories() {
    const map = categoryMap();
    const groups = roots().map(root => {
      const rootProducts = categoryProductCount(root.id);
      const children = childrenOf(root.id);
      const childrenMarkup = children.length
        ? '<div class="category-admin-children">' + children.map(category => {
          const count = categoryProductCount(category.id);
          return categoryRow(category, root.name, count);
        }).join("") + "</div>"
        : "";
      return '<section class="category-admin-group"><div class="category-admin-group__title">' +
        '<span>Раздел</span></div>' + categoryRow(root, "", rootProducts) + childrenMarkup + "</section>";
    }).join("");

    const orphaned = categories.filter(category => category.parent && !map.has(category.parent));
    const orphanedMarkup = orphaned.length
      ? '<section class="category-admin-group"><div class="category-admin-group__title"><span>Другие</span></div>' +
        orphaned.map(category => categoryRow(category, "", categoryProductCount(category.id))).join("") +
        "</section>"
      : "";

    $("#categoriesList").innerHTML = groups + orphanedMarkup || '<div class="admin-note"><b>Категорий пока нет</b></div>';
  }

  function categoryRow(category, parentName, productCount) {
    const hierarchy = parentName ? parentName + " → " + category.name : category.name;
    return '<article class="category-admin-row"><div><b>' + escapeHtml(hierarchy) + '</b><small>ID: ' +
      escapeHtml(category.id) + " · " + productCount + " " + pluralItems(productCount) +
      '</small></div><div><button class="table-action" type="button" data-edit-category="' +
      escapeHtml(category.id) + '">Изменить</button><button class="table-action danger" type="button" data-delete-category="' +
      escapeHtml(category.id) + '">Удалить</button></div></article>';
  }

  function pluralItems(value) {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo > 10 && lastTwo < 20) return "товаров";
    if (last === 1) return "товар";
    if (last > 1 && last < 5) return "товара";
    return "товаров";
  }

  function openCategoryForm(category) {
    $("#categoryForm").hidden = false;
    $("#categoryFormTitle").textContent = category ? "Редактирование категории" : "Новая категория";
    $("#categoryEditId").value = category ? category.id : "";
    $("#categoryName").value = category ? category.name : "";
    $("#categoryId").value = category ? category.id : "";
    $("#categoryId").readOnly = true;
    $("#categoryId").classList.add("is-readonly");
    syncCategoryParents(category ? category.parent : "", category ? category.id : "");
    $("#categoryStatus").className = "form-status";
    $("#categoryStatus").textContent = "";
    $("#categoryName").focus();
  }

  function closeCategoryForm() {
    $("#categoryForm").hidden = true;
  }

  function clearStatus(id) {
    const status = $(id);
    if (!status) return;
    status.textContent = "";
    status.className = "form-status";
  }

  function openRequestForm(request) {
    if (!request || !request.id) return;
    editingRequestProducts = Array.isArray(request.products) ? request.products.map(product => ({
      id: String(product && product.id != null ? product.id : ""),
      name: productName(product),
      brand: String(product && (product.brand || product.manufacturer) || ""),
      category: String(product && (product.category || product.cat) || ""),
      quantity: requestQuantity(product && product.quantity)
    })) : [];
    $("#requestForm").hidden = false;
    $("#requestEditId").value = request.id;
    $("#requestName").value = request.name || "";
    $("#requestPhone").value = request.phone || "";
    $("#requestEmail").value = request.email || "";
    $("#requestCompanyName").value = request.companyName || "";
    $("#requestBin").value = request.bin || "";
    $("#requestLegalAddress").value = request.legalAddress || "";
    $("#requestPosition").value = request.position || "";
    setRequestClientType(request.clientType);
    $("#requestDescription").value = request.description || "";
    drawRequestProductsEditor();
    clearStatus("#requestFormStatus");
    $("#requestForm").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
    $("#requestName").focus();
  }

  function closeRequestForm() {
    $("#requestForm").hidden = true;
    $("#requestForm").reset();
    editingRequestProducts = [];
    drawRequestProductsEditor();
    clearStatus("#requestFormStatus");
  }

  function setRequestClientType(value) {
    const type = value === "legal" ? "legal" : "individual";
    $("#requestClientType").value = type;
    $("#requestLegalFields").hidden = type !== "legal";
    [$("#requestCompanyName"), $("#requestBin"), $("#requestLegalAddress")].forEach(field => {
      field.required = type === "legal";
    });
  }

  function drawRequestProductsEditor() {
    const list = $("#requestProductsEditorList");
    const count = $("#requestProductsEditorCount");
    if (!list || !count) return;
    const total = editingRequestProducts.reduce((sum, product) => sum + requestQuantity(product.quantity), 0);
    count.textContent = editingRequestProducts.length ? total + " ед." : "Без товаров";
    list.innerHTML = editingRequestProducts.length
      ? editingRequestProducts.map((product, index) => {
        const name = escapeHtml(productName(product));
        const brand = escapeHtml(product.brand || "");
        const quantity = requestQuantity(product.quantity);
        return '<label class="request-editor-product"><span class="request-editor-product__info"><b title="' + name + '">' + name + '</b>' +
          (brand ? '<small>' + brand + '</small>' : "") +
          '</span><span class="request-editor-product__quantity"><span>Количество</span><input type="number" min="1" max="9999" step="1" inputmode="numeric" value="' + quantity + '" data-request-product-quantity="' + index + '" aria-label="Количество: ' + name + '"></span></label>';
      }).join("")
      : '<p class="request-editor-products__empty">К этой заявке пока не добавлены товары. Её можно сохранить и без позиций.</p>';
  }

  function requestProductsFromEditor() {
    return editingRequestProducts.map((product, index) => {
      const field = document.querySelector('[data-request-product-quantity="' + index + '"]');
      return { ...product, quantity: requestQuantity(field ? field.value : product.quantity) };
    });
  }

  function whatsappLink(phone, name) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    const number = digits.length === 10 ? "7" + digits : (digits.length === 11 && digits.startsWith("8") ? "7" + digits.slice(1) : digits);
    const message = encodeURIComponent("Здравствуйте, " + (name || "") + "! Пишем по вашей заявке в 777.");
    return "https://wa.me/" + number + "?text=" + message;
  }

  function formatDocumentSize(value) {
    const size = Number(value) || 0;
    if (!size) return "Размер не указан";
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " КБ";
    const megabytes = size / (1024 * 1024);
    return megabytes.toFixed(megabytes >= 10 ? 0 : 1).replace(".", ",") + " МБ";
  }

  function documentsMarkup(documents) {
    if (!Array.isArray(documents) || !documents.length) return "";
    return '<section class="request-documents"><b class="request-documents__title">Прикреплённые документы</b><div class="request-documents__list">' +
      documents.map(document => {
        const name = escapeHtml(document && document.name ? document.name : "Файл");
        const size = escapeHtml(formatDocumentSize(document && document.size));
        const rawUrl = String(document && document.url || "");
        const url = /^\/api\/document\?id=[a-f0-9-]+$/i.test(rawUrl) ? rawUrl : "";
        const content = '<span class="request-document__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span><span class="request-document__name" title="' + name + '">' + name + '</span><small class="request-document__size">' + size + "</small>";
        return url
          ? '<a class="request-document" href="' + url + '" title="Скачать документ">' + content + "</a>"
          : '<div class="request-document">' + content + "</div>";
      }).join("") + "</div></section>";
  }

  function requestProductsMarkup(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return '<section class="request-products"><b class="request-products__title">Товары в заявке</b><ul class="request-products__list">' +
      items.map(product => {
        const name = escapeHtml(productName(product));
        const brand = escapeHtml(product && (product.brand || product.manufacturer) || "");
        const quantity = Math.max(1, Number(product && product.quantity) || 1);
        return '<li class="request-product"><div><b>' + name + '</b>' +
          (brand ? '<small>' + brand + '</small>' : "") +
          '</div><span>Количество: <strong>' + quantity + "</strong></span></li>";
      }).join("") + "</ul></section>";
  }

  function requestContactsMarkup(request) {
    const phone = String(request && request.phone || "");
    const name = String(request && request.name || "Клиент");
    const whatsapp = whatsappLink(phone, name);
    const rows = [
      phone ? '<div class="request-contact-row"><span>Телефон</span>' + (whatsapp
        ? '<a class="request-phone request-whatsapp" href="' + escapeHtml(whatsapp) + '" target="_blank" rel="noopener noreferrer" aria-label="Написать ' + escapeHtml(name) + ' в WhatsApp">' + escapeHtml(phone) + '<small>Написать в WhatsApp</small></a>'
        : '<b class="request-phone">' + escapeHtml(phone) + '</b>') + '</div>' : "",
      request && request.email ? '<div class="request-contact-row"><span>Почта</span><a href="mailto:' + escapeHtml(request.email) + '">' + escapeHtml(request.email) + '</a></div>' : "",
      request && request.clientType === "legal" && request.companyName ? '<div class="request-contact-row"><span>Юр. лицо</span><b>' + escapeHtml(request.companyName) + (request.bin ? ' · БИН ' + escapeHtml(request.bin) : "") + '</b></div>' : "",
      request && request.clientType === "legal" && request.position ? '<div class="request-contact-row"><span>Должность</span><b>' + escapeHtml(request.position) + '</b></div>' : "",
      request && request.clientType === "legal" && request.legalAddress ? '<div class="request-contact-row"><span>Адрес</span><b>' + escapeHtml(request.legalAddress) + '</b></div>' : ""
    ].filter(Boolean);
    return rows.length ? '<section class="request-contacts"><b class="request-contacts__title">Контакты клиента</b><div class="request-contact-list">' + rows.join("") + '</div></section>' : "";
  }

  function requestDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Дата не указана" : date.toLocaleString("ru-RU");
  }

  function drawRequests() {
    $("#requestsList").innerHTML = requests.length
      ? requests.map(request => {
        const products = Array.isArray(request.products) ? request.products : [];
        const productQuantity = products.reduce((total, product) => total + Math.max(1, Number(product && product.quantity) || 1), 0);
        const documents = Array.isArray(request.documents) ? request.documents : [];
        const requestId = escapeHtml(request.id || "");
        const name = escapeHtml(request.name || "Клиент");
        const phone = escapeHtml(request.phone || "Телефон не указан");
        const whatsapp = whatsappLink(request.phone, request.name);
        const phoneMarkup = whatsapp
          ? '<a class="request-summary__phone request-whatsapp" href="' + escapeHtml(whatsapp) + '" target="_blank" rel="noopener noreferrer" aria-label="Написать ' + name + ' в WhatsApp">' + phone + '<small>WhatsApp</small></a>'
          : '<span class="request-summary__phone">' + phone + '</span>';
        return '<article class="request-item"><details class="request-accordion"><summary class="request-accordion__summary"><span class="request-summary__main"><b>' + name + '</b>' + phoneMarkup + '</span><span class="request-summary__meta"><small>' + requestDate(request.createdAt) + '</small><strong>' + products.length + ' поз. · ' + productQuantity + ' ед.</strong></span></summary><div class="request-accordion__content"><div class="request-summary-line"><span>' + products.length + ' позиций · ' + productQuantity + ' ед. · ' + documents.length + ' прикреплённых файлов</span></div><p class="request-description">' + escapeHtml(request.description || "Без описания") + '</p>' + requestContactsMarkup(request) + requestProductsMarkup(products) + documentsMarkup(documents) + '<div class="request-item__actions"><button class="request-action" type="button" data-edit-request="' + requestId + '">Изменить заявку</button><button class="request-action request-action--danger" type="button" data-delete-request="' + requestId + '">Удалить</button></div></div></details></article>';
      }).join("")
      : '<div class="admin-note"><b>Заявок пока нет</b><p>Новые запросы клиентов появятся здесь.</p></div>';
    return requests;
  }

  function drawStats() {
    const requests = drawRequests();
    $("#statProducts").textContent = products.length;
    $("#statCategories").textContent = categories.length;
    $("#statRequests").textContent = requests.length;
    $("#statFiles").textContent = requests.reduce((count, request) => {
      return count + (request.documents ? request.documents.length : 0);
    }, 0);
  }

  function drawHeroSlides() {
    const list = $("#heroSlidesList");
    const counter = $("#heroSlidesCount");
    if (!list || !counter) return;
    const slides = cloneHeroSlides(settings.heroSlides);
    counter.textContent = slides.length + " / " + maxHeroSlides;
    list.innerHTML = slides.length
      ? slides.map((slide, index) => {
        const title = escapeHtml(slide.label || "Фон " + (index + 1));
        const src = escapeHtml(slide.src);
        const id = escapeHtml(slide.id);
        const dimensions = escapeHtml((slide.width || 1920) + " × " + (slide.height || 1080) + " px");
        const position = index + 1;
        const canMoveUp = index > 0;
        const canMoveDown = index < slides.length - 1;
        return '<article class="hero-slide-admin"><img class="hero-slide-admin__preview" src="' + src + '" alt="' + title + '"><div class="hero-slide-admin__body"><div class="hero-slide-admin__details"><span class="hero-slide-admin__position">' + position + '</span><div><b title="' + title + '">' + title + '</b><small>' + dimensions + ' · WebP</small></div></div><div class="hero-slide-admin__controls"><button class="hero-slide-admin__move" type="button" data-move-hero-slide="' + id + '" data-direction="-1" aria-label="Поднять фон ' + position + ' в очереди" title="Выше в очереди"' + (canMoveUp ? '' : ' disabled') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></button><button class="hero-slide-admin__move" type="button" data-move-hero-slide="' + id + '" data-direction="1" aria-label="Опустить фон ' + position + ' в очереди" title="Ниже в очереди"' + (canMoveDown ? '' : ' disabled') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg></button><button class="hero-slide-admin__remove" type="button" data-remove-hero-slide="' + id + '" aria-label="Удалить фон ' + position + '" title="Удалить фон"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div></article>';
      }).join("")
      : '<div class="admin-note"><b>Дополнительных фонов нет</b><p>На главной странице будет показан стандартный фон.</p></div>';
  }

  const canvasToWebp = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Не удалось подготовить изображение")), "image/webp", quality);
  });

  const blobToDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(blob);
  });

  const loadLocalImage = file => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть изображение"));
    };
    image.src = url;
  });

  async function prepareHeroSlide(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      throw new Error("Выберите изображение в формате JPG, PNG или WebP.");
    }
    if (file.size > maxHeroSourceSize) {
      throw new Error("Исходный файл не должен быть больше 15 МБ.");
    }

    const image = await loadLocalImage(file);
    if (image.naturalWidth < 1600 || image.naturalHeight < 900) {
      throw new Error("Изображение должно быть не меньше 1600 × 900 px.");
    }

    const width = 1920;
    const height = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

    let quality = 0.84;
    let blob = await canvasToWebp(canvas, quality);
    while (blob.size > maxStoredHeroSize && quality > 0.56) {
      quality -= 0.07;
      blob = await canvasToWebp(canvas, quality);
    }
    if (blob.size > maxStoredHeroSize) {
      throw new Error("Изображение слишком детализированное. Сожмите его перед загрузкой.");
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : "hero-" + Date.now(),
      src: await blobToDataUrl(blob),
      width,
      height,
      label: file.name.replace(/\.[^.]+$/, "").trim().slice(0, 60) || "Новый фон"
    };
  }

  async function persistHeroSlides(message) {
    try {
      await saveRemote();
      drawHeroSlides();
      setStatus("#heroSlidesStatus", message, true);
      return true;
    } catch (error) {
      setStatus("#heroSlidesStatus", error.message || "Не удалось сохранить фоны.", false);
      return false;
    }
  }

  async function persistAndRefresh(statusSelector, successMessage) {
    try {
      await saveRemote();
      drawProducts();
      drawCategories();
      drawStats();
      setStatus(statusSelector, successMessage, true);
      return true;
    } catch (error) {
      setStatus(statusSelector, error.message || "Не удалось сохранить изменения", false);
      return false;
    }
  }

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(item => item.classList.toggle("active", item === tab));
      document.querySelectorAll("[data-panel]").forEach(panel => {
        panel.hidden = panel.dataset.panel !== tab.dataset.tab;
      });
      if (tab.dataset.tab === "products") drawProducts();
      if (tab.dataset.tab === "categories") drawCategories();
      if (tab.dataset.tab === "requests") drawRequests();
    });
  });

  $("#newProduct").addEventListener("click", () => openProductForm(null));
  $("#cancelProduct").addEventListener("click", closeProductForm);
  $("#newCategory").addEventListener("click", () => openCategoryForm(null));
  $("#cancelCategory").addEventListener("click", closeCategoryForm);
  $("#cancelRequest").addEventListener("click", closeRequestForm);
  $("#adminLogout").addEventListener("click", async event => {
    const button = event.currentTarget;
    const label = button.querySelector("span");
    button.disabled = true;
    if (label) label.textContent = "Выход…";
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Не удалось завершить сессию");
      window.location.replace("/admin-login");
    } catch (error) {
      button.disabled = false;
      if (label) label.textContent = "Выйти";
      window.alert(error.message || "Не удалось выйти из админ-панели. Попробуйте ещё раз.");
    }
  });
  $("#requestClientType").addEventListener("change", event => setRequestClientType(event.target.value));
  $("#requestProductsEditorList").addEventListener("change", event => {
    const input = event.target.closest("[data-request-product-quantity]");
    if (!input) return;
    const index = Number(input.dataset.requestProductQuantity);
    if (!Number.isInteger(index) || !editingRequestProducts[index]) return;
    editingRequestProducts[index].quantity = requestQuantity(input.value);
    input.value = editingRequestProducts[index].quantity;
    drawRequestProductsEditor();
  });

  $("#requestsList").addEventListener("click", async event => {
    if (event.target.closest(".request-whatsapp")) return;
    const edit = event.target.closest("[data-edit-request]");
    const remove = event.target.closest("[data-delete-request]");
    if (edit) {
      const request = requests.find(item => String(item.id) === String(edit.dataset.editRequest));
      if (request) openRequestForm(request);
      return;
    }
    if (!remove) return;
    const request = requests.find(item => String(item.id) === String(remove.dataset.deleteRequest));
    if (!request || !window.confirm('Удалить заявку от «' + (request.name || "клиента") + '»? Это действие нельзя отменить.')) return;

    remove.disabled = true;
    remove.textContent = "Удаление…";
    try {
      await mutateRequest("DELETE", null, request.id);
      drawRequests();
      drawStats();
      setStatus("#requestsStatus", "Заявка удалена.", true);
    } catch (error) {
      remove.disabled = false;
      remove.textContent = "Удалить";
      setStatus("#requestsStatus", error.message || "Не удалось удалить заявку.", false);
    }
  });

  $("#requestForm").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#requestEditId").value;
    const name = $("#requestName").value.trim();
    const phone = $("#requestPhone").value.trim();
    const email = $("#requestEmail").value.trim();
    const clientType = $("#requestClientType").value;
    const companyName = $("#requestCompanyName").value.trim();
    const bin = $("#requestBin").value.trim();
    const legalAddress = $("#requestLegalAddress").value.trim();
    const position = $("#requestPosition").value.trim();
    const description = $("#requestDescription").value.trim();
    const products = requestProductsFromEditor();
    if (!id || !name || !phone) {
      setStatus("#requestFormStatus", "Заполните имя и телефон клиента.", false);
      return;
    }

    const button = $("#saveRequest");
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Сохранение…";
    try {
      await mutateRequest("PUT", { id, name, phone, email, clientType, companyName, bin, legalAddress, position, description, products });
      drawRequests();
      drawStats();
      closeRequestForm();
      setStatus("#requestsStatus", "Изменения в заявке сохранены.", true);
    } catch (error) {
      setStatus("#requestFormStatus", error.message || "Не удалось сохранить изменения.", false);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });

  $("#adminProductSearch").addEventListener("input", () => {
    adminProductsPage = 1;
    drawProducts();
  });

  $("#selectProductsPage").addEventListener("change", event => {
    const { visible } = visibleAdminProducts();
    visible.forEach(product => {
      const id = productId(product);
      if (event.currentTarget.checked) selectedProductIds.add(id);
      else selectedProductIds.delete(id);
    });
    drawProducts();
  });

  $("#productsTable").addEventListener("change", async event => {
    const selection = event.target.closest("[data-select-product]");
    if (selection) {
      const id = selection.dataset.selectProduct;
      if (selection.checked) selectedProductIds.add(id);
      else selectedProductIds.delete(id);
      drawProducts();
      return;
    }

    const toggle = event.target.closest("[data-active-product]");
    if (!toggle) return;
    const product = products.find(item => productId(item) === toggle.dataset.activeProduct);
    if (!product) return;
    const previous = product.active;
    product.active = toggle.checked;
    toggle.disabled = true;
    const message = product.active ? "Товар показан в каталоге." : "Товар скрыт с витрины.";
    const saved = await persistAndRefresh("#productStatus", message);
    if (!saved) {
      product.active = previous;
      drawProducts();
    }
  });

  $("#productsTable").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (edit) {
      const product = products.find(item => String(item.id) === String(edit.dataset.edit));
      if (product) openProductForm(product);
    }
    if (remove) {
      const product = products.find(item => String(item.id) === String(remove.dataset.delete));
      if (!product || !window.confirm("Удалить товар «" + productName(product) + "»?")) return;
      const previous = products;
      const removedId = productId(product);
      products = products.filter(item => String(item.id) !== String(remove.dataset.delete));
      selectedProductIds.delete(removedId);
      const saved = await persistAndRefresh("#productStatus", "Товар удалён.");
      if (!saved) {
        products = previous;
        selectedProductIds.add(removedId);
        drawProducts();
      }
    }
  });

  $("#adminBulkTools").addEventListener("click", async event => {
    const button = event.target.closest("[data-bulk-products]");
    if (!button) return;
    pruneProductSelection();
    const chosenIds = new Set(selectedProductIds);
    if (!chosenIds.size) return;

    const action = button.dataset.bulkProducts;
    if (action === "delete" && !window.confirm("Удалить выбранные товары (" + chosenIds.size + " шт.)? Это действие нельзя отменить.")) return;

    const previous = products;
    if (action === "delete") {
      products = products.filter(product => !chosenIds.has(productId(product)));
      selectedProductIds.clear();
    } else {
      const active = action === "activate";
      products = products.map(product => chosenIds.has(productId(product)) ? { ...product, active } : product);
    }

    const message = action === "activate"
      ? "Выбранные товары показаны в каталоге."
      : action === "deactivate"
        ? "Выбранные товары скрыты с витрины."
        : "Выбранные товары удалены.";
    const saved = await persistAndRefresh("#productBulkStatus", message);
    if (!saved) {
      products = previous;
      if (action === "delete") selectedProductIds = chosenIds;
      drawProducts();
    }
  });

  $("#importProductsButton").addEventListener("click", () => $("#productImportInput").click());

  $("#downloadImportTemplate").addEventListener("click", () => {
    const template = [
      "Название;Бренд;Категория;Изображение;Описание;Характеристики",
      "Пример товара;Бренд;Стройматериалы;https://example.com/image.jpg;Краткое описание;Размер: 20×20 | Материал: сталь"
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8" }));
    link.download = "777-import-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  });

  $("#productImportInput").addEventListener("change", async event => {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStatus("#productImportStatus", "Файл импорта не должен превышать 10 МБ.", false);
      input.value = "";
      return;
    }

    try {
      setStatus("#productImportStatus", "Проверяем и подготавливаем товары…", true);
      const { imported, skipped } = parseImportedProducts(await file.text());
      if (!imported.length) throw new Error("В файле нет строк с названием товара.");
      const previous = products;
      products = [...imported, ...products];
      adminProductsPage = 1;
      selectedProductIds = new Set(imported.map(productId));
      const message = "Импортировано: " + imported.length + ". Все новые товары выключены."
        + (skipped ? " Пропущено строк: " + skipped + "." : "");
      const saved = await persistAndRefresh("#productImportStatus", message);
      if (!saved) {
        products = previous;
        selectedProductIds.clear();
        drawProducts();
      }
    } catch (error) {
      setStatus("#productImportStatus", error.message || "Не удалось импортировать товары.", false);
    } finally {
      input.value = "";
    }
  });

  $("#adminProductsPagination").addEventListener("click", event => {
    const button = event.target.closest("[data-admin-page]");
    if (!button || button.disabled) return;
    adminProductsPage = Number(button.dataset.adminPage) || 1;
    drawProducts();
  });

  $("#categoriesList").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-category]");
    const remove = event.target.closest("[data-delete-category]");
    if (edit) {
      const category = categories.find(item => item.id === edit.dataset.editCategory);
      if (category) openCategoryForm(category);
    }
    if (remove) {
      const id = remove.dataset.deleteCategory;
      const category = categories.find(item => item.id === id);
      if (!category) return;
      const productCount = products.filter(product => product.cat === id).length;
      const childCount = categories.filter(item => item.parent === id).length;
      if (productCount || childCount) {
        setStatus("#categoryStatus", "Нельзя удалить «" + category.name + "»: перенесите " +
          (productCount ? "товары" : "вложенные категории") + " в другой раздел.", false);
        $("#categoryForm").hidden = false;
        return;
      }
      if (!window.confirm("Удалить категорию «" + category.name + "»?")) return;
      categories = categories.filter(item => item.id !== id);
      await persistAndRefresh("#categoryStatus", "Категория удалена.");
    }
  });

  $("#productForm").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#editId").value || String(Date.now());
    const index = products.findIndex(product => String(product.id) === String(id));
    const previous = index > -1 ? products[index] : {};
    const item = {
      ...previous,
      id,
      name: $("#productName").value.trim(),
      brand: $("#productBrand").value.trim(),
      cat: $("#productCategory").value,
      image: $("#productImage").value.trim(),
      description: $("#productDescription").value.trim(),
      specs: specsFromText($("#productSpecs").value),
      active: $("#productActive").checked
    };
    if (index > -1) products[index] = item;
    else products.unshift(item);
    const saved = await persistAndRefresh("#productStatus", item.active ? "Товар сохранён и опубликован в каталоге." : "Товар сохранён как неактивный.");
    if (saved) closeProductForm();
  });

  $("#categoryName").addEventListener("input", () => {
    if (!$("#categoryEditId").value) {
      $("#categoryId").value = slugify($("#categoryName").value);
    }
  });

  $("#categoryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const editId = $("#categoryEditId").value;
    const name = $("#categoryName").value.trim();
    const id = editId || slugify(name);
    const parent = $("#categoryParent").value;

    $("#categoryId").value = id;

    if (!id || !name) {
      setStatus("#categoryStatus", "Заполните название и идентификатор.", false);
      return;
    }
    if (!editId && categories.some(category => category.id === id)) {
      setStatus("#categoryStatus", "Категория с таким идентификатором уже существует.", false);
      return;
    }
    if (editId && parent === editId) {
      setStatus("#categoryStatus", "Категория не может быть разделом самой для себя.", false);
      return;
    }

    if (editId) {
      const index = categories.findIndex(category => category.id === editId);
      if (index > -1) categories[index] = { id: editId, name, parent };
    } else {
      categories.push({ id, name, parent });
    }

    const saved = await persistAndRefresh("#categoryStatus", "Категория сохранена и доступна при добавлении товара.");
    if (saved) closeCategoryForm();
  });

  $("#heroSlideInput").addEventListener("change", async event => {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    if (settings.heroSlides.length >= maxHeroSlides) {
      input.value = "";
      setStatus("#heroSlidesStatus", "Можно добавить не более " + maxHeroSlides + " фонов.", false);
      return;
    }

    setStatus("#heroSlidesStatus", "Подготавливаем изображение…", true);
    try {
      const slide = await prepareHeroSlide(file);
      settings.heroSlides.push(slide);
      const saved = await persistHeroSlides("Фон добавлен и опубликован на главной странице.");
      if (!saved) settings.heroSlides = settings.heroSlides.filter(item => item.id !== slide.id);
    } catch (error) {
      setStatus("#heroSlidesStatus", error.message || "Не удалось обработать изображение.", false);
    } finally {
      input.value = "";
    }
  });

  $("#heroSlidesList").addEventListener("click", async event => {
    const moveButton = event.target.closest("[data-move-hero-slide]");
    if (moveButton) {
      const id = moveButton.dataset.moveHeroSlide;
      const currentIndex = settings.heroSlides.findIndex(item => item.id === id);
      const nextIndex = currentIndex + Number(moveButton.dataset.direction || 0);
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= settings.heroSlides.length) return;

      const previous = cloneHeroSlides(settings.heroSlides);
      const nextSlides = cloneHeroSlides(settings.heroSlides);
      [nextSlides[currentIndex], nextSlides[nextIndex]] = [nextSlides[nextIndex], nextSlides[currentIndex]];
      settings.heroSlides = nextSlides;
      moveButton.disabled = true;
      const saved = await persistHeroSlides("Очередь показа фонов обновлена.");
      if (!saved) {
        settings.heroSlides = previous;
        drawHeroSlides();
      }
      return;
    }

    const button = event.target.closest("[data-remove-hero-slide]");
    if (!button) return;
    const id = button.dataset.removeHeroSlide;
    const slide = settings.heroSlides.find(item => item.id === id);
    if (!slide) return;
    if (!window.confirm("Удалить этот фон с главной страницы?")) return;

    const previous = settings.heroSlides;
    settings.heroSlides = previous.filter(item => item.id !== id);
    button.disabled = true;
    const saved = await persistHeroSlides("Фон удалён с главной страницы.");
    if (!saved) {
      settings.heroSlides = previous;
      drawHeroSlides();
    }
  });

  $("#settingsForm").addEventListener("submit", async event => {
    event.preventDefault();
    settings = {
      ...settings,
      phone: $("#settingPhone").value.trim(),
      email: $("#settingEmail").value.trim(),
      address: $("#settingAddress").value.trim()
    };
    await persistAndRefresh("#settingsStatus", "Настройки сохранены.");
  });

  (async () => {
    await Promise.all([loadRemote(), loadRequests()]);
    $("#settingPhone").value = settings.phone || "";
    $("#settingEmail").value = settings.email || "";
    $("#settingAddress").value = settings.address || "";
    drawHeroSlides();
    drawProducts();
    drawCategories();
    drawStats();
  })();
})();
