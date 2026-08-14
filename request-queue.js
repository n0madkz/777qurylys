(function () {
  "use strict";

  const queueKey = "kurylys_pending_requests_v2";
  const legacyKey = "kurylys_pending_requests";
  let isSending = false;

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(queueKey, JSON.stringify(items.slice(-50)));
    document.dispatchEvent(new CustomEvent("kurylys:request-queue", { detail: { pending: items.length } }));
  }

  function isQueuedRequest(item) {
    return item && typeof item === "object" && !item.id && item.name && item.phone;
  }

  function migrateLegacyQueue() {
    const existing = read(queueKey);
    const legacy = read(legacyKey).filter(isQueuedRequest);
    if (!legacy.length) return;

    const known = new Set(existing.map(item => String(item.queueId || item.createdAt || "") + String(item.phone || "")));
    const merged = existing.concat(legacy.filter(item => {
      const signature = String(item.queueId || item.createdAt || "") + String(item.phone || "");
      return !known.has(signature);
    }).map(item => ({ ...item, queueId: item.queueId || window.crypto?.randomUUID?.() || String(Date.now() + Math.random()) })));
    write(merged);
  }

  function enqueue(payload) {
    const items = read(queueKey);
    const item = {
      ...payload,
      queueId: window.crypto?.randomUUID?.() || String(Date.now() + Math.random()),
      createdAt: payload.createdAt || new Date().toISOString()
    };
    items.push(item);
    write(items);
    return item;
  }

  function toFormData(item) {
    const data = new FormData();
    ["name", "phone", "email", "clientType", "companyName", "bin", "legalAddress", "position", "language"].forEach(key => {
      if (item[key] != null) data.append(key, String(item[key]));
    });

    let description = String(item.description || "");
    if (Array.isArray(item.documents) && item.documents.length) {
      const names = item.documents.map(file => file?.name).filter(Boolean).join(", ");
      if (names) description += "\n\n[Ранее были выбраны документы: " + names + ". Файлы нужно запросить у клиента повторно.]";
    }
    data.append("description", description);
    data.append("products", JSON.stringify(Array.isArray(item.products) ? item.products : []));
    return data;
  }

  async function flush() {
    if (isSending || !navigator.onLine) return;
    const pending = read(queueKey);
    if (!pending.length) return;

    isSending = true;
    const remaining = [];
    for (const item of pending) {
      try {
        const response = await fetch("/api/requests", { method: "POST", body: toFormData(item) });
        if (!response.ok) throw new Error("Request was not accepted");
      } catch {
        remaining.push(item);
      }
    }
    isSending = false;
    write(remaining);
  }

  migrateLegacyQueue();
  window.KurylysRequestQueue = { enqueue, flush, count: () => read(queueKey).length };
  window.addEventListener("online", flush);
  window.setTimeout(flush, 250);
})();
