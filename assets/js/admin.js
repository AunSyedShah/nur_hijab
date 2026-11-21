/* ==========================================================================
   NOOR — studio (admin) panel
   Adds, hides and edits products. Everything is written to localStorage so
   new pieces appear in the shop immediately.
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});
  const S = NS.store;
  const D = NS.data;
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const PASSCODE = "noor";
  const SESSION_KEY = "noor.admin.unlocked";

  const STYLES = [
    ["classic", "Classic drape"],
    ["wrap", "Wrap / draped band"],
    ["pleated", "Pleated"],
    ["printed", "Printed pattern"],
    ["bridal", "Bridal (pearl edges)"],
    ["instant", "Instant / turban"],
  ];
  const FABRICS = ["Jersey", "Cotton", "Modal", "Knit", "Silk", "Chiffon", "Satin", "Organza", "Tulle"];
  const BADGES = ["", "New", "Bestseller", "Limited", "Bridal"];
  const FAMILIES = Object.keys(NS.ui.FAMILY_COLORS);

  function unlocked() {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* noop */
    }
  }

  function gate() {
    return {
      title: "Studio — Noor",
      html:
        '<div class="gate"><div class="gate__card">' +
        '<p class="eyebrow">Staff only</p><h1>The studio</h1>' +
        "<p>Manage the catalogue, add new pieces and review recent orders. This is a prototype — the passcode is printed below.</p>" +
        '<form data-form="admin-login" class="gate__form" novalidate>' +
        '<label class="field"><span>Passcode</span><input name="passcode" type="password" autocomplete="off" placeholder="••••" required><em class="field__error" data-error="passcode"></em></label>' +
        '<button class="btn btn--ink btn--block" type="submit">Enter studio</button>' +
        "</form>" +
        '<p class="gate__hint">Demo passcode: <code>noor</code></p>' +
        "</div></div>",
    };
  }

  function colorRow(color) {
    const c = color || { name: "", hex: "#D8C3A5", family: "Neutral" };
    return (
      '<div class="color-row" data-color-row>' +
      '<input name="colorName" placeholder="Colour name" value="' + esc(c.name) + '" aria-label="Colour name">' +
      '<input type="color" name="colorHex" value="' + esc(c.hex) + '" aria-label="Colour swatch">' +
      '<select name="colorFamily" aria-label="Colour family">' +
      FAMILIES.map((f) => '<option' + (f === c.family ? " selected" : "") + ">" + f + "</option>").join("") +
      "</select>" +
      '<button type="button" class="icon-btn" data-action="remove-color" aria-label="Remove colour">' + NS.ui.icon("close") + "</button>" +
      "</div>"
    );
  }

  function productRow(p) {
    const isCustom = !!p.custom;
    return (
      '<tr data-row="' + p.id + '">' +
      '<td><span class="admin__thumb">' + NS.art.svg(p, { color: p.colors[0].name, view: "fold" }) + "</span></td>" +
      '<td><strong>' + esc(p.name) + "</strong><em>" + esc(D.collectionName(p.collection)) + " · " + esc(p.fabric) + "</em></td>" +
      "<td class=\"admin__price\">" +
      (isCustom
        ? '<form data-form="admin-price" data-id="' + p.id + '" class="inline-form"><input name="price" type="number" min="1" step="1" value="' + (p.price / 100).toFixed(2) + '" aria-label="Price in USD"><button class="btn btn--outline btn--xs" type="submit">Save</button></form>'
        : S.money(p.price)) +
      "</td>" +
      '<td class="admin__actions">' +
      '<a class="btn btn--ghost btn--xs" href="#/product/' + p.slug + '">View</a>' +
      '<button class="btn btn--ghost btn--xs" type="button" data-action="admin-delete" data-id="' + p.id + '" data-name="' + esc(p.name) + '">' + (isCustom ? "Delete" : "Hide") + "</button>" +
      "</td></tr>"
    );
  }

  function body() {
    const all = S.products();
    const hidden = S.state.hiddenIds
      .map((id) => D.PRODUCTS.find((p) => p.id === id))
      .filter(Boolean);
    const orders = S.state.orders;
    const revenue = orders.reduce((sum, o) => sum + o.totals.total, 0);
    const extras = all.filter((p) => p.custom);

    return (
      '<div class="admin" id="admin-root">' +
      '<header class="page-head page-head--row"><div><p class="eyebrow">Studio</p><h1>Catalogue</h1>' +
      "<p class=\"page-head__copy\">Add a piece and it appears in the shop instantly. Data lives in this browser only.</p></div>" +
      '<div class="admin__head-actions"><a class="btn btn--ghost btn--sm" href="#/shop">View shop</a>' +
      '<button class="btn btn--outline btn--sm" type="button" data-action="admin-reset">Reset demo data</button></div></header>' +

      '<div class="stats">' +
      [["Pieces live", all.length], [orders.length === 1 ? "Order" : "Orders", orders.length], ["Demo revenue", S.money(revenue)], ["Hidden", hidden.length]]
        .map((s) => '<div class="stat"><strong>' + s[1] + "</strong><span>" + s[0] + "</span></div>")
        .join("") +      "</div>" +

      '<div class="admin__layout">' +
      '<section class="panel"><header class="panel__head"><span class="panel__num">+</span><h2>Add a product</h2></header>' +
      '<form data-form="admin-product" id="admin-form" class="form" novalidate>' +
      '<div class="form-grid">' +
      '<label class="field field--full"><span>Product name</span><input name="name" required placeholder="e.g. Safa Crinkle Chiffon"><em class="field__error" data-error="name"></em></label>' +
      '<label class="field"><span>Collection</span><select name="collection">' +
      D.COLLECTIONS.map((c) => "<option value=\"" + c.id + '">' + esc(c.name) + "</option>").join("") +
      "</select></label>" +
      '<label class="field"><span>Price (USD)</span><input name="price" type="number" min="1" step="1" placeholder="38" required><em class="field__error" data-error="price"></em></label>' +
      '<label class="field"><span>Compare-at (optional)</span><input name="compareAt" type="number" min="0" step="1" placeholder="48"></label>' +
      '<label class="field"><span>Fabric</span><select name="fabric">' + FABRICS.map((f) => "<option>" + f + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Artwork style</span><select name="style">' + STYLES.map((s) => '<option value="' + s[0] + '">' + s[1] + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Badge</span><select name="badge">' + BADGES.map((b) => '<option value="' + b + '">' + (b || "No badge") + "</option>").join("") + "</select></label>" +
      "</div>" +
      '<div class="form__group"><span class="form__label">Colours</span><div id="color-rows">' +
      colorRow({ name: "Sand", hex: "#D8C3A5", family: "Neutral" }) +
      colorRow({ name: "Charcoal", hex: "#3E3A36", family: "Black" }) +
      '</div><button class="btn btn--ghost btn--sm" type="button" data-action="add-color">+ Add colour</button></div>' +
      '<label class="field"><span>Short blurb</span><input name="blurb" placeholder="One line for the product card" maxlength="120"></label>' +
      '<label class="field"><span>Description</span><textarea name="description" rows="4" placeholder="How it drapes, what it is made of, how it wears…"></textarea></label>' +
      '<label class="field"><span>Care instructions</span><input name="care" placeholder="Hand wash cold. Line dry."></label>' +
      '<label class="check check--inline"><input type="checkbox" name="featured"><span>Feature on the homepage</span></label>' +
      '<button class="btn btn--ink btn--block" type="submit">Publish product</button>' +
      "</form></section>" +

      '<section class="panel panel--wide"><header class="panel__head"><span class="panel__num">' + all.length + '</span><h2>All products</h2></header>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Product</th><th>Price</th><th></th></tr></thead><tbody>' +
      all.map(productRow).join("") +
      "</tbody></table></div>" +
      (extras.length ? '<p class="admin__note">' + extras.length + " piece" + (extras.length === 1 ? "" : "s") + " added in this browser.</p>" : "") +
      (hidden.length
        ? '<div class="admin__hidden"><h3>Hidden pieces</h3>' + hidden
            .map(
              (p) => '<div class="admin__hidden-row"><span>' + esc(p.name) + "</span>" +
                '<button class="btn btn--outline btn--xs" type="button" data-action="admin-restore" data-id="' + p.id + '">Restore</button></div>'
            )
            .join("") + "</div>"
        : "") +
      "</section></div>" +

      '<section class="panel panel--wide"><header class="panel__head"><span class="panel__num">' + orders.length + '</span><h2>Recent orders</h2></header>' +
      (orders.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
          orders
            .slice(0, 8)
            .map(
              (o) =>
                '<tr><td><a href="#/confirm/' + o.id + '"><strong>' + o.id + '</strong></a><em>' +
                new Date(o.date).toLocaleDateString("en-GB") + "</em></td>" +
                "<td>" + esc(o.customer.firstName + " " + o.customer.lastName) + "<em>" + esc(o.customer.city) + "</em></td>" +
                "<td>" + o.items.reduce((n, i) => n + i.qty, 0) + "</td>" +
                "<td>" + S.money(o.totals.total) + "</td>" +
                '<td><span class="pill pill--' + o.status + '">' + esc(o.status === "cod" ? "COD" : o.status) + "</span></td></tr>"
            )
            .join("") +
          "</tbody></table></div>"
        : '<p class="admin__note">No demo orders yet. Place one through checkout to see it here.</p>') +
      "</section></div>"
    );
  }

  NS.admin = {
    gate,
    body,
    unlocked,
    unlock,
    passcode: PASSCODE,
  };
})();
