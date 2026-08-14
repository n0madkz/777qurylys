/* Normalized cart renderer for products created in the admin panel. */
(function () {
  const fallbackImages = {
    1: "assets/product-block.png",
    2: "assets/product-profile.png",
    3: "assets/product-drill.png",
    4: "assets/product-paint.png",
    5: "assets/product-insulation.png",
    6: "assets/product-laser.png",
    7: "assets/product-faucet.png",
    8: "assets/product-laminate.png"
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  function productName(product) {
    if (!product) return "Товар из каталога";

    if (typeof product.name === "object" && product.name) {
      return product.name[lang] ||
        product.name.ru ||
        product.name.kz ||
        product.name.en ||
        product.title ||
        "Товар без названия";
    }

    return product.name || product.title || "Товар без названия";
  }

  function productBrand(product) {
    if (!product) return "777 Гипермаркет";
    if (typeof product.brand === "object" && product.brand) {
      return product.brand[lang] ||
        product.brand.ru ||
        product.brand.kz ||
        product.brand.en ||
        "777 Гипермаркет";
    }
    return product.brand || "777 Гипермаркет";
  }

  const localProductImages = {
    "https://media.adeo.com/media/2719703/media.png": "assets/product-block.jpg",
    "https://media.siniat.de/pi57691/preview/471426647/siniat-cd-profil": "assets/product-profile.jpg",
    "https://mobileimages.lowes.com/productimages/63528a1b-80c9-4744-96fc-8c8a5a5e2e5a/73851761.jpeg?size=xl": "assets/product-drill.jpg"
  };

  function productImage(product) {
    return localProductImages[product && product.image] ||
      (product && product.image) ||
      fallbackImages[product && product.id] ||
      "assets/building-materials-hero.png";
  }

  function emptyCart() {
    return '<div class="empty-state"><span class="ui-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14l-1 12H6L5 6Z"/><path d="M9 10h6M9 14h4"/><path d="M8 6a4 4 0 0 1 8 0"/></svg></span><b>Здесь появятся товары</b><p>Добавляйте позиции, чтобы отправить нам запрос.</p></div>';
  }

  function renderQuoteWithDetails() {
    const box = document.getElementById("quoteItems");
    const count = document.querySelector(".quote-count");
    if (!box || !Array.isArray(quote)) return;

    const selected = quote.map(function (id) {
      return products.find(function (product) {
        return String(product.id) === String(id);
      });
    }).filter(Boolean);

    if (selected.length !== quote.length) {
      quote = selected.map(function (product) { return product.id; });
    }

    if (count) count.textContent = selected.length;

    if (!selected.length) {
      box.innerHTML = emptyCart();
      return;
    }

    box.innerHTML = selected.map(function (product) {
      const id = encodeURIComponent(product.id);
      const name = escapeHtml(productName(product));
      const brand = escapeHtml(productBrand(product));
      const image = escapeHtml(productImage(product));

      return '<article class="quote-item">' +
        '<a class="quote-item__media" href="product.html?id=' + id + '" aria-label="Открыть товар: ' + name + '">' +
        '<img src="' + image + '" alt="' + name + '" loading="lazy" decoding="async"></a>' +
        '<div class="quote-item__content"><span class="quote-item__brand">' + brand + '</span>' +
        '<div class="quote-item__name"><a href="product.html?id=' + id + '">' + name + '</a></div></div>' +
        '<button class="quote-item__remove" type="button" data-remove="' + id + '" aria-label="Удалить ' + name + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></article>';
    }).join("");

    box.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
        const id = button.getAttribute("data-remove");
        quote = quote.filter(function (itemId) {
          return String(itemId) !== String(id);
        });
        renderQuoteWithDetails();
      });
    });
  }

  renderQuote = renderQuoteWithDetails;
  renderQuoteWithDetails();

  fetch("/api/catalog", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.products)) return;
      products.splice.apply(products, [0, products.length].concat(data.products));
      renderQuoteWithDetails();
    })
    .catch(function () {
      renderQuoteWithDetails();
    });
}());
