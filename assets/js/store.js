/* ==========================================================================
   NOOR — store
   Persistence, cart, wishlist, promo codes, orders, currency and reviews.
   Everything is stored in localStorage so the prototype survives a refresh.
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});
  const D = NS.data;
  const KEY = "noor.v1.";

  let lsOk = true;
  const memory = {};
  try {
    window.localStorage.setItem(KEY + "probe", "1");
    window.localStorage.removeItem(KEY + "probe");
  } catch (e) {
    lsOk = false;
  }

  function read(key, fallback) {
    try {
      const raw = lsOk ? window.localStorage.getItem(KEY + key) : memory[key];
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      const raw = JSON.stringify(value);
      if (lsOk) window.localStorage.setItem(KEY + key, raw);
      else memory[key] = raw;
    } catch (e) {
      /* quota or blocked storage — prototype keeps running in memory */
    }
  }

  const state = {
    currency: "USD",
    cart: [],
    wishlist: [],
    orders: [],
    customProducts: [],
    hiddenIds: [],
    reviews: {},
    promo: null,
    delivery: "standard",
    subscribers: [],
  };

  const listeners = new Set();
  function subscribe(fn) {
    listeners.add(fn);
    return function () {
      listeners.delete(fn);
    };
  }
  function emit() {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error("[noor] listener failed", e);
      }
    });
  }

  function load() {
    state.currency = read("currency", "USD");
    if (!D.RATES[state.currency]) state.currency = "USD";
    state.cart = read("cart", []);
    state.wishlist = read("wishlist", []);
    state.orders = read("orders", []);
    state.customProducts = read("customProducts", []);
    state.hiddenIds = read("hiddenIds", []);
    state.reviews = read("reviews", {});
    state.promo = read("promo", null);
    state.delivery = read("delivery", "standard");
    state.subscribers = read("subscribers", []);
    if (!Array.isArray(state.cart)) state.cart = [];
    if (!Array.isArray(state.wishlist)) state.wishlist = [];
    if (!Array.isArray(state.orders)) state.orders = [];
    if (!Array.isArray(state.customProducts)) state.customProducts = [];
    if (!Array.isArray(state.hiddenIds)) state.hiddenIds = [];
  }
  load();

  /* ------------------------------------------------------------------ products */
  function products() {
    const custom = state.customProducts;
    return D.PRODUCTS.concat(custom).filter((p) => state.hiddenIds.indexOf(p.id) === -1);
  }

  function productById(id) {
    return products().find((p) => p.id === id) || null;
  }

  function productBySlug(slug) {
    return products().find((p) => p.slug === slug) || null;
  }

  function hashId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
    return h;
  }

  function sampleReviews(product) {
    const pool = D.REVIEW_POOL;
    const seed = hashId(product.id);
    const picked = [];
    [0, 5, 9].forEach((offset) => {
      let idx = (seed + offset) % pool.length;
      while (picked.some((p) => p === pool[idx])) idx = (idx + 1) % pool.length;
      picked.push(pool[idx]);
    });
    return picked;
  }

  function reviewsFor(product) {
    const mine = (state.reviews[product.id] || []).map((r) => Object.assign({ mine: true }, r));
    const base = sampleReviews(product).map((r) => Object.assign({}, r));
    return mine.concat(base);
  }

  function ratingFor(product) {
    const mine = state.reviews[product.id] || [];
    const baseCount = product.reviewCount || 0;
    const baseRating = product.rating || 5;
    if (!mine.length) return { rating: baseRating, count: baseCount };
    const sum = mine.reduce((acc, r) => acc + r.rating, 0);
    const count = baseCount + mine.length;
    return {
      rating: Math.round(((baseRating * baseCount + sum) / count) * 10) / 10,
      count: count,
    };
  }

  /* --------------------------------------------------------------------- money */
  function rate(code) {
    return D.RATES[code || state.currency] || 1;
  }

  function convert(cents, code) {
    return (cents / 100) * rate(code);
  }

  function money(cents, code) {
    const cur = code || state.currency;
    const amount = convert(cents, cur);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (e) {
      const sym = (D.CURRENCIES.find((c) => c.code === cur) || {}).symbol || "$";
      return sym + amount.toFixed(2);
    }
  }

  function setCurrency(code) {
    if (!D.RATES[code]) return;
    state.currency = code;
    write("currency", code);
    emit();
  }

  /* ---------------------------------------------------------------------- cart */
  function cartKey(productId, color) {
    return productId + "|" + color;
  }

  function cartLines() {
    return state.cart
      .map((item) => {
        const product = productById(item.id);
        if (!product) return null;
        const color = (product.colors || []).find((c) => c.name === item.color) || (product.colors || [])[0];
        return {
          key: cartKey(item.id, item.color),
          qty: item.qty,
          color: color,
          product: product,
          lineTotal: product.price * item.qty,
        };
      })
      .filter(Boolean);
  }

  function addToCart(productId, color, qty) {
    const product = productById(productId);
    if (!product) return null;
    const colorName = color || (product.colors && product.colors[0] && product.colors[0].name) || "Default";
    const amount = Math.max(1, Math.min(20, parseInt(qty, 10) || 1));
    const key = cartKey(productId, colorName);
    const existing = state.cart.find((i) => cartKey(i.id, i.color) === key);
    if (existing) existing.qty = Math.min(20, existing.qty + amount);
    else state.cart.push({ id: productId, color: colorName, qty: amount });
    write("cart", state.cart);
    emit();
    return product;
  }

  function setQty(key, qty) {
    const item = state.cart.find((i) => cartKey(i.id, i.color) === key);
    if (!item) return;
    const next = Math.max(1, Math.min(20, parseInt(qty, 10) || 1));
    item.qty = next;
    write("cart", state.cart);
    emit();
  }

  function removeItem(key) {
    state.cart = state.cart.filter((i) => cartKey(i.id, i.color) !== key);
    write("cart", state.cart);
    emit();
  }

  function clearCart() {
    state.cart = [];
    write("cart", state.cart);
    emit();
  }

  function cartCount() {
    return state.cart.reduce((n, i) => n + i.qty, 0);
  }

  /* ------------------------------------------------------------------ wishlist */
  function inWishlist(id) {
    return state.wishlist.indexOf(id) !== -1;
  }

  function toggleWishlist(id) {
    if (inWishlist(id)) state.wishlist = state.wishlist.filter((x) => x !== id);
    else state.wishlist.push(id);
    write("wishlist", state.wishlist);
    emit();
    return inWishlist(id);
  }

  function wishlistProducts() {
    return state.wishlist.map(productById).filter(Boolean);
  }

  /* -------------------------------------------------------------------- promos */
  function promo() {
    if (!state.promo) return null;
    return D.PROMOS[state.promo.code] || null;
  }

  function applyPromo(code) {
    const raw = String(code || "").trim().toUpperCase();
    if (!raw) {
      state.promo = null;
      write("promo", null);
      emit();
      return { ok: false, message: "Enter a code to apply." };
    }
    const found = D.PROMOS[raw];
    if (!found) return { ok: false, message: "We could not find that code. Try NOOR10." };
    if (found.min && subtotal() < found.min) {
      return { ok: false, message: `Spend ${money(found.min)} to use ${raw}.` };
    }
    state.promo = { code: raw, appliedAt: new Date().toISOString() };
    write("promo", state.promo);
    emit();
    return { ok: true, message: `${raw} applied — ${found.label}.` };
  }

  function clearPromo() {
    state.promo = null;
    write("promo", null);
    emit();
  }

  /* ------------------------------------------------------------------- totals */
  function subtotal() {
    return cartLines().reduce((sum, l) => sum + l.lineTotal, 0);
  }

  function setDelivery(method) {
    state.delivery = method === "express" ? "express" : "standard";
    write("delivery", state.delivery);
    emit();
  }

  function totals() {
    const sub = subtotal();
    const active = promo();
    let discount = 0;
    let freeShip = false;
    if (active && sub >= (active.min || 0)) {
      if (active.type === "percent") discount = Math.round((sub * active.value) / 100);
      if (active.type === "shipping") freeShip = true;
    }
    const afterDiscount = Math.max(0, sub - discount);
    const qualifiesFree = afterDiscount >= D.SHIPPING.freeThreshold;
    const baseShip = state.delivery === "express" ? D.SHIPPING.express : D.SHIPPING.standard;
    const shipping = sub === 0 ? 0 : qualifiesFree || freeShip ? 0 : baseShip;
    const tax = Math.round(afterDiscount * D.TAX_RATE);
    return {
      subtotal: sub,
      discount: discount,
      shipping: shipping,
      tax: tax,
      total: afterDiscount + shipping + tax,
      freeShipRemaining: Math.max(0, D.SHIPPING.freeThreshold - afterDiscount),
      qualifiesFree: qualifiesFree,
      promo: active,
      delivery: state.delivery,
    };
  }

  /* ------------------------------------------------------------------- orders */
  function newOrderId() {
    const stamp = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
    return "NR-" + stamp + rand;
  }

  function createOrder(payload) {
    const t = totals();
    const lines = cartLines();
    const order = {
      id: newOrderId(),
      date: new Date().toISOString(),
      status: payload.status || "paid",
      items: lines.map((l) => ({
        id: l.product.id,
        slug: l.product.slug,
        name: l.product.name,
        color: l.color ? l.color.name : "",
        colorHex: l.color ? l.color.hex : "#D8C3A5",
        qty: l.qty,
        price: l.product.price,
      })),
      totals: {
        subtotal: t.subtotal,
        discount: t.discount,
        shipping: t.shipping,
        tax: t.tax,
        total: t.total,
        currency: state.currency,
      },
      promo: t.promo ? t.promo.code : null,
      delivery: state.delivery,
      payment: payload.payment,
      customer: payload.customer,
    };
    state.orders.unshift(order);
    write("orders", state.orders);
    state.cart = [];
    write("cart", state.cart);
    state.promo = null;
    write("promo", null);
    emit();
    return order;
  }

  function getOrder(id) {
    return state.orders.find((o) => o.id === id) || null;
  }

  function reorder(order) {
    (order.items || []).forEach((item) => {
      if (productById(item.id)) addToCart(item.id, item.color, item.qty);
    });
  }

  /* --------------------------------------------------------------- reviews add */
  function addReview(productId, review) {
    if (!state.reviews[productId]) state.reviews[productId] = [];
    state.reviews[productId].unshift({
      name: review.name,
      rating: Math.max(1, Math.min(5, review.rating)),
      title: review.title || "Verified purchase",
      text: review.text,
      date: new Date().toISOString().slice(0, 10),
      verified: true,
    });
    write("reviews", state.reviews);
    emit();
  }

  /* --------------------------------------------------------------------- admin */
  function slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function addProduct(fields) {
    const id = "c" + Date.now().toString(36);
    let slug = slugify(fields.name) || "product";
    const taken = products().some((p) => p.slug === slug);
    if (taken) slug = slug + "-" + id.slice(1, 4);
    const product = {
      id: id,
      slug: slug,
      name: fields.name,
      collection: fields.collection,
      price: Math.max(100, Math.round(Number(fields.price) * 100) || 100),
      compareAt: fields.compareAt ? Math.round(Number(fields.compareAt) * 100) : null,
      fabric: fields.fabric || "Chiffon",
      style: fields.style || "classic",
      badge: fields.badge || null,
      rating: 5,
      reviewCount: 0,
      featured: !!fields.featured,
      createdAt: new Date().toISOString().slice(0, 10),
      blurb: fields.blurb || "",
      description: fields.description || fields.blurb || "",
      care: fields.care || "Hand wash cold. Line dry.",
      colors: fields.colors && fields.colors.length ? fields.colors : [{ name: "Sand", hex: "#D8C3A5", family: "Neutral" }],
      custom: true,
    };
    state.customProducts.push(product);
    write("customProducts", state.customProducts);
    emit();
    return product;
  }

  function updateProductPrice(id, price) {
    const product = state.customProducts.find((p) => p.id === id);
    if (!product) return;
    product.price = Math.max(100, Math.round(Number(price) * 100));
    write("customProducts", state.customProducts);
    emit();
  }

  function deleteProduct(id) {
    const isCustom = state.customProducts.some((p) => p.id === id);
    if (isCustom) {
      state.customProducts = state.customProducts.filter((p) => p.id !== id);
      write("customProducts", state.customProducts);
    } else if (state.hiddenIds.indexOf(id) === -1) {
      state.hiddenIds.push(id);
      write("hiddenIds", state.hiddenIds);
    }
    state.cart = state.cart.filter((i) => i.id !== id);
    write("cart", state.cart);
    state.wishlist = state.wishlist.filter((x) => x !== id);
    write("wishlist", state.wishlist);
    emit();
  }

  function restoreProduct(id) {
    state.hiddenIds = state.hiddenIds.filter((x) => x !== id);
    write("hiddenIds", state.hiddenIds);
    emit();
  }

  function clearOrders() {
    state.orders = [];
    write("orders", state.orders);
    emit();
  }

  function resetAll() {
    ["cart", "wishlist", "orders", "customProducts", "hiddenIds", "reviews", "promo", "delivery", "subscribers", "currency"].forEach(
      (k) => {
        try {
          if (lsOk) window.localStorage.removeItem(KEY + k);
          else delete memory[k];
        } catch (e) {
          /* noop */
        }
      }
    );
    state.cart = [];
    state.wishlist = [];
    state.orders = [];
    state.customProducts = [];
    state.hiddenIds = [];
    state.reviews = {};
    state.promo = null;
    state.delivery = "standard";
    state.subscribers = [];
    state.currency = "USD";
    emit();
  }

  function subscribeNewsletter(email) {
    const clean = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, message: "Please enter a valid email address." };
    if (state.subscribers.indexOf(clean) === -1) {
      state.subscribers.push(clean);
      write("subscribers", state.subscribers);
    }
    return { ok: true, message: "You're on the list — 15% off with WELCOME15." };
  }

  NS.store = {
    state,
    subscribe,
    products,
    productById,
    productBySlug,
    reviewsFor,
    ratingFor,
    money,
    convert,
    rate,
    setCurrency,
    cartKey,
    cartLines,
    addToCart,
    setQty,
    removeItem,
    clearCart,
    cartCount,
    subtotal,
    totals,
    setDelivery,
    promo,
    applyPromo,
    clearPromo,
    createOrder,
    getOrder,
    reorder,
    clearOrders,
    inWishlist,
    toggleWishlist,
    wishlistProducts,
    addReview,
    addProduct,
    updateProductPrice,
    deleteProduct,
    restoreProduct,
    resetAll,
    subscribeNewsletter,
    persist: write,
  };
})();
