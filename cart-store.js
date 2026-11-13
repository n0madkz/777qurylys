(() => {
  const storageKey = "kurylys_cart";
  const maxQuantity = 9999;
  const validId = value => value && !['NaN','undefined','null','Infinity','-Infinity'].includes(value);

  function normalizeQuantity(value) {
    const quantity = Math.floor(Number(value));
    return Number.isFinite(quantity) ? Math.min(maxQuantity, Math.max(1, quantity)) : 1;
  }

  function normalizeItems(value) {
    const merged = new Map();
    if (!Array.isArray(value)) return [];
    value.forEach(item => {
      const id = typeof item === "object" && item !== null ? String(item.id || "") : String(item || "");
      if (!validId(id)) return;
      const quantity = typeof item === "object" && item !== null ? normalizeQuantity(item.quantity) : 1;
      const current = merged.get(id)?.quantity || 0;
      const snapshot = typeof item === 'object' && item.snapshot && String(item.snapshot.id) === id ? item.snapshot : merged.get(id)?.snapshot;
      merged.set(id, { id, quantity: Math.min(maxQuantity, current + quantity), ...(snapshot ? {snapshot} : {}) });
    });
    return Array.from(merged.values());
  }

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return normalizeItems(value);
    } catch {
      return [];
    }
  }

  function write(items) {
    const normalized = normalizeItems(items);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    document.dispatchEvent(new CustomEvent("kurylys:cart-change", { detail: { items: normalized, ids: normalized.map(item => item.id) } }));
    refresh();
  }

  function refresh() {
    const count = read().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach(node => {
      node.textContent = String(count);
      node.hidden = count === 0;
      node.style.display = count === 0 ? "none" : "";
    });
  }

  window.CartStore = {
    get: read,
    has(id) {
      return read().some(item => item.id === String(id));
    },
    quantity(id) {
      return read().find(item => item.id === String(id))?.quantity || 0;
    },
    add(id, quantity = 1, product = null) {
      const items = read();
      const value = String(id || "");
      if (!validId(value)) return 0;
      const index = items.findIndex(item => item.id === value);
      const nextQuantity = normalizeQuantity(quantity);
      if (index === -1) items.push({ id: value, quantity: nextQuantity });
      else items[index].quantity = Math.min(maxQuantity, items[index].quantity + nextQuantity);
      if (product && String(product.id) === value) {
        const entry = items.find(item=>item.id===value);
        entry.snapshot = Object.fromEntries(['id','name','title','brand','cat','image','thumbnail'].filter(key=>product[key]!==undefined).map(key=>[key,product[key]]));
      }
      write(items);
      return items.find(item => item.id === value)?.quantity || 0;
    },
    update(id, quantity) {
      const value = String(id || "");
      const items = read();
      const index = items.findIndex(item => item.id === value);
      if (index === -1 || !value) return 0;
      if (Number(quantity) < 1) {
        items.splice(index, 1);
        write(items);
        return 0;
      }
      items[index].quantity = normalizeQuantity(quantity);
      write(items);
      return items[index].quantity;
    },
    remove(id) {
      write(read().filter(item => item.id !== String(id)));
    },
    clear() {
      write([]);
    },
    refresh
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
  else refresh();
  window.addEventListener("storage", event => {
    if (event.key === storageKey) refresh();
  });
})();
