(() => {
  const drawerForm = document.querySelector(".drawer__form");
  const submit = drawerForm?.querySelector("[data-submit-quote]");
  if (!drawerForm || !submit) return;

  const copy = {
    ru: { email: "\u041f\u043e\u0447\u0442\u0430", optional: "\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e", client: "\u041a\u0442\u043e \u043e\u0444\u043e\u0440\u043c\u043b\u044f\u0435\u0442 \u0437\u0430\u044f\u0432\u043a\u0443?", individual: "\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043b\u0438\u0446\u043e", legal: "\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043b\u0438\u0446\u043e", requisites: "\u0420\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438", company: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438", bin: "\u0411\u0418\u041d", position: "\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c", address: "\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441", description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438", descriptionHint: "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u043d\u0443\u0436\u0435\u043d \u0440\u0430\u0441\u0447\u0451\u0442 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432, \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438\u043b\u0438 \u043f\u043e\u0434\u0431\u043e\u0440 \u0430\u043d\u0430\u043b\u043e\u0433\u0430", attach: "\u041f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b", attachHint: "\u0421\u043c\u0435\u0442\u0430, \u0447\u0435\u0440\u0442\u0451\u0436, \u0441\u043f\u0438\u0441\u043e\u043a \u2014 \u0434\u043e 10 \u041c\u0411 \u043a\u0430\u0436\u0434\u044b\u0439", invalid: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0438\u043c\u044f, \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u0438 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438.", legalInvalid: "\u0414\u043b\u044f \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043b\u0438\u0446\u0430 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e, \u0411\u0418\u041d \u0438 \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441.", sending: "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c\u2026", submit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 \u2197", success: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430. \u041c\u044b \u0441\u0432\u044f\u0436\u0435\u043c\u0441\u044f \u0441 \u0432\u0430\u043c\u0438 \u0432 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043c\u044f." },
    kz: { email: "\u041f\u043e\u0448\u0442\u0430", optional: "\u043c\u0456\u043d\u0434\u0435\u0442\u0442\u0456 \u0435\u043c\u0435\u0441", client: "\u04e8\u0442\u0456\u043d\u0456\u043c\u0434\u0456 \u043a\u0456\u043c \u0440\u0435\u0441\u0456\u043c\u0434\u0435\u0439\u0434\u0456?", individual: "\u0416\u0435\u043a\u0435 \u0442\u04b1\u043b\u0493\u0430", legal: "\u0417\u0430\u04a3\u0434\u044b \u0442\u04b1\u043b\u0493\u0430", requisites: "\u04b0\u0439\u044b\u043c \u0434\u0435\u0440\u0435\u043a\u0442\u0435\u043c\u0435\u043b\u0435\u0440\u0456", company: "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f \u0430\u0442\u0430\u0443\u044b", bin: "\u0411\u0418\u041d", position: "\u041b\u0430\u0443\u0430\u0437\u044b\u043c\u044b", address: "\u0417\u0430\u04a3\u0434\u044b \u043c\u0435\u043a\u0435\u043d\u0436\u0430\u0439", description: "\u04e8\u0442\u0456\u043d\u0456\u043c \u0441\u0438\u043f\u0430\u0442\u0442\u0430\u043c\u0430\u0441\u044b", descriptionHint: "\u041c\u044b\u0441\u0430\u043b\u044b: \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0434\u0430\u0440\u0434\u044b \u0435\u0441\u0435\u043f\u0442\u0435\u0443 \u043d\u0435\u043c\u0435\u0441\u0435 \u0436\u0435\u0442\u043a\u0456\u0437\u0443 \u049b\u0430\u0436\u0435\u0442", attach: "\u049a\u04b1\u0436\u0430\u0442\u0442\u0430\u0440\u0434\u044b \u0442\u0456\u0440\u043a\u0435\u0443", attachHint: "\u0421\u043c\u0435\u0442\u0430, \u0441\u044b\u0437\u0431\u0430, \u0442\u0456\u0437\u0456\u043c \u2014 \u04d9\u0440\u049b\u0430\u0439\u0441\u044b\u0441\u044b 10 \u041c\u0411 \u0434\u0435\u0439\u0456\u043d", invalid: "\u0410\u0442\u044b-\u0436\u04e9\u043d\u0456\u04a3\u0456\u0437\u0434\u0456, \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0434\u044b \u0436\u04d9\u043d\u0435 \u04e9\u0442\u0456\u043d\u0456\u043c \u0441\u0438\u043f\u0430\u0442\u0442\u0430\u043c\u0430\u0441\u044b\u043d \u043a\u04e9\u0440\u0441\u0435\u0442\u0456\u04a3\u0456\u0437.", legalInvalid: "\u0417\u0430\u04a3\u0434\u044b \u0442\u04b1\u043b\u0493\u0430 \u04af\u0448\u0456\u043d \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044f\u043d\u044b, \u0411\u0418\u041d-\u0434\u0456 \u0436\u04d9\u043d\u0435 \u0437\u0430\u04a3\u0434\u044b \u043c\u0435\u043a\u0435\u043d\u0436\u0430\u0439\u0434\u044b \u043a\u04e9\u0440\u0441\u0435\u0442\u0456\u04a3\u0456\u0437.", sending: "\u0416\u0456\u0431\u0435\u0440\u0456\u043b\u0443\u0434\u0435\u2026", submit: "\u04e8\u0442\u0456\u043d\u0456\u043c \u0436\u0456\u0431\u0435\u0440\u0443 \u2197", success: "\u04e8\u0442\u0456\u043d\u0456\u043c \u0436\u0456\u0431\u0435\u0440\u0456\u043b\u0434\u0456. \u0421\u0456\u0437\u0431\u0435\u043d \u0436\u0443\u044b\u0440\u0430\u0434\u0430 \u0445\u0430\u0431\u0430\u0440\u043b\u0430\u0441\u0430\u043c\u044b\u0437." },
    en: { email: "Email", optional: "optional", client: "Who is submitting the request?", individual: "Individual", legal: "Legal entity", requisites: "Company details", company: "Company name", bin: "BIN", position: "Position", address: "Legal address", description: "Request details", descriptionHint: "For example: materials estimate, delivery or product selection", attach: "Attach documents", attachHint: "Estimate, drawing, list — up to 10 MB each", invalid: "Enter your name, phone number and request details.", legalInvalid: "For a legal entity, enter the company name, BIN and legal address.", sending: "Sending…", submit: "Send request ↗", success: "Request sent. We will contact you shortly." }
  };
  const language = () => copy[document.documentElement.lang] ? document.documentElement.lang : "ru";
  const ui = () => copy[language()];
  const details = document.createElement("label");
  details.innerHTML = '<span data-copy="description"></span><textarea id="quoteDescription" rows="3" required></textarea>';
  const email = document.createElement("label");
  email.innerHTML = '<span><span data-copy="email"></span> <span class="field-optional" data-copy="optional"></span></span><input id="quoteEmail" type="email" autocomplete="email" placeholder="name@company.kz">';
  const client = document.createElement("fieldset");
  client.className = "quote-client-type";
  client.innerHTML = '<legend data-copy="client"></legend><div class="quote-client-type__buttons" role="group"><button class="quote-client-type__button is-active" type="button" data-quote-client-type="individual" aria-pressed="true" data-copy="individual"></button><button class="quote-client-type__button" type="button" data-quote-client-type="legal" aria-pressed="false" data-copy="legal"></button></div><input id="quoteClientType" type="hidden" value="individual">';
  const legal = document.createElement("div");
  legal.className = "quote-legal-fields";
  legal.hidden = true;
  legal.innerHTML = '<p class="quote-legal-fields__title" data-copy="requisites"></p><label><span data-copy="company"></span><input id="quoteCompanyName" type="text" autocomplete="organization"></label><div class="quote-form-grid"><label><span data-copy="bin"></span><input id="quoteBin" type="text" inputmode="numeric" maxlength="12"></label><label><span><span data-copy="position"></span> <span class="field-optional" data-copy="optional"></span></span><input id="quotePosition" type="text" autocomplete="organization-title"></label></div><label><span data-copy="address"></span><textarea id="quoteLegalAddress" rows="3" autocomplete="street-address"></textarea></label>';
  const upload = document.createElement("label");
  upload.className = "file-drop quote-file-drop";
  upload.innerHTML = '<input id="quoteFiles" type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx" multiple><span class="file-drop__icon" aria-hidden="true"></span><b data-copy="attach"></b><small data-copy="attachHint"></small>';
  const fileList = document.createElement("div");
  fileList.className = "selected-files";
  const status = document.createElement("div");
  status.className = "form-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  [email, client, legal, details, upload, fileList, status].forEach(node => drawerForm.insertBefore(node, submit));

  const input = upload.querySelector("input");
  const description = details.querySelector("textarea");
  const clientType = client.querySelector("#quoteClientType");
  const companyName = legal.querySelector("#quoteCompanyName");
  const bin = legal.querySelector("#quoteBin");
  const legalAddress = legal.querySelector("#quoteLegalAddress");
  const position = legal.querySelector("#quotePosition");
  const allowed = /\.(pdf|png|jpe?g|xlsx?|docx?)$/i;
  const maxSize = 10 * 1024 * 1024;
  const size = value => value < 1024 * 1024 ? `${Math.ceil(value / 1024)} \u041a\u0411` : `${(value / 1024 / 1024).toFixed(1)} \u041c\u0411`;
  const showStatus = (message, type) => { status.textContent = message; status.className = `form-status is-${type}`; };
  const cartEntries = () => window.CartStore ? window.CartStore.get() : [];

  function applyCopy() {
    const dictionary = ui();
    drawerForm.querySelectorAll("[data-copy]").forEach(node => { node.textContent = dictionary[node.dataset.copy] || ""; });
    description.placeholder = dictionary.descriptionHint;
    if (!submit.disabled) submit.textContent = dictionary.submit;
  }

  function setClientType(value) {
    const type = value === "legal" ? "legal" : "individual";
    clientType.value = type;
    legal.hidden = type !== "legal";
    [companyName, bin, legalAddress].forEach(field => { field.required = type === "legal"; });
    client.querySelectorAll("[data-quote-client-type]").forEach(button => {
      const active = button.dataset.quoteClientType === type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  input.addEventListener("change", () => {
    const files = [...input.files];
    const invalid = files.find(file => file.size > maxSize || !allowed.test(file.name));
    if (invalid) { input.value = ""; fileList.innerHTML = ""; showStatus(`File \u00ab${invalid.name}\u00bb is not supported.`, "error"); return; }
    status.className = "form-status";
    fileList.innerHTML = files.map(file => `<span class="selected-file">${file.name}<span class="selected-file__size">${size(file.size)}</span></span>`).join("");
  });
  client.querySelectorAll("[data-quote-client-type]").forEach(button => button.addEventListener("click", () => setClientType(button.dataset.quoteClientType)));
  new MutationObserver(applyCopy).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  applyCopy();
  setClientType("individual");

  submit.onclick = async event => {
    event.preventDefault();
    const dictionary = ui();
    const name = document.getElementById("customerName")?.value.trim();
    const phone = document.getElementById("customerPhone")?.value.trim();
    const emailValue = email.querySelector("input").value.trim();
    const descriptionValue = description.value.trim();
    const type = clientType.value;
    if (!name || !phone || !descriptionValue) { showStatus(dictionary.invalid, "error"); return; }
    if (type === "legal" && (!companyName.value.trim() || !/^\d{12}$/.test(bin.value.trim()) || !legalAddress.value.trim())) { showStatus(dictionary.legalInvalid, "error"); return; }

    const selectedProducts = cartEntries().map(entry => {
      const product = (typeof products !== "undefined" && Array.isArray(products) ? products : []).find(item => String(item.id) === String(entry.id));
      const value = product?.name;
      const name = typeof value === "object" ? (value?.[language()] || value?.ru || value?.kz || value?.en) : value;
      return { id: entry.id, name: name || "Product from catalog", brand: product?.brand || "", quantity: entry.quantity || 1 };
    });
    const payload = new FormData();
    payload.append("name", name); payload.append("phone", phone); payload.append("email", emailValue); payload.append("description", descriptionValue);
    payload.append("clientType", type); payload.append("companyName", companyName.value.trim()); payload.append("bin", bin.value.trim()); payload.append("legalAddress", legalAddress.value.trim()); payload.append("position", position.value.trim());
    payload.append("products", JSON.stringify(selectedProducts)); payload.append("language", language());
    [...input.files].forEach(file => payload.append("documents", file, file.name));
    submit.disabled = true;
    submit.textContent = dictionary.sending;
    let response;
    try {
      response = await fetch("/api/requests", { method: "POST", body: payload });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error || "Request could not be sent."); }
      window.CartStore?.clear();
      if (typeof window.renderQuote === "function") window.renderQuote();
      drawerForm.querySelectorAll("input, textarea").forEach(field => field.value = "");
      fileList.innerHTML = "";
      setClientType("individual");
      showStatus(dictionary.success, "success");
    } catch (error) {
      if (response) { showStatus(error.message || "Request could not be sent.", "error"); return; }
      window.KurylysRequestQueue?.enqueue({ name, phone, email: emailValue, clientType: type, companyName: companyName.value.trim(), bin: bin.value.trim(), legalAddress: legalAddress.value.trim(), position: position.value.trim(), description: descriptionValue, products: selectedProducts, documents: [...input.files].map(file => ({ name: file.name, size: file.size })), createdAt: new Date().toISOString() });
      showStatus("Нет соединения с сервером. Заявка ожидает автоматической отправки с этого устройства.", "error");
    } finally {
      submit.disabled = false;
      submit.textContent = ui().submit;
    }
  };
})();
