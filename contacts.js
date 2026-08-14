(() => {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactFormStatus");
  if (!form || !status) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.className = "form-status is-" + type;
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    if (!name || !phone) {
      setStatus("Укажите имя и телефон, чтобы мы могли с вами связаться.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Отправляем…";
    try {
      const response = await fetch("/api/requests", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Не удалось отправить сообщение.");
      form.reset();
      setStatus("Сообщение отправлено. Мы свяжемся с вами в ближайшее рабочее время.", "success");
    } catch (error) {
      setStatus(error.message || "Не удалось отправить сообщение. Попробуйте ещё раз.", "error");
    } finally {
      submit.disabled = false;
      submit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-5 14-3-5-6-2Z"></path><path d="m11 14 3-3"></path></svg>Отправить сообщение';
    }
  });
})();
