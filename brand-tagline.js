(() => {
  const styleId = "brand-tagline-styles";
  if (!document.getElementById(styleId)) {
    const stylesheet = document.createElement("link");
    stylesheet.id = styleId;
    stylesheet.rel = "stylesheet";
    stylesheet.href = "brand-tagline.css?v=20260811-brand-signature";
    document.head.appendChild(stylesheet);
  }

  const labels = {
    ru: { first: "\u0421\u0422\u0420\u041e\u0418\u0422\u0415\u041b\u042c\u041d\u042b\u0419", second: "\u0413\u0418\u041f\u0415\u0420\u041c\u0410\u0420\u041a\u0415\u0422", since: "\u0421 2011 \u0413\u041e\u0414\u0410" },
    kz: { first: "\u049a\u04b0\u0420\u042b\u041b\u042b\u0421", second: "\u0413\u0418\u041f\u0415\u0420\u041c\u0410\u0420\u041a\u0415\u0422\u0406", since: "2011 \u0416\u042b\u041b\u0414\u0410\u041d \u0411\u0415\u0420\u0406" },
    en: { first: "BUILDING", second: "HYPERMARKET", since: "SINCE 2011" }
  };

  function render() {
    const locale = labels[document.documentElement.lang] ? document.documentElement.lang : "ru";
    const copy = labels[locale];
    document.querySelectorAll(".brand").forEach(brand => {
      let signature = brand.querySelector(".brand__signature");
      if (!signature) {
        signature = document.createElement("span");
        signature.className = "brand__signature";
        signature.setAttribute("aria-hidden", "true");
        signature.innerHTML = '<span class="brand__signature-title"><span></span><span></span></span><span class="brand__signature-since"></span>';
        brand.appendChild(signature);
      }
      const lines = signature.querySelectorAll(".brand__signature-title span");
      lines[0].textContent = copy.first;
      lines[1].textContent = copy.second;
      signature.querySelector(".brand__signature-since").textContent = copy.since;
    });
  }

  render();
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
