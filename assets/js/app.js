/* ==========================================================================
   NOOR — app shell, router and interactions
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});
  const S = NS.store;
  const D = NS.data;
  const V = NS.views;
  const esc = NS.ui.esc;
  const icon = NS.ui.icon;

  const main = document.getElementById("main");
  const modalRoot = document.getElementById("modal-root");
  const toastRegion = document.getElementById("toast-region");
  const cartDrawer = document.getElementById("cart-drawer");
  const navDrawer = document.getElementById("nav-drawer");
  const scrim = document.getElementById("scrim");
  const searchPanel = document.getElementById("search-panel");
  const globalSearch = document.getElementById("global-search");

  let currentPath = "/";
  let currentParams = {};
  let toastTimer = null;

  /* ------------------------------------------------------------------ router */
  function parseRoute() {
    const raw = (window.location.hash || "#/").replace(/^#/, "") || "/";
    const split = raw.split("?");
    let path = split[0] || "/";
    if (!path.startsWith("/")) path = "/" + path;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    const params = {};
    new URLSearchParams(split[1] || "").forEach((value, key) => {
      params[key] = value;
    });
    return { path: path, params: params };
  }

  function resolve(path, params) {
    if (path === "/") return V.home();
    if (path === "/shop") return V.shop(params);
    if (path === "/cart") return V.cart();
    if (path === "/checkout") return V.checkout();
    if (path === "/wishlist") return V.wishlist();
    if (path === "/orders") return V.orders();
    if (path === "/about") return V.about();
    if (path === "/admin") return NS.admin.unlocked() ? { title: "Studio — Noor", html: NS.admin.body() } : NS.admin.gate();
    let m = path.match(/^\/product\/(.+)$/);
    if (m) return V.product(decodeURIComponent(m[1]));
    m = path.match(/^\/confirm\/(.+)$/);
    if (m) return V.confirm(decodeURIComponent(m[1]));
    return V.notFound();
  }

  function render(opts) {
    const route = parseRoute();
    const keepScroll = opts && opts.keepScroll;
    currentPath = route.path;
    currentParams = route.params;
    NS.checkoutController = null;
    closeOverlaysSilently();

    const view = resolve(route.path, route.params);
    main.innerHTML = view.html;
    document.title = view.title || "Noor";
    markNav(route.path);
    if (!keepScroll) {
      try {
        window.scrollTo(0, 0);
      } catch (e) {
        /* noop */
      }
    }
    if (view.mount) {
      try {
        view.mount();
      } catch (err) {
        console.error("[noor] mount failed", err);
      }
    }
    refreshChrome();
  }

  function markNav(path) {
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const target = link.getAttribute("data-nav");
      const on = target === path || (target === "/shop" && path === "/product");
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("hashchange", render);

  /* ---------------------------------------------------------------- chrome */
  function refreshChrome() {
    const count = S.cartCount();
    const select = document.getElementById("currency-select");
    if (select && select.value !== S.state.currency) select.value = S.state.currency;
    document.querySelectorAll("[data-free-ship]").forEach((el) => {
      el.textContent = S.money(D.SHIPPING.freeThreshold);
    });
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = count;
      el.classList.toggle("is-empty", count === 0);
    });
    document.querySelectorAll("[data-wish-count]").forEach((el) => {
      el.textContent = S.state.wishlist.length;
      el.classList.toggle("is-empty", S.state.wishlist.length === 0);
    });
    renderCartDrawer();
  }

  function renderCartDrawer() {
    const body = document.getElementById("cart-drawer-body");
    if (!body) return;
    const lines = S.cartLines();
    const t = S.totals();
    if (!lines.length) {
      body.innerHTML =
        '<div class="drawer__empty">' + icon("bag") + "<h3>Your bag is empty</h3><p>Add a piece to get started.</p>" +
        '<a class="btn btn--ink" href="#/shop" data-action="close-overlays">Shop the collection</a></div>';
      return;
    }
    body.innerHTML =
      '<div class="drawer__ship">' +
      (t.freeShipRemaining <= 0
        ? icon("check") + "<span>Free shipping unlocked</span>"
        : icon("truck") + "<span>Add " + S.money(t.freeShipRemaining) + " for free shipping</span>") +
      "</div>" +
      '<ul class="drawer__items">' +
      lines
        .map(
          (l) =>
            '<li><span class="drawer__thumb">' + NS.art.svg(l.product, { color: l.color.name, view: "fold" }) + "</span>" +
            '<div class="drawer__item-body"><a href="#/product/' + l.product.slug + '">' + esc(l.product.name) + "</a>" +
            '<em>' + esc(l.color.name) + " · " + esc(l.product.fabric) + "</em>" +
            '<div class="drawer__item-row"><div class="qty qty--sm"><button type="button" data-action="cart-qty" data-key="' + esc(l.key) + '" data-step="-1" aria-label="Decrease">' + icon("minus") + "</button>" +
            '<input value="' + l.qty + '" readonly aria-label="Quantity"><button type="button" data-action="cart-qty" data-key="' + esc(l.key) + '" data-step="1" aria-label="Increase">' + icon("plus") + "</button></div>" +
            "<strong>" + S.money(l.lineTotal) + "</strong></div></div></li>"
        )
        .join("") +
      "</ul>" +
      '<div class="drawer__foot"><div class="drawer__subtotal"><span>Subtotal</span><strong>' + S.money(t.subtotal) + "</strong></div>" +
      '<p class="drawer__note">Shipping and tax calculated at checkout.</p>' +
      '<a class="btn btn--ink btn--block" href="#/checkout" data-action="close-overlays">Checkout · ' + S.money(t.total) + "</a>" +
      '<a class="btn btn--ghost btn--block" href="#/cart" data-action="close-overlays">View bag</a></div>';
  }

  /* ------------------------------------------------------- store → view sync */
  S.subscribe(function () {
    refreshChrome();
    if (currentPath === "/cart" || currentPath === "/wishlist" || currentPath === "/orders") {
      render({ keepScroll: true });
    } else if (currentPath === "/checkout" && NS.checkoutController) {
      NS.checkoutController.refresh();
    }
  });

  /* --------------------------------------------------------------- overlays */
  function lockBody() {
    document.body.classList.add("is-locked");
  }
  function unlockBody() {
    if (!document.querySelector(".is-in.drawer, .is-in.search-panel, #modal-root.is-in, .pay-overlay")) {
      document.body.classList.remove("is-locked");
    }
  }

  function openDrawer(el) {
    if (!el) return;
    closeOverlaysSilently();
    el.classList.add("is-in");
    el.removeAttribute("hidden");
    scrim.classList.add("is-in");
    scrim.removeAttribute("hidden");
    lockBody();
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-hidden", "false");
    window.setTimeout(() => el.focus({ preventScroll: true }), 120);
  }

  function closeEl(el) {
    if (!el) return;
    el.classList.remove("is-in");
    el.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!el.classList.contains("is-in")) el.setAttribute("hidden", "");
    }, 260);
  }

  function closeAll() {
    closeEl(cartDrawer);
    closeEl(navDrawer);
    if (searchPanel) closeEl(searchPanel);
    closeModal();
    scrim.classList.remove("is-in");
    window.setTimeout(() => scrim.setAttribute("hidden", ""), 260);
    unlockBody();
  }

  function closeOverlaysSilently() {
    [cartDrawer, navDrawer, searchPanel].forEach((el) => {
      if (!el) return;
      el.classList.remove("is-in");
      el.setAttribute("hidden", "");
      el.setAttribute("aria-hidden", "true");
    });
    if (scrim) {
      scrim.classList.remove("is-in");
      scrim.setAttribute("hidden", "");
    }
    closeModal();
    unlockBody();
  }

  function openSearch() {
    if (!searchPanel) return;
    closeOverlaysSilently();
    searchPanel.removeAttribute("hidden");
    searchPanel.classList.add("is-in");
    scrim.removeAttribute("hidden");
    scrim.classList.add("is-in");
    lockBody();
    if (globalSearch) {
      globalSearch.value = "";
      window.setTimeout(() => globalSearch.focus(), 120);
    }
  }

  /* ------------------------------------------------------------------ modal */
  function openModal(html) {
    if (!modalRoot) return;
    modalRoot.innerHTML = '<div class="modal">' + html + "</div>";
    modalRoot.removeAttribute("hidden");
    modalRoot.classList.add("is-in");
    scrim.removeAttribute("hidden");
    scrim.classList.add("is-in");
    lockBody();
  }

  function closeModal() {
    if (!modalRoot) return;
    modalRoot.classList.remove("is-in");
    window.setTimeout(() => {
      if (!modalRoot.classList.contains("is-in")) {
        modalRoot.setAttribute("hidden", "");
        modalRoot.innerHTML = "";
      }
    }, 220);
  }

  function confirmDialog(opts, onConfirm) {
    const o = opts || {};
    openModal(
      '<div class="modal__head"><h3>' + esc(o.title || "Are you sure?") + "</h3>" +
      '<button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">' + icon("close") + "</button></div>" +
      '<p class="modal__copy">' + esc(o.message || "") + "</p>" +
      '<div class="modal__actions"><button type="button" class="btn btn--ghost" data-action="close-modal">Cancel</button>' +
      '<button type="button" class="btn ' + (o.danger ? "btn--danger" : "btn--ink") + '" data-confirm>' + esc(o.confirmLabel || "Confirm") + "</button></div>"
    );
    const btn = modalRoot.querySelector("[data-confirm]");
    if (btn) {
      btn.addEventListener("click", () => {
        closeModal();
        if (typeof onConfirm === "function") onConfirm();
      });
    }
  }

  /* ------------------------------------------------------------------ toast */
  function toast(message, type) {
    if (!toastRegion) return;
    window.clearTimeout(toastTimer);
    toastRegion.innerHTML =
      '<div class="toast toast--' + (type || "ok") + '">' +
      '<span class="toast__icon">' + icon(type === "error" ? "close" : "check") + "</span>" +
      "<span>" + esc(message) + "</span></div>";
    toastRegion.classList.add("is-in");
    toastTimer = window.setTimeout(() => toastRegion.classList.remove("is-in"), 3400);
  }

  function pulseCart() {
    document.querySelectorAll("[data-action='open-cart']").forEach((el) => {
      el.classList.remove("is-bump");
      void el.offsetWidth;
      el.classList.add("is-bump");
    });
  }

  /* ----------------------------------------------------------------- actions */
  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");

    switch (action) {
      case "open-cart":
        e.preventDefault();
        openDrawer(cartDrawer);
        break;
      case "close-cart":
      case "close-nav":
      case "close-search":
      case "close-overlays":
      case "close-modal":
        if (actionEl.tagName === "BUTTON") e.preventDefault();
        if (action === "close-modal") closeModal();
        else closeAll();
        break;
      case "open-nav":
        e.preventDefault();
        openDrawer(navDrawer);
        break;
      case "open-search":
        e.preventDefault();
        openSearch();
        break;
      case "search-term": {
        const term = actionEl.getAttribute("data-term") || "";
        window.location.hash = "#/shop?q=" + encodeURIComponent(term);
        closeAll();
        break;
      }
      case "scroll-reviews": {
        const target = document.getElementById("reviews");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "wishlist": {
        e.preventDefault();
        const id = actionEl.getAttribute("data-id");
        const on = S.toggleWishlist(id);
        document.querySelectorAll('[data-action="wishlist"][data-id="' + id + '"]').forEach((btn) => {
          btn.classList.toggle("is-on", on);
          btn.setAttribute("aria-pressed", on);
          btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Save to wishlist");
        });
        toast(on ? "Saved to your wishlist." : "Removed from your wishlist.");
        break;
      }
      case "add-to-cart": {
        e.preventDefault();
        const id = actionEl.getAttribute("data-id");
        const color = actionEl.getAttribute("data-color");
        const sourceId = actionEl.getAttribute("data-qty-source");
        let qty = 1;
        if (sourceId) {
          const input = document.getElementById(sourceId);
          if (input) qty = parseInt(input.value, 10) || 1;
        }
        const product = S.addToCart(id, color, qty);
        if (product) {
          toast(product.name + " added to your bag.");
          pulseCart();
          if (product.id) {
            const addBtn = actionEl;
            addBtn.classList.add("is-added");
            window.setTimeout(() => addBtn.classList.remove("is-added"), 900);
          }
        } else {
          toast("That piece is no longer available.", "error");
        }
        break;
      }
      case "cart-qty": {
        const key = actionEl.getAttribute("data-key");
        const step = parseInt(actionEl.getAttribute("data-step"), 10);
        const item = S.state.cart.find((i) => S.cartKey(i.id, i.color) === key);
        if (item) S.setQty(key, item.qty + step);
        break;
      }
      case "cart-remove":
        S.removeItem(actionEl.getAttribute("data-key"));
        toast("Removed from your bag.");
        break;
      case "remove-promo":
        S.clearPromo();
        toast("Promo code removed.");
        if (currentPath === "/cart") render();
        else if (NS.checkoutController) NS.checkoutController.refresh();
        break;
      case "fill-promo": {
        const code = actionEl.getAttribute("data-code");
        const res = S.applyPromo(code);
        toast(res.message, res.ok ? "ok" : "error");
        if (res.ok) {
          if (currentPath === "/cart") render();
          else if (NS.checkoutController) NS.checkoutController.refresh();
        }
        break;
      }
      case "toggle-order": {
        const id = actionEl.getAttribute("data-id");
        const card = document.querySelector('[data-order="' + id + '"]');
        if (card) {
          const details = card.querySelector(".order__details");
          const open = details.hasAttribute("hidden");
          if (open) details.removeAttribute("hidden");
          else details.setAttribute("hidden", "");
          actionEl.textContent = open ? "Hide details" : "View details";
        }
        break;
      }
      case "reorder": {
        const order = S.getOrder(actionEl.getAttribute("data-id"));
        if (order) {
          S.reorder(order);
          toast("Added " + order.items.length + " piece(s) back to your bag.");
          if (currentPath === "/cart") render();
          else window.location.hash = "#/cart";
        }
        break;
      }
      case "clear-orders":
        confirmDialog(
          { title: "Clear order history?", message: "This removes every demo order from this browser. It cannot be undone.", confirmLabel: "Clear history", danger: true },
          () => {
            S.clearOrders();
            toast("Order history cleared.");
            render();
          }
        );
        break;
      case "admin-delete": {
        const id = actionEl.getAttribute("data-id");
        const name = actionEl.getAttribute("data-name");
        confirmDialog(
          { title: "Remove " + name + "?", message: "The piece disappears from the shop. You can restore hidden products at the bottom of the catalogue.", confirmLabel: "Remove", danger: true },
          () => {
            S.deleteProduct(id);
            toast(name + " removed.");
            render();
          }
        );
        break;
      }
      case "admin-restore": {
        S.restoreProduct(actionEl.getAttribute("data-id"));
        toast("Piece restored.");
        render();
        break;
      }
      case "admin-reset":
        confirmDialog(
          { title: "Reset the whole prototype?", message: "Products, orders, the bag, wishlist and reviews will all be cleared from this browser.", confirmLabel: "Reset everything", danger: true },
          () => {
            S.resetAll();
            toast("Demo data reset.");
            render();
          }
        );
        break;
      case "open-filters":
        break;
      case "close-filters":
        break;
      case "add-color": {
        const rows = document.getElementById("color-rows");
        if (rows) rows.insertAdjacentHTML("beforeend", document.getElementById("color-row-template").innerHTML);
        break;
      }
      case "remove-color": {
        const row = actionEl.closest("[data-color-row]");
        const rows = document.getElementById("color-rows");
        if (row && rows && rows.querySelectorAll("[data-color-row]").length > 1) row.remove();
        else toast("Keep at least one colour.", "error");
        break;
      }
      default:
        break;
    }
  });

  /* ------------------------------------------------------------------- forms */
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    const kind = form.getAttribute("data-form");

    if (kind === "checkout") return; // handled inside the checkout view
    e.preventDefault();

    if (kind === "newsletter") {
      const email = form.elements.email ? form.elements.email.value : "";
      const res = S.subscribeNewsletter(email);
      toast(res.message, res.ok ? "ok" : "error");
      if (res.ok) form.reset();
      return;
    }

    if (kind === "search") {
      const val = (form.elements.q ? form.elements.q.value : "").trim();
      const url = val ? "#/shop?q=" + encodeURIComponent(val) : "#/shop";
      closeAll();
      if (window.location.hash === url) render();
      else window.location.hash = url;
      return;
    }

    if (kind === "promo") {
      const res = S.applyPromo(form.elements.code ? form.elements.code.value : "");
      toast(res.message, res.ok ? "ok" : "error");
      if (res.ok) {
        if (currentPath === "/cart") render();
        else if (NS.checkoutController) NS.checkoutController.refresh();
        else refreshChrome();
      }
      return;
    }

    if (kind === "review") {
      const id = form.getAttribute("data-id");
      const name = (form.elements.name.value || "").trim();
      const title = (form.elements.title.value || "").trim();
      const text = (form.elements.text.value || "").trim();
      const rating = parseInt(form.elements.rating.value, 10) || 5;
      if (name.length < 2 || text.length < 10) {
        toast("Add your name and a few words about the piece.", "error");
        return;
      }
      S.addReview(id, { name: name, title: title || "Verified purchase", text: text, rating: rating });
      toast("Thank you — your review is published.");
      render();
      return;
    }

    if (kind === "admin-login") {
      const value = (form.elements.passcode.value || "").trim().toLowerCase();
      const slot = form.querySelector('[data-error="passcode"]');
      if (value === NS.admin.passcode) {
        NS.admin.unlock();
        toast("Welcome to the studio.");
        render();
      } else if (slot) {
        slot.textContent = "That passcode is not right. Try “noor”.";
        form.elements.passcode.classList.add("is-invalid");
      }
      return;
    }

    if (kind === "admin-product") {
      const get = (n) => (form.elements[n] ? String(form.elements[n].value || "").trim() : "");
      const name = get("name");
      const price = parseFloat(get("price"));
      const errors = {};
      if (name.length < 3) errors.name = "Give the piece a name.";
      if (!price || price <= 0) errors.price = "Enter a price above 0.";
      Object.keys(errors).forEach((k) => {
        const slot = form.querySelector('[data-error="' + k + '"]');
        if (slot) slot.textContent = errors[k];
      });
      if (Object.keys(errors).length) {
        toast("Check the highlighted fields.", "error");
        return;
      }
      const colors = Array.from(form.querySelectorAll("[data-color-row]"))
        .map((row) => ({
          name: (row.querySelector('[name="colorName"]').value || "").trim(),
          hex: row.querySelector('[name="colorHex"]').value || "#D8C3A5",
          family: row.querySelector('[name="colorFamily"]').value || "Neutral",
        }))
        .filter((c) => c.name);
      if (!colors.length) colors.push({ name: "Sand", hex: "#D8C3A5", family: "Neutral" });
      const product = S.addProduct({
        name: name,
        collection: get("collection"),
        price: price,
        compareAt: get("compareAt") ? parseFloat(get("compareAt")) : null,
        fabric: get("fabric"),
        style: get("style"),
        badge: get("badge") || null,
        blurb: get("blurb") || name + " — new in the studio.",
        description: get("description"),
        care: get("care"),
        featured: !!form.elements.featured.checked,
        colors: colors,
      });
      toast(product.name + " is live in the shop.");
      render();
      return;
    }

    if (kind === "admin-price") {
      const id = form.getAttribute("data-id");
      const price = parseFloat(form.elements.price.value);
      if (!price || price <= 0) {
        toast("Enter a valid price.", "error");
        return;
      }
      S.updateProductPrice(id, price);
      toast("Price updated.");
      render();
      return;
    }
  });

  /* --------------------------------------------------------------- currency */
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "currency-select") {
      const code = e.target.value;
      S.setCurrency(code);
      if (currentPath === "/checkout") {
        if (NS.checkoutController) NS.checkoutController.refresh();
      } else if (currentPath !== "/cart" && currentPath !== "/wishlist" && currentPath !== "/orders") {
        render();
      }
    }
  });

  /* ------------------------------------------------------------------- keys */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    }
  });

  if (scrim) {
    scrim.addEventListener("click", () => closeAll());
  }

  /* ------------------------------------------------------------------- boot */
  NS.app = { render, toast, confirm: confirmDialog, openModal, closeAll, refreshChrome };

  // render once the DOM is ready (script is deferred, so this is immediate)
  render();
})();
