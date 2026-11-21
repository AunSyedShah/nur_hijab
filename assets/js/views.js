/* ==========================================================================
   NOOR — views
   Each view returns { title, html, mount? }. Plain template strings, no deps.
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});
  const S = NS.store;
  const D = NS.data;

  /* ------------------------------------------------------------------ helpers */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const ICONS = {
    heart: '<path d="M12 20.2S4 15.4 4 9.9A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 5.5-8 10.3-8 10.3z"/>',
    bag: '<path d="M6.2 8h11.6l-1.1 12H7.3L6.2 8z"/><path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8"/>',
    search: '<circle cx="11" cy="11" r="6.4"/><path d="M16 16l4 4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    shield: '<path d="M12 3.5l7 2.7v5.3c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6.2z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    leaf: '<path d="M20 4c-8 0-14 3.6-14 10a6 6 0 0 0 6 6c6.4 0 8-6 8-16z"/><path d="M4 20c3-6 7-9 12-11"/>',
    arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
    minus: '<path d="M6 12h12"/>',
    plus: '<path d="M12 6v12M6 12h12"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9.5 7V5.5h5V7"/><path d="M6.5 7l1 12.5h9L17.5 7"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  };

  function icon(name, cls) {
    return (
      '<svg class="icon ' +
      (cls || "") +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  function starIcon(filled) {
    return (
      '<svg class="star' +
      (filled ? " is-filled" : "") +
      '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.85 5.9 6.45.85-4.7 4.55 1.15 6.5L12 17.5l-5.75 3.1 1.15-6.5L2.7 9.55l6.45-.85z" fill="currentColor"/></svg>'
    );
  }

  function stars(rating) {
    let out = "";
    for (let i = 1; i <= 5; i += 1) out += starIcon(i <= Math.round(rating));
    return '<span class="stars" aria-label="' + rating + ' out of 5 stars">' + out + "</span>";
  }

  function art(p, colorName, view, label) {
    return NS.art.svg(p, { color: colorName, view: view || "drape", label: label });
  }

  const FAMILY_COLORS = {
    Neutral: "#D8C3A5",
    Black: "#262322",
    Pink: "#C9A0A0",
    Blue: "#7A8A9A",
    Green: "#7C7A5C",
    Red: "#A0524B",
    Purple: "#8B6A96",
    Metallic: "#B08A4F",
    Grey: "#B9B4AC",
  };

  function badge(p) {
    if (!p.badge) return "";
    const kind = p.badge.toLowerCase().replace(/[^a-z]/g, "");
    return '<span class="badge badge--' + kind + '">' + esc(p.badge) + "</span>";
  }

  function priceHtml(p) {
    const now = S.money(p.price);
    const was = p.compareAt && p.compareAt > p.price ? ' <s class="price__was">' + S.money(p.compareAt) + "</s>" : "";
    return '<span class="price">' + now + was + "</span>";
  }

  function ratingInline(p) {
    const r = S.ratingFor(p);
    return '<span class="rating-inline">' + stars(r.rating) + '<span class="rating-inline__text">' + r.rating.toFixed(1) + " (" + r.count + ")</span></span>";
  }

  function heartButton(p, extraClass) {
    const on = S.inWishlist(p.id);
    return (
      '<button class="heart ' +
      (on ? "is-on" : "") +
      (extraClass ? " " + extraClass : "") +
      '" type="button" data-action="wishlist" data-id="' +
      p.id +
      '" aria-pressed="' +
      on +
      '" aria-label="' +
      (on ? "Remove from wishlist" : "Save to wishlist") +
      '">' +
      icon("heart") +
      "</button>"
    );
  }

  function swatchDots(p, max) {
    const limit = max || 3;
    return (
      '<span class="swatches">' +
      p.colors
        .slice(0, limit)
        .map((c) => '<span class="swatch-dot" style="background:' + c.hex + '" title="' + esc(c.name) + '"></span>')
        .join("") +
      (p.colors.length > limit ? '<span class="swatch-more">+' + (p.colors.length - limit) + "</span>" : "") +
      "</span>"
    );
  }

  function productCard(p) {
    return (
      '<article class="card" data-product="' + p.id + '">' +
      '<div class="card__media">' +
      '<a class="card__link" href="#/product/' + p.slug + '" aria-label="View ' + esc(p.name) + '">' +
      art(p, p.colors[0].name, "drape") +
      "</a>" +
      badge(p) +
      heartButton(p) +
      "</div>" +
      '<div class="card__body">' +
      '<p class="card__collection">' + esc(D.collectionName(p.collection)) + "</p>" +
      '<h3 class="card__title"><a href="#/product/' + p.slug + '">' + esc(p.name) + "</a></h3>" +
      '<div class="card__row">' + swatchDots(p) + ratingInline(p) + "</div>" +
      '<div class="card__foot">' + priceHtml(p) +
      '<button class="btn btn--ink btn--sm" type="button" data-action="add-to-cart" data-id="' + p.id + '" data-color="' + esc(p.colors[0].name) + '">Add to bag</button>' +
      "</div></div></article>"
    );
  }

  function productGrid(list, cols) {
    return '<div class="grid grid--products' + (cols ? " grid--" + cols : "") + '">' + list.map(productCard).join("") + "</div>";
  }

  function emptyState(title, copy, cta) {
    return (
      '<div class="empty">' +
      '<div class="empty__mark">' + icon("spark") + "</div>" +
      "<h2>" + esc(title) + "</h2>" +
      "<p>" + esc(copy) + "</p>" +
      (cta ? '<a class="btn btn--ink" href="' + cta.href + '">' + esc(cta.label) + "</a>" : "") +
      "</div>"
    );
  }

  function pageHead(eyebrow, title, copy) {
    return (
      '<header class="page-head">' +
      (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : "") +
      "<h1>" + esc(title) + "</h1>" +
      (copy ? '<p class="page-head__copy">' + esc(copy) + "</p>" : "") +
      "</header>"
    );
  }

  function freeShipBar(t) {
    if (t.subtotal === 0) return "";
    if (t.freeShipRemaining <= 0) {
      return '<div class="ship-bar is-done">' + icon("check") + "<span>Free shipping unlocked</span></div>";
    }
    const pct = Math.min(100, Math.round(((t.subtotal - t.discount) / D.SHIPPING.freeThreshold) * 100));
    return (
      '<div class="ship-bar"><div class="ship-bar__top">' + icon("truck") +
      "<span>Add " + S.money(t.freeShipRemaining) + " for free shipping</span></div>" +
      '<div class="ship-bar__track"><span style="width:' + Math.max(4, pct) + '%"></span></div></div>'
    );
  }

  /* --------------------------------------------------------------------- home */
  const views = {};

  views.home = function () {
    const all = S.products();
    const featured = all.filter((p) => p.featured).slice(0, 4);
    const heroProducts = [S.productBySlug("nur-satin-silk"), S.productBySlug("zaynab-floral-bloom"), S.productBySlug("farida-instant-turban")].filter(Boolean);

    const collectionTiles = D.COLLECTIONS.map((col) => {
      const items = all.filter((p) => p.collection === col.id);
      const sample = items[0];
      return (
        '<a class="col-tile" href="#/shop?collection=' + col.id + '">' +
        '<span class="col-tile__media">' +
        (sample ? art(sample, sample.colors[0].name, "drape") : "") +
        "</span>" +
        '<span class="col-tile__body"><span class="col-tile__name">' + esc(col.name) + "</span>" +
        '<span class="col-tile__tag">' + esc(col.tagline) + "</span>" +
        '<span class="col-tile__count">' + items.length + " pieces</span></span></a>"
      );
    }).join("");

    const testimonials = [
      { text: D.REVIEW_POOL[1].text, name: D.REVIEW_POOL[1].name, rating: 5, product: "Nur Satin Silk" },
      { text: D.REVIEW_POOL[6].text, name: D.REVIEW_POOL[6].name, rating: 5, product: "Iman Chiffon Luxe" },
      { text: D.REVIEW_POOL[3].text, name: D.REVIEW_POOL[3].name, rating: 5, product: "Layla Everyday Jersey" },
    ];

    return {
      title: "Noor — Hijabs, hand finished",
      html:
        '<section class="hero">' +
        '<div class="hero__copy">' +
        '<p class="eyebrow"><span class="dot"></span>The winter drape · 2026</p>' +
        "<h1>Cover beautifully.<br><em>Live fully.</em></h1>" +
        '<p class="lede">Hijabs cut from silk, chiffon and breathable jersey — hand-finished edges, colours matched to real life, and a drape that stays put from fajr to maghrib.</p>' +
        '<div class="hero__actions"><a class="btn btn--ink btn--lg" href="#/shop">Shop the collection</a>' +
        '<a class="btn btn--ghost btn--lg" href="#/about">Our story ' + icon("arrow") + "</a></div>" +
        '<div class="hero__proof"><span class="hero__stars">' + stars(4.9) + "</span>" +
        "<span><strong>4.9</strong> from 1,240 reviews</span><span class=\"hero__sep\"></span><span>Free shipping over " + S.money(D.SHIPPING.freeThreshold) + "</span></div>" +
        "</div>" +
        '<div class="hero__art">' +
        '<div class="hero__frame">' + (heroProducts[0] ? art(heroProducts[0], "Emerald", "drape", "Nur Satin Silk in emerald") : "") + "</div>" +
        '<div class="hero__float hero__float--a">' + (heroProducts[1] ? art(heroProducts[1], "Garden Rose", "fold") : "") + "</div>" +
        '<div class="hero__float hero__float--b">' + (heroProducts[2] ? art(heroProducts[2], "Caramel", "drape") : "") + "</div>" +
        '<div class="hero__tag"><span class="hero__tag-num">24</span><span>hand-finished<br>pieces</span></div>' +
        "</div></section>" +

        '<div class="marquee"><div class="marquee__track">' +
        ["Hand-rolled hems", "Ethically sourced fabric", "Free shipping over " + S.money(D.SHIPPING.freeThreshold), "30-day returns", "Small-batch colourways", "Wrapped by hand in London"]
          .map((t) => '<span class="marquee__item">' + icon("spark") + esc(t) + "</span>")
          .join("") +
        "</div></div>" +

        '<section class="section">' +
        '<div class="section__head"><div><p class="eyebrow">Six collections</p><h2>Find your drape</h2></div>' +
        '<a class="link-arrow" href="#/shop">All ' + all.length + " pieces " + icon("arrow") + "</a></div>" +
        '<div class="col-grid">' + collectionTiles + "</div>" +
        "</section>" +

        '<section class="section section--tint">' +
        '<div class="section__head"><div><p class="eyebrow">Loved by you</p><h2>Bestsellers</h2></div>' +
        '<a class="link-arrow" href="#/shop?sort=rating">Top rated ' + icon("arrow") + "</a></div>" +
        productGrid(featured) +
        "</section>" +

        '<section class="section editorial">' +
        '<div class="editorial__art">' + (all[9] ? art(all[9], all[9].colors[0].name, "drape", "Pleated chiffon detail") : "") +
        '<div class="editorial__caption">Ruqayya pleated chiffon, styled three ways.</div></div>' +
        '<div class="editorial__copy"><p class="eyebrow">The journal</p><h2>The art of the drape</h2>' +
        "<p>There is no single right way to wrap. What there is, is a fabric that behaves — one that holds a pleat, forgives a pin, and falls back into place when you stand up.</p>" +
        '<ol class="steps">' +
        "<li><span>01</span><div><strong>Start with a base</strong><p>A cotton undercap keeps everything in place and protects the fabric from oils.</p></div></li>" +
        "<li><span>02</span><div><strong>Find your anchor</strong><p>Pin once at the crown, not at the temple. One pin is usually enough.</p></div></li>" +
        "<li><span>03</span><div><strong>Let it fall</strong><p>Long side forward, short side tucked. Adjust the volume, not the length.</p></div></li>" +
        "</ol>" +
        '<a class="btn btn--outline" href="#/about">Read our story</a></div>' +
        "</section>" +

        '<section class="section">' +
        '<div class="section__head"><div><p class="eyebrow">Reviews</p><h2>Quietly obsessed</h2></div>' +
        '<span class="section__meta">' + stars(4.9) + " 4.9 average · 1,240 reviews</span></div>" +
        '<div class="quote-grid">' +
        testimonials
          .map(
            (t) =>
              '<figure class="quote"><div class="quote__stars">' + stars(t.rating) + "</div>" +
              '<blockquote>"' + esc(t.text) + '"</blockquote>' +
              "<figcaption><span class=\"avatar\">" + esc(t.name.charAt(0)) + "</span><span><strong>" + esc(t.name) + "</strong><em>" + esc(t.product) + "</em></span></figcaption></figure>"
          )
          .join("") +
        "</div></section>" +

        '<section class="newsletter">' +
        '<div><p class="eyebrow">The list</p><h2>First look, first pick</h2>' +
        "<p>New colourways, restocks and 15% off your first order. One email a fortnight, never more.</p></div>" +
        '<form class="newsletter__form" data-form="newsletter" novalidate><label class="sr-only" for="news-email">Email address</label>' +
        '<input id="news-email" name="email" type="email" placeholder="you@email.com" autocomplete="email" required>' +
        '<button class="btn btn--ink" type="submit">Subscribe</button></form>' +
        "</section>",
    };
  };

  /* --------------------------------------------------------------------- shop */
  views.shop = function (params) {
    const all = S.products();
    const fabrics = Array.from(new Set(all.map((p) => p.fabric))).sort();
    const families = Object.keys(FAMILY_COLORS);

    const filters = {
      q: (params.q || "").trim(),
      collections: params.collection ? [params.collection] : [],
      fabrics: [],
      families: [],
      maxPrice: 20000,
      sort: params.sort || "featured",
    };
    if (params.collection && !D.collectionById(params.collection)) filters.collections = [];

    const activeCollection = filters.collections.length === 1 ? D.collectionById(filters.collections[0]) : null;
    const heading = activeCollection ? activeCollection.name : filters.q ? "Results for “" + filters.q + "”" : "Every piece we make";
    const copy = activeCollection
      ? activeCollection.blurb
      : "Silk, chiffon, cotton and jersey — cut, finished and photographed in our studio. Filter by fabric, colour or price to find your next everyday.";

    const collectionChecks = D.COLLECTIONS.map(
      (col) =>
        '<label class="check"><input type="checkbox" data-filter="collection" value="' + col.id + '"' +
        (filters.collections.indexOf(col.id) > -1 ? " checked" : "") +
        "><span>" + esc(col.name) + "</span></label>"
    ).join("");

    const fabricChecks = fabrics
      .map(
        (f) =>
          '<label class="check"><input type="checkbox" data-filter="fabric" value="' + esc(f) + '"><span>' + esc(f) + "</span></label>"
      )
      .join("");

    const familySwatches = families
      .map(
        (f) =>
          '<button type="button" class="swatch-btn" data-filter="family" data-value="' + f + '" aria-pressed="false" title="' + f + '">' +
          '<span class="swatch-btn__dot" style="background:' + FAMILY_COLORS[f] + '"></span><span class="swatch-btn__label">' + f + "</span></button>"
      )
      .join("");

    return {
      title: "Shop — Noor",
      html:
        '<div class="shop" id="shop-root">' +
        pageHead(activeCollection ? "Collection" : "Shop", heading, copy) +
        '<div class="shop__layout">' +
        '<aside class="filters" id="shop-filters" aria-label="Filters">' +
        '<div class="filters__head"><h2>Filter</h2><button class="filters__close btn btn--ghost btn--sm" type="button" data-action="close-filters">Close</button></div>' +
        '<div class="filters__group"><h3>Collection</h3>' + collectionChecks + "</div>" +
        '<div class="filters__group"><h3>Fabric</h3>' + fabricChecks + "</div>" +
        '<div class="filters__group"><h3>Colour</h3><div class="swatch-grid">' + familySwatches + "</div></div>" +
        '<div class="filters__group"><h3>Price</h3><label class="range"><input type="range" min="2000" max="20000" step="500" value="20000" id="price-range">' +
        '<span class="range__label" id="price-label">Up to ' + S.money(20000) + "</span></label></div>" +
        '<button class="btn btn--outline btn--block" type="button" data-action="clear-filters">Clear all</button>' +
        "</aside>" +
        '<div class="shop__main">' +
        '<div class="toolbar">' +
        '<div class="toolbar__search"><span class="toolbar__search-icon">' + icon("search") + "</span>" +
        '<input type="search" id="shop-search" placeholder="Search silk, chiffon, ivory…" value="' + esc(filters.q) + '" aria-label="Search products"></div>' +
        '<div class="toolbar__right"><button class="btn btn--outline btn--sm filters__toggle" type="button" data-action="open-filters">' + icon("menu") + " Filters</button>" +
        '<label class="sort"><span>Sort</span><select id="shop-sort">' +
        '<option value="featured">Featured</option><option value="new">Newest</option><option value="price-asc">Price: low to high</option>' +
        '<option value="price-desc">Price: high to low</option><option value="rating">Top rated</option></select></label></div></div>' +
        '<div class="chips" id="active-chips"></div>' +
        '<p class="shop__count" id="shop-count" aria-live="polite"></p>' +
        '<div id="shop-grid"></div>' +
        "</div></div></div>",

      mount() {
        const root = document.getElementById("shop-root");
        if (!root) return;
        const grid = document.getElementById("shop-grid");
        const countEl = document.getElementById("shop-count");
        const chipsEl = document.getElementById("active-chips");
        const searchEl = document.getElementById("shop-search");
        const sortEl = document.getElementById("shop-sort");
        const rangeEl = document.getElementById("price-range");
        const priceLabel = document.getElementById("price-label");
        const filtersEl = document.getElementById("shop-filters");

        if (sortEl) sortEl.value = filters.sort;

        function matches(p) {
          if (filters.collections.length && filters.collections.indexOf(p.collection) === -1) return false;
          if (filters.fabrics.length && filters.fabrics.indexOf(p.fabric) === -1) return false;
          if (p.price > filters.maxPrice) return false;
          if (filters.families.length) {
            const has = p.colors.some((c) => filters.families.indexOf(c.family) > -1);
            if (!has) return false;
          }
          if (filters.q) {
            const hay = (p.name + " " + p.fabric + " " + D.collectionName(p.collection) + " " + p.blurb + " " +
              p.colors.map((c) => c.name + " " + c.family).join(" ")).toLowerCase();
            if (filters.q.toLowerCase().split(/\s+/).some((word) => word && hay.indexOf(word) === -1)) return false;
          }
          return true;
        }

        function sorted(list) {
          const out = list.slice();
          switch (filters.sort) {
            case "price-asc":
              return out.sort((a, b) => a.price - b.price);
            case "price-desc":
              return out.sort((a, b) => b.price - a.price);
            case "rating":
              return out.sort((a, b) => S.ratingFor(b).rating - S.ratingFor(a).rating);
            case "new":
              return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
            default:
              return out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
          }
        }

        function chips() {
          const list = [];
          filters.collections.forEach((id) => list.push({ label: D.collectionName(id), kind: "collection", value: id }));
          filters.fabrics.forEach((f) => list.push({ label: f, kind: "fabric", value: f }));
          filters.families.forEach((f) => list.push({ label: f, kind: "family", value: f }));
          if (filters.maxPrice < 20000) list.push({ label: "Under " + S.money(filters.maxPrice), kind: "price", value: "" });
          if (filters.q) list.push({ label: "“" + filters.q + "”", kind: "q", value: "" });
          if (!list.length) return "";
          return (
            list
              .map(
                (c) =>
                  '<button class="chip" type="button" data-action="remove-chip" data-kind="' + c.kind + '" data-value="' + esc(c.value) + '">' +
                  esc(c.label) + icon("close") + "</button>"
              )
              .join("") +
            '<button class="chip chip--clear" type="button" data-action="clear-filters">Clear all</button>'
          );
        }

        function paint() {
          const list = sorted(all.filter(matches));
          grid.innerHTML =
            list.length === 0
              ? '<div class="empty"><div class="empty__mark">' + icon("search") + "</div><h2>Nothing matches yet</h2>" +
                "<p>Try a different fabric, colour or a wider price range.</p>" +
                '<button class="btn btn--ink" type="button" data-action="clear-filters">Clear filters</button></div>'
              : productGrid(list);
          countEl.textContent = list.length + (list.length === 1 ? " piece" : " pieces") + " found";
          chipsEl.innerHTML = chips();
          priceLabel.textContent = filters.maxPrice >= 20000 ? "Any price" : "Up to " + S.money(filters.maxPrice);
          document.querySelectorAll("[data-filter='family']").forEach((b) => {
            b.setAttribute("aria-pressed", filters.families.indexOf(b.dataset.value) > -1 ? "true" : "false");
            b.classList.toggle("is-on", filters.families.indexOf(b.dataset.value) > -1);
          });
          syncUrl();
        }

        function syncUrl() {
          const qs = [];
          if (filters.q) qs.push("q=" + encodeURIComponent(filters.q));
          filters.collections.forEach((c) => qs.push("collection=" + encodeURIComponent(c)));
          if (filters.sort !== "featured") qs.push("sort=" + encodeURIComponent(filters.sort));
          const url = "#/shop" + (qs.length ? "?" + qs.join("&") : "");
          try {
            window.history.replaceState(null, "", url);
          } catch (e) {
            /* file:// in some browsers */
          }
        }

        function reset() {
          filters.collections = [];
          filters.fabrics = [];
          filters.families = [];
          filters.maxPrice = 20000;
          filters.q = "";
          filters.sort = "featured";
          root.querySelectorAll("input[data-filter]").forEach((el) => {
            el.checked = false;
          });
          if (searchEl) searchEl.value = "";
          if (rangeEl) rangeEl.value = 20000;
          if (sortEl) sortEl.value = "featured";
          paint();
        }

        root.addEventListener("change", (e) => {
          const el = e.target;
          if (el.id === "shop-sort") {
            filters.sort = el.value;
            paint();
          } else if (el.dataset.filter === "collection" || el.dataset.filter === "fabric") {
            const bucket = el.dataset.filter === "collection" ? filters.collections : filters.fabrics;
            const idx = bucket.indexOf(el.value);
            if (el.checked && idx === -1) bucket.push(el.value);
            if (!el.checked && idx > -1) bucket.splice(idx, 1);
            paint();
          }
        });

        if (rangeEl) {
          rangeEl.addEventListener("input", () => {
            filters.maxPrice = parseInt(rangeEl.value, 10);
            paint();
          });
        }

        root.addEventListener("click", (e) => {
          const swatch = e.target.closest("[data-filter='family']");
          if (swatch) {
            const value = swatch.dataset.value;
            const idx = filters.families.indexOf(value);
            if (idx > -1) filters.families.splice(idx, 1);
            else filters.families.push(value);
            paint();
            return;
          }
          const chip = e.target.closest("[data-action='remove-chip']");
          if (chip) {
            const kind = chip.dataset.kind;
            const value = chip.dataset.value;
            if (kind === "collection") filters.collections = filters.collections.filter((x) => x !== value);
            if (kind === "fabric") filters.fabrics = filters.fabrics.filter((x) => x !== value);
            if (kind === "family") filters.families = filters.families.filter((x) => x !== value);
            if (kind === "price") {
              filters.maxPrice = 20000;
              if (rangeEl) rangeEl.value = 20000;
            }
            if (kind === "q") {
              filters.q = "";
              if (searchEl) searchEl.value = "";
            }
            const box = root.querySelector("input[data-filter][value='" + value.replace(/'/g, "\\'") + "']");
            if (box) box.checked = false;
            paint();
            return;
          }
          if (e.target.closest("[data-action='clear-filters']")) {
            reset();
            return;
          }
          if (e.target.closest("[data-action='open-filters']")) {
            filtersEl.classList.add("is-open");
            return;
          }
          if (e.target.closest("[data-action='close-filters']")) {
            filtersEl.classList.remove("is-open");
          }
        });

        let timer = null;
        if (searchEl) {
          searchEl.addEventListener("input", () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              filters.q = searchEl.value.trim();
              paint();
            }, 220);
          });
        }

        paint();
      },
    };
  };

  /* ------------------------------------------------------------------ product */
  views.product = function (slug) {
    const p = S.productBySlug(slug);
    if (!p) return views.notFound();
    const r = S.ratingFor(p);
    const col = D.collectionById(p.collection);
    const related = S.products()
      .filter((x) => x.collection === p.collection && x.id !== p.id)
      .slice(0, 4);
    const reviews = S.reviewsFor(p);
    const dist =
      r.rating >= 4.8 ? [82, 13, 3, 1, 1] : r.rating >= 4.65 ? [74, 18, 5, 2, 1] : [66, 22, 8, 3, 1];
    const firstColor = p.colors[0];

    return {
      title: p.name + " — Noor",
      html:
        '<div class="pdp" data-pdp data-id="' + p.id + '">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/shop">Shop</a><span>/</span>' +
        '<a href="#/shop?collection=' + p.collection + '">' + esc(D.collectionName(p.collection)) + "</a><span>/</span><span aria-current=\"page\">" + esc(p.name) + "</span></nav>" +
        '<div class="pdp__layout">' +
        '<div class="pdp__gallery">' +
        '<div class="pdp__main" id="pdp-main">' + art(p, firstColor.name, "drape", p.name + " in " + firstColor.name) + badge(p) + "</div>" +
        '<div class="pdp__thumbs" id="pdp-thumbs">' +
        '<button type="button" class="thumb is-active" data-view="drape" aria-label="Front drape">' + art(p, firstColor.name, "drape") + "</button>" +
        '<button type="button" class="thumb" data-view="fold" aria-label="Folded">' + art(p, firstColor.name, "fold") + "</button>" +
        '<button type="button" class="thumb" data-view="detail" aria-label="Fabric detail">' + art(p, firstColor.name, "detail") + "</button>" +
        "</div></div>" +
        '<div class="pdp__info">' +
        '<p class="eyebrow">' + esc(col ? col.name : "") + "</p>" +
        "<h1>" + esc(p.name) + "</h1>" +
        '<div class="pdp__rating">' + stars(r.rating) + '<button type="button" class="link-inline" data-action="scroll-reviews">' + r.rating.toFixed(1) + " · " + r.count + " reviews</button></div>" +
        '<div class="pdp__price" id="pdp-price">' + priceHtml(p) + "</div>" +
        '<p class="pdp__blurb">' + esc(p.blurb) + "</p>" +
        '<div class="pdp__option"><div class="pdp__option-head"><span>Colour</span><strong id="pdp-color-name">' + esc(firstColor.name) + "</strong></div>" +
        '<div class="pdp__swatches" id="pdp-colors">' +
        p.colors
          .map(
            (c, i) =>
              '<button type="button" class="color-swatch' + (i === 0 ? " is-active" : "") + '" data-color="' + esc(c.name) + '" data-hex="' + c.hex + '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" aria-pressed="' + (i === 0) + '"><span style="background:' + c.hex + '"></span></button>'
          )
          .join("") +
        "</div></div>" +
        '<div class="pdp__buy">' +
        '<div class="qty" data-qty><button type="button" data-action="pdp-qty" data-step="-1" aria-label="Decrease quantity">' + icon("minus") + "</button>" +
        '<input id="pdp-qty" value="1" inputmode="numeric" aria-label="Quantity" readonly><button type="button" data-action="pdp-qty" data-step="1" aria-label="Increase quantity">' + icon("plus") + "</button></div>" +
        '<button class="btn btn--ink btn--lg pdp__add" type="button" data-action="add-to-cart" data-id="' + p.id + '" data-color="' + esc(firstColor.name) + '" data-qty-source="pdp-qty">Add to bag — ' + S.money(p.price) + "</button>" +
        heartButton(p, "heart--wide") +
        "</div>" +
        '<ul class="pdp__perks">' +
        "<li>" + icon("truck") + "Free shipping over " + S.money(D.SHIPPING.freeThreshold) + " · ships in 1–2 days</li>" +
        "<li>" + icon("leaf") + "Ethically sourced, hand-finished edges</li>" +
        "<li>" + icon("shield") + "30-day returns, no questions asked</li>" +
        "</ul>" +
        '<div class="accordion">' +
        '<details open><summary>Details &amp; styling</summary><div class="accordion__body"><p>' + esc(p.description) + "</p>" +
        "<ul><li>Colour shown: " + esc(firstColor.name) + " (" + p.colors.length + " colourways)</li>" +
        "<li>Fabric: " + esc(p.fabric) + "</li><li>Colour family: " + esc(firstColor.family) + "</li></ul></div></details>" +
        '<details><summary>Fabric &amp; care</summary><div class="accordion__body"><p>' + esc(p.care) + "</p>" +
        "<p>All our fabrics are Oeko-Tex certified and pre-washed to reduce shrinkage.</p></div></details>" +
        '<details><summary>Shipping &amp; returns</summary><div class="accordion__body">' +
        "<p><strong>Standard</strong> " + S.money(D.SHIPPING.standard) + " (free over " + S.money(D.SHIPPING.freeThreshold) + ") · 2–4 working days. " +
        "<strong>Express</strong> " + S.money(D.SHIPPING.express) + " · next working day if ordered before 2pm.</p>" +
        "<p>Unworn pieces can be returned within 30 days. Bridal pieces are made to order and are final sale.</p></div></details>" +
        "</div></div></div>" +

        '<section class="section section--tint" id="reviews">' +
        '<div class="reviews">' +
        '<div class="reviews__summary"><h2>Reviews</h2>' +
        '<div class="reviews__score"><strong>' + r.rating.toFixed(1) + "</strong>" + stars(r.rating) + "<span>" + r.count + " reviews</span></div>" +
        '<ul class="reviews__bars">' +
        dist
          .map(
            (pct, i) =>
              '<li><span>' + (5 - i) + "★</span><span class=\"bar\"><span style=\"width:" + pct + '%"></span></span><span class="pct">' + pct + "%</span></li>"
          )
          .join("") +
        "</ul>" +
        '<details class="review-form"><summary class="btn btn--outline btn--block">Write a review</summary>' +
        '<form data-form="review" data-id="' + p.id + '" class="form form--tight" novalidate>' +
        '<label>Name<input name="name" type="text" required maxlength="40" placeholder="Your name"></label>' +
        '<label>Rating<select name="rating"><option value="5">5 — loved it</option><option value="4">4 — very good</option><option value="3">3 — okay</option><option value="2">2 — not for me</option><option value="1">1 — disappointed</option></select></label>' +
        '<label>Title<input name="title" type="text" maxlength="70" placeholder="Sum it up in a few words"></label>' +
        '<label>Review<textarea name="text" rows="4" required maxlength="600" placeholder="How did it fit, drape and wear?"></textarea></label>' +
        '<button class="btn btn--ink" type="submit">Post review</button></form></details>' +
        "</div>" +
        '<div class="reviews__list">' +
        reviews
          .map(
            (rev) =>
              '<article class="review">' +
              '<div class="review__head"><span class="avatar">' + esc(String(rev.name).charAt(0).toUpperCase()) + "</span>" +
              '<div><strong>' + esc(rev.name) + (rev.mine ? ' <span class="tag">your review</span>' : "") + "</strong>" +
              '<span class="review__meta">' + (rev.verified ? "Verified purchase · " : "") + esc(rev.date) + "</span></div>" +
              '<div class="review__stars">' + stars(rev.rating) + "</div></div>" +
              "<h3>" + esc(rev.title) + "</h3><p>" + esc(rev.text) + "</p></article>"
          )
          .join("") +
        "</div></div></section>" +

        (related.length
          ? '<section class="section"><div class="section__head"><div><p class="eyebrow">More from ' +
            esc(col ? col.name : "") +
            "</p><h2>Complete the drawer</h2></div>" +
            '<a class="link-arrow" href="#/shop?collection=' + p.collection + '">View collection ' + icon("arrow") + "</a></div>" +
            productGrid(related) +
            "</section>"
          : "") +
        "</div>",

      mount() {
        const root = document.querySelector("[data-pdp]");
        if (!root) return;
        let color = firstColor.name;
        let view = "drape";

        function repaint() {
          const main = document.getElementById("pdp-main");
          if (!main) return;
          main.innerHTML = art(p, color, view, p.name + " in " + color) + badge(p);
          document.querySelectorAll("#pdp-colors .color-swatch").forEach((b) => {
            const on = b.dataset.color === color;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-pressed", on);
          });
          const nameEl = document.getElementById("pdp-color-name");
          if (nameEl) nameEl.textContent = color;
          const addBtn = root.querySelector("[data-action='add-to-cart']");
          if (addBtn) addBtn.dataset.color = color;
          document.querySelectorAll("#pdp-thumbs .thumb").forEach((t) => t.classList.toggle("is-active", t.dataset.view === view));
          document.querySelectorAll("#pdp-thumbs .thumb").forEach((t) => {
            t.innerHTML = art(p, color, t.dataset.view);
          });
        }

        root.addEventListener("click", (e) => {
          const sw = e.target.closest("#pdp-colors .color-swatch");
          if (sw) {
            color = sw.dataset.color;
            repaint();
            return;
          }
          const th = e.target.closest("#pdp-thumbs .thumb");
          if (th) {
            view = th.dataset.view;
            repaint();
            return;
          }
          const qtyBtn = e.target.closest("[data-action='pdp-qty']");
          if (qtyBtn) {
            const input = document.getElementById("pdp-qty");
            if (!input) return;
            const next = Math.max(1, Math.min(20, (parseInt(input.value, 10) || 1) + parseInt(qtyBtn.dataset.step, 10)));
            input.value = next;
          }
        });
      },
    };
  };

  /* --------------------------------------------------------------------- cart */
  views.cart = function () {
    const lines = S.cartLines();
    const t = S.totals();

    if (!lines.length) {
      return {
        title: "Your bag — Noor",
        html:
          '<div class="empty empty--page"><div class="empty__mark">' + icon("bag") + "</div>" +
          "<h2>Your bag is empty</h2><p>Nothing wrapped up yet — start with a bestseller, or browse the full collection.</p>" +
          '<div class="empty__actions"><a class="btn btn--ink" href="#/shop">Shop all pieces</a><a class="btn btn--ghost" href="#/shop?collection=essentials">Everyday essentials</a></div></div>',
      };
    }

    const rows = lines
      .map(
        (l) =>
          '<article class="line">' +
          '<a class="line__art" href="#/product/' + l.product.slug + '" aria-label="' + esc(l.product.name) + '">' + art(l.product, l.color.name, "drape") + "</a>" +
          '<div class="line__body"><p class="line__coll">' + esc(D.collectionName(l.product.collection)) + "</p>" +
          '<h3><a href="#/product/' + l.product.slug + '">' + esc(l.product.name) + "</a></h3>" +
          '<p class="line__color"><span class="swatch-dot" style="background:' + l.color.hex + '"></span>' + esc(l.color.name) + " · " + esc(l.product.fabric) + "</p>" +
          '<div class="line__actions">' +
          '<div class="qty qty--sm"><button type="button" data-action="cart-qty" data-key="' + esc(l.key) + '" data-step="-1" aria-label="Decrease">' + icon("minus") + "</button>" +
          '<input value="' + l.qty + '" readonly aria-label="Quantity for ' + esc(l.product.name) + '">' +
          '<button type="button" data-action="cart-qty" data-key="' + esc(l.key) + '" data-step="1" aria-label="Increase">' + icon("plus") + "</button></div>" +
          '<button class="link-btn" type="button" data-action="cart-remove" data-key="' + esc(l.key) + '">' + icon("trash") + " Remove</button>" +
          "</div></div>" +
          '<div class="line__price">' + S.money(l.lineTotal) + '<span class="line__unit">' + S.money(l.product.price) + " each</span></div>" +
          "</article>"
      )
      .join("");

    const promo = t.promo;

    return {
      title: "Your bag — Noor",
      html:
        pageHead("Your bag", lines.reduce((n, l) => n + l.qty, 0) + " piece" + (lines.reduce((n, l) => n + l.qty, 0) === 1 ? "" : "s")) +
        freeShipBar(t) +
        '<div class="cart-layout"><div class="cart-lines">' + rows + "</div>" +
        '<aside class="summary"><h2>Order summary</h2>' +
        (promo
          ? '<div class="promo-applied">' + icon("check") + "<span><strong>" + esc(promo.code) + "</strong> · " + esc(promo.label) + "</span>" +
            '<button type="button" class="link-btn" data-action="remove-promo">Remove</button></div>'
          : '<form class="promo" data-form="promo"><label class="sr-only" for="promo-code">Promo code</label>' +
            '<input id="promo-code" name="code" placeholder="Promo code" autocomplete="off"><button class="btn btn--outline" type="submit">Apply</button></form>' +
            '<p class="promo__hint">Try <button type="button" class="code-chip" data-action="fill-promo" data-code="NOOR10">NOOR10</button> or <button type="button" class="code-chip" data-action="fill-promo" data-code="WELCOME15">WELCOME15</button></p>') +
        '<dl class="totals">' +
        "<div><dt>Subtotal</dt><dd>" + S.money(t.subtotal) + "</dd></div>" +
        (t.discount ? "<div class=\"totals__discount\"><dt>Discount</dt><dd>−" + S.money(t.discount) + "</dd></div>" : "") +
        "<div><dt>Shipping</dt><dd>" + (t.shipping === 0 ? "Free" : S.money(t.shipping)) + "</dd></div>" +
        "<div><dt>Tax (8%)</dt><dd>" + S.money(t.tax) + "</dd></div>" +
        '<div class="totals__grand"><dt>Total</dt><dd>' + S.money(t.total) + "</dd></div>" +
        "</dl>" +
        '<a class="btn btn--ink btn--lg btn--block" href="#/checkout">Checkout</a>' +
        '<p class="summary__note">' + icon("shield") + "Demo checkout — no real payment is taken.</p>" +
        '<div class="summary__pays"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span></div>' +
        '<a class="link-arrow summary__back" href="#/shop">Continue shopping ' + icon("arrow") + "</a>" +
        "</aside></div>",
    };
  };

  /* ---------------------------------------------------------------------- checkout */
  views.checkout = function () {
    if (!S.cartLines().length) {
      return {
        title: "Checkout — Noor",
        html:
          '<div class="empty empty--page"><div class="empty__mark">' + icon("bag") + "</div>" +
          "<h2>Nothing to check out</h2><p>Your bag is empty — add a piece or two before checking out.</p>" +
          '<a class="btn btn--ink" href="#/shop">Shop all pieces</a></div>',
      };
    }
    return NS.checkout.view();
  };

  /* ------------------------------------------------------------------- wishlist */
  views.wishlist = function () {
    const list = S.wishlistProducts();
    return {
      title: "Wishlist — Noor",
      html:
        pageHead("Saved", "Your wishlist", "Pieces you are thinking about. They stay here until you are ready.") +
        (list.length
          ? productGrid(list) +
            '<p class="center-note"><a class="link-arrow" href="#/shop">Keep browsing ' + icon("arrow") + "</a></p>"
          : '<div class="empty empty--page"><div class="empty__mark">' + icon("heart") + "</div><h2>No saved pieces yet</h2>" +
            "<p>Tap the heart on any hijab to keep it here for later.</p>" +
            '<a class="btn btn--ink" href="#/shop">Browse the collection</a></div>'),
    };
  };

  /* --------------------------------------------------------------------- orders */
  const STATUS_LABEL = {
    paid: "Paid",
    cod: "Pay on delivery",
    processing: "Processing",
    shipped: "Shipped",
    cancelled: "Cancelled",
  };

  views.orders = function () {
    const orders = S.state.orders;
    if (!orders.length) {
      return {
        title: "Orders — Noor",
        html:
          pageHead("Account", "Your orders", "Every order you place in this demo is stored in your browser.") +
          '<div class="empty empty--page"><div class="empty__mark">' + icon("bag") + "</div><h2>No orders yet</h2>" +
          "<p>Place a demo order and it will show up here — with the receipt and shipping details.</p>" +
          '<a class="btn btn--ink" href="#/shop">Start shopping</a></div>',
      };
    }

    const cards = orders
      .map(
        (o) =>
          '<article class="order" data-order="' + o.id + '">' +
          '<header class="order__head"><div><p class="order__id">' + o.id + "</p>" +
          '<p class="order__date">' + new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "</p></div>" +
          '<span class="pill pill--' + o.status + '">' + (STATUS_LABEL[o.status] || o.status) + "</span>" +
          '<p class="order__total">' + S.money(o.totals.total) + "</p></header>" +
          '<div class="order__items">' +
          o.items
            .map((it) => {
              const prod = S.productById(it.id) || { name: it.name, colors: [{ name: it.color, hex: it.colorHex }], fabric: "", slug: it.slug, collection: "" };
              return (
                '<div class="order__item"><span class="order__thumb">' + art(prod, it.color, "fold") + "</span>" +
                "<span><strong>" + esc(it.name) + "</strong><em>" + esc(it.color) + " · qty " + it.qty + "</em></span>" +
                "<span class=\"order__item-price\">" + S.money(it.price * it.qty) + "</span></div>"
              );
            })
            .join("") +
          "</div>" +
          '<footer class="order__foot">' +
          '<button class="btn btn--outline btn--sm" type="button" data-action="toggle-order" data-id="' + o.id + '">View details</button>' +
          (o.items.length > 1 || true
            ? '<button class="btn btn--ink btn--sm" type="button" data-action="reorder" data-id="' + o.id + '">Reorder</button>'
            : "") +
          '<span class="order__ship">' + (o.delivery === "express" ? "Express" : "Standard") + " delivery · " + (o.payment && o.payment.label ? esc(o.payment.label) : "") + "</span>" +
          "</footer>" +
          '<div class="order__details" hidden>' +
          '<div class="order__detail-grid">' +
          "<div><h4>Delivering to</h4><p>" + esc(o.customer.firstName) + " " + esc(o.customer.lastName) + "<br>" + esc(o.customer.address) + "<br>" +
          esc(o.customer.city) + " " + esc(o.customer.postal) + "<br>" + esc(o.customer.country) + "</p></div>" +
          "<div><h4>Contact</h4><p>" + esc(o.customer.email) + "<br>" + esc(o.customer.phone || "—") + "</p></div>" +
          "<div><h4>Payment</h4><p>" + (o.payment && o.payment.label ? esc(o.payment.label) : "—") + (o.payment && o.payment.last4 ? "<br>•••• " + esc(o.payment.last4) : "") + "</p></div>" +
          "<div><h4>Totals</h4><p>Subtotal " + S.money(o.totals.subtotal) + "<br>Shipping " + (o.totals.shipping ? S.money(o.totals.shipping) : "Free") +
          "<br>Tax " + S.money(o.totals.tax) + (o.totals.discount ? "<br>Discount −" + S.money(o.totals.discount) : "") + "</p></div>" +
          "</div></div></article>"
      )
      .join("");

    return {
      title: "Orders — Noor",
      html:
        pageHead("Account", "Your orders", "Stored locally in this browser — clearing site data will remove them.") +
        '<div class="orders">' + cards + "</div>" +
        '<div class="orders__foot"><a class="link-arrow" href="#/shop">Continue shopping ' + icon("arrow") + "</a>" +
        '<button class="link-btn" type="button" data-action="clear-orders">Clear order history</button></div>',
    };
  };

  /* -------------------------------------------------------------------- confirm */
  views.confirm = function (orderId) {
    const order = S.getOrder(orderId);
    if (!order) {
      return {
        title: "Order confirmed — Noor",
        html: pageHead("Order", "We could not find that order") + '<div class="empty empty--page"><p>It may have been cleared from this browser.</p><a class="btn btn--ink" href="#/orders">View orders</a></div>',
      };
    }
    return {
      title: "Order " + order.id + " — Noor",
      html:
        '<section class="confirm">' +
        '<div class="confirm__mark">' + icon("check") + "</div>" +
        "<p class=\"eyebrow\">Order " + order.id + "</p>" +
        "<h1>Shukran, " + esc(order.customer.firstName) + ".</h1>" +
        "<p class=\"lede\">Your order is confirmed. We have sent a receipt to " + esc(order.customer.email) + " — this is a demo, so no payment was taken and nothing will ship.</p>" +
        '<div class="confirm__card">' +
        '<div class="confirm__rows">' +
        order.items
          .map(
            (it) =>
              '<div class="confirm__row"><span class="confirm__thumb">' + art(S.productById(it.id) || { name: it.name, colors: [{ name: it.color, hex: it.colorHex }], fabric: "", slug: it.slug }, it.color, "fold") + "</span>" +
              "<span><strong>" + esc(it.name) + "</strong><em>" + esc(it.color) + " · qty " + it.qty + "</em></span>" +
              '<span class="confirm__price">' + S.money(it.price * it.qty) + "</span></div>"
          )
          .join("") +
        "</div>" +
        '<dl class="totals totals--flush">' +
        "<div><dt>Subtotal</dt><dd>" + S.money(order.totals.subtotal) + "</dd></div>" +
        (order.totals.discount ? '<div class="totals__discount"><dt>Discount</dt><dd>−' + S.money(order.totals.discount) + "</dd></div>" : "") +
        "<div><dt>Shipping</dt><dd>" + (order.totals.shipping ? S.money(order.totals.shipping) : "Free") + "</dd></div>" +
        "<div><dt>Tax</dt><dd>" + S.money(order.totals.tax) + "</dd></div>" +
        '<div class="totals__grand"><dt>Total</dt><dd>' + S.money(order.totals.total) + "</dd></div></dl>" +
        '<div class="confirm__meta"><div><h4>Delivery</h4><p>' + (order.delivery === "express" ? "Express · next working day" : "Standard · 2–4 working days") + "</p></div>" +
        "<div><h4>Payment</h4><p>" + (order.payment && order.payment.label ? esc(order.payment.label) : "—") + "</p></div>" +
        "<div><h4>Ship to</h4><p>" + esc(order.customer.address) + ", " + esc(order.customer.city) + "</p></div></div>" +
        "</div>" +
        '<div class="confirm__actions"><a class="btn btn--ink" href="#/orders">View my orders</a><a class="btn btn--ghost" href="#/shop">Continue shopping ' + icon("arrow") + "</a></div>" +
        "</section>",
    };
  };

  /* ---------------------------------------------------------------------- about */
  views.about = function () {
    const p = S.productBySlug("nur-satin-silk") || S.products()[0];
    const q = S.productBySlug("ruqayya-pleated-chiffon") || S.products()[1];
    return {
      title: "Our story — Noor",
      html:
        '<section class="about-hero">' +
        '<div><p class="eyebrow">Since 2019 · London</p><h1>A small atelier,<br><em>a very specific idea</em></h1>' +
        "<p class=\"lede\">That a hijab should feel like the best thing in your wardrobe — not an afterthought. We started with one jersey drape, hand-cut on a kitchen table. We now make twenty-four pieces, still finished by hand.</p></div>" +
        '<div class="about-hero__art">' + (p ? art(p, "Champagne", "fold") : "") + '<div class="about-hero__art-b">' + (q ? art(q, q.colors[0].name, "detail") : "") + "</div></div>" +
        "</section>" +
        '<section class="section section--tint"><div class="values">' +
        [
          { i: "leaf", t: "Fabric first", d: "Oeko-Tex certified silk, chiffon and cotton from two mills we have worked with since day one. No blends that pill, no mystery fibres." },
          { i: "spark", t: "Finished by hand", d: "Every hem is rolled and stitched by hand. It takes longer. It is the difference between a hijab that lasts a season and one that lasts years." },
          { i: "shield", t: "Buy less, wear more", d: "Six collections, twenty-four pieces, restocked rather than reinvented. We would rather you owned four you love than forty you tolerate." },
        ]
          .map((v) => '<div class="value"><span class="value__icon">' + icon(v.i) + "</span><h3>" + esc(v.t) + "</h3><p>" + esc(v.d) + "</p></div>")
          .join("") +
        "</div></section>" +
        '<section class="section editorial editorial--reverse"><div class="editorial__art">' + (q ? art(q, "Lilac", "drape", "Pleated chiffon") : "") + "</div>" +
        '<div class="editorial__copy"><p class="eyebrow">The making</p><h2>Three pairs of hands</h2>' +
        "<p>Each piece passes through three sets of hands: cutting in Hackney, stitching in a family-run workshop in Leicester, and a final check back in the studio. Nothing leaves without a signature on the card.</p>" +
        "<p>We make in small runs — usually two hundred pieces per colourway. When it is gone, it is usually gone until the next season.</p>" +
        '<a class="btn btn--outline" href="#/shop">Shop the collection</a></div></section>' +
        '<section class="section"><div class="section__head"><div><p class="eyebrow">Questions</p><h2>Good to know</h2></div></div>' +
        '<div class="accordion accordion--wide">' +
        "<details open><summary>How do I choose a fabric?</summary><div class=\"accordion__body\"><p>Jersey and cotton for everyday wear — breathable and grippy. Chiffon for layering and warm weather. Silk for occasions, because it drapes like nothing else. If you are new, start with the Layla jersey.</p></div></details>" +
        "<details><summary>Do the colours match the photos?</summary><div class=\"accordion__body\"><p>Every piece is photographed in daylight and colour-checked against the fabric. Screen settings vary, so if a colour is critical, order two and return the one that is not right.</p></div></details>" +
        "<details><summary>What is your returns policy?</summary><div class=\"accordion__body\"><p>30 days on unworn pieces with the tag attached. Bridal and made-to-order pieces are final sale. Returns are free within the UK; international return postage is at cost.</p></div></details>" +
        "<details><summary>How should I wash silk?</summary><div class=\"accordion__body\"><p>Dry clean is safest. Otherwise, hand wash cold with a pH-neutral silk detergent, never wring, and dry flat away from sunlight. Steam rather than iron.</p></div></details>" +
        "</div></section>" +
        '<section class="newsletter"><div><p class="eyebrow">Stay close</p><h2>One email a fortnight</h2><p>Restocks, styling notes and early access to new colourways.</p></div>' +
        '<form class="newsletter__form" data-form="newsletter" novalidate><label class="sr-only" for="news-email-2">Email address</label>' +
        '<input id="news-email-2" name="email" type="email" placeholder="you@email.com" autocomplete="email" required>' +
        '<button class="btn btn--ink" type="submit">Subscribe</button></form></section>',
    };
  };

  views.notFound = function () {
    return {
      title: "Not found — Noor",
      html:
        pageHead("404", "This page slipped its pins") +
        '<div class="empty empty--page"><div class="empty__mark">' + icon("search") + "</div>" +
        "<h2>We could not find that page</h2><p>The link may be old, or the piece may have sold out.</p>" +
        '<a class="btn btn--ink" href="#/shop">Back to the collection</a></div>',
    };
  };

  NS.views = views;
  NS.ui = { esc, icon, stars, art, badge, priceHtml, productCard, productGrid, emptyState, freeShipBar, FAMILY_COLORS };
})();
