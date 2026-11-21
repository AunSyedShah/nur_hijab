/* ==========================================================================
   NOOR — checkout & payment simulation
   No network calls, no real payment. Card numbers are validated locally with
   the Luhn algorithm, then "authorised" after a short fake delay.
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});
  const S = NS.store;
  const D = NS.data;
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const COUNTRIES = ["United Kingdom", "United States", "Canada", "United Arab Emirates", "Saudi Arabia", "Malaysia", "Singapore", "Germany", "France", "Netherlands", "Australia", "Other"];

  let current = "card";

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function luhn(number) {
    const d = digits(number);
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0;
    let double = false;
    for (let i = d.length - 1; i >= 0; i -= 1) {
      let n = parseInt(d[i], 10);
      if (double) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      double = !double;
    }
    return sum % 10 === 0;
  }

  function brandOf(number) {
    const d = digits(number);
    if (/^4/.test(d)) return "Visa";
    if (/^5[1-5]/.test(d)) return "Mastercard";
    if (/^3[47]/.test(d)) return "Amex";
    if (/^6/.test(d)) return "Discover";
    return "Card";
  }

  function lastOrderCustomer() {
    const order = S.state.orders[0];
    return order ? order.customer : null;
  }

  function summaryHtml() {
    const t = S.totals();
    const lines = S.cartLines();
    return (
      '<h2>Order summary <a class="summary__edit" href="#/cart">Edit</a></h2>' +
      '<ul class="summary__items">' +
      lines
        .map(
          (l) =>
            '<li><span class="summary__thumb">' + NS.art.svg(l.product, { color: l.color.name, view: "fold" }) + "</span>" +
            '<span class="summary__item-body"><strong>' + esc(l.product.name) + "</strong><em>" + esc(l.color.name) + " × " + l.qty + "</em></span>" +
            '<span class="summary__item-price">' + S.money(l.lineTotal) + "</span></li>"
        )
        .join("") +
      "</ul>" +
      (t.promo
        ? '<div class="promo-applied">' + NS.ui.icon("check") + "<span><strong>" + esc(t.promo.code) + "</strong> · " + esc(t.promo.label) + "</span>" +
          '<button type="button" class="link-btn" data-action="remove-promo">Remove</button></div>'
        : '<form class="promo promo--sm" data-form="promo"><label class="sr-only" for="co-promo">Promo code</label>' +
          '<input id="co-promo" name="code" placeholder="Promo code"><button class="btn btn--outline btn--sm" type="submit">Apply</button></form>' +
          '<p class="promo__hint">Try <button type="button" class="code-chip" data-action="fill-promo" data-code="NOOR10">NOOR10</button> or <button type="button" class="code-chip" data-action="fill-promo" data-code="WELCOME15">WELCOME15</button></p>') +
      '<dl class="totals totals--flush">' +
      "<div><dt>Subtotal</dt><dd>" + S.money(t.subtotal) + "</dd></div>" +
      (t.discount ? '<div class="totals__discount"><dt>Discount</dt><dd>−' + S.money(t.discount) + "</dd></div>" : "") +
      "<div><dt>Shipping · " + (t.delivery === "express" ? "express" : "standard") + "</dt><dd>" + (t.shipping === 0 ? "Free" : S.money(t.shipping)) + "</dd></div>" +
      "<div><dt>Tax (8%)</dt><dd>" + S.money(t.tax) + "</dd></div>" +
      '<div class="totals__grand"><dt>Total</dt><dd>' + S.money(t.total) + "</dd></div></dl>" +
      '<p class="summary__note">' + NS.ui.icon("shield") + "Simulated payment — nothing is charged.</p>"
    );
  }

  function view() {
    const t = S.totals();
    const prev = lastOrderCustomer();
    const v = (key, fallback) => (prev && prev[key] ? esc(prev[key]) : fallback || "");

    return {
      title: "Checkout — Noor",
      html:
        '<div class="checkout" id="checkout-root">' +
        '<div class="checkout__main">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/cart">Bag</a><span>/</span><span aria-current="page">Checkout</span></nav>' +
        "<h1>Checkout</h1>" +
        '<p class="checkout__secure">' + NS.ui.icon("shield") + "Secure demo checkout · no real payment is processed</p>" +
        '<form id="checkout-form" data-form="checkout" novalidate>' +

        '<section class="panel"><header class="panel__head"><span class="panel__num">01</span><h2>Contact &amp; shipping</h2></header>' +
        '<div class="form-grid">' +
        '<label class="field field--full"><span>Email</span><input name="email" type="email" autocomplete="email" placeholder="you@email.com" value="' + v("email") + '" required><em class="field__error" data-error="email"></em></label>' +
        '<label class="field"><span>First name</span><input name="firstName" autocomplete="given-name" value="' + v("firstName") + '" required><em class="field__error" data-error="firstName"></em></label>' +
        '<label class="field"><span>Last name</span><input name="lastName" autocomplete="family-name" value="' + v("lastName") + '" required><em class="field__error" data-error="lastName"></em></label>' +
        '<label class="field field--full"><span>Address</span><input name="address" autocomplete="street-address" placeholder="House number and street" value="' + v("address") + '" required><em class="field__error" data-error="address"></em></label>' +
        '<label class="field"><span>City</span><input name="city" autocomplete="address-level2" value="' + v("city") + '" required><em class="field__error" data-error="city"></em></label>' +
        '<label class="field"><span>Postcode / ZIP</span><input name="postal" autocomplete="postal-code" value="' + v("postal") + '" required><em class="field__error" data-error="postal"></em></label>' +
        '<label class="field"><span>Country</span><select name="country">' +
        COUNTRIES.map((c) => '<option' + (prev && prev.country === c ? " selected" : "") + ">" + c + "</option>").join("") +
        '</select><em class="field__error" data-error="country"></em></label>' +
        '<label class="field"><span>Phone <small>(optional)</small></span><input name="phone" type="tel" autocomplete="tel" placeholder="For delivery updates" value="' + v("phone") + '"><em class="field__error" data-error="phone"></em></label>' +
        "</div></section>" +

        '<section class="panel"><header class="panel__head"><span class="panel__num">02</span><h2>Delivery</h2></header>' +
        '<div class="delivery-opts">' +
        '<label class="delivery-opt' + (S.state.delivery === "standard" ? " is-selected" : "") + '"><input type="radio" name="delivery" value="standard"' + (S.state.delivery === "standard" ? " checked" : "") + ">" +
        '<span class="delivery-opt__body"><strong>Standard</strong><em>2–4 working days</em></span>' +
        '<span class="delivery-opt__price" data-delivery-price="standard">' + (t.subtotal - t.discount >= D.SHIPPING.freeThreshold ? "Free" : S.money(D.SHIPPING.standard)) + "</span></label>" +
        '<label class="delivery-opt' + (S.state.delivery === "express" ? " is-selected" : "") + '"><input type="radio" name="delivery" value="express"' + (S.state.delivery === "express" ? " checked" : "") + ">" +
        '<span class="delivery-opt__body"><strong>Express</strong><em>Next working day, order before 2pm</em></span>' +
        '<span class="delivery-opt__price" data-delivery-price="express">' + S.money(D.SHIPPING.express) + "</span></label>" +
        "</div></section>" +

        '<section class="panel"><header class="panel__head"><span class="panel__num">03</span><h2>Payment</h2></header>' +
        '<div class="paytabs" role="tablist" aria-label="Payment method">' +
        '<button type="button" class="paytab is-active" data-pay="card" role="tab" aria-selected="true">' + NS.ui.icon("shield") + " Card</button>" +
        '<button type="button" class="paytab" data-pay="wallet" role="tab" aria-selected="false">' + NS.ui.icon("spark") + " Wallet</button>" +
        '<button type="button" class="paytab" data-pay="cod" role="tab" aria-selected="false">' + NS.ui.icon("truck") + " Cash on delivery</button>" +
        "</div>" +

        '<div class="paypanel" data-panel="card">' +
        '<div class="card-preview" aria-hidden="true"><span class="card-preview__brand" id="card-brand">Card</span>' +
        '<span class="card-preview__chip"></span>' +
        '<span class="card-preview__num" id="card-preview-num">•••• •••• •••• ••••</span>' +
        '<span class="card-preview__foot"><span id="card-preview-name">YOUR NAME</span><span id="card-preview-exp">MM/YY</span></span></div>' +
        '<div class="form-grid">' +
        '<label class="field field--full"><span>Card number</span><input name="cardNumber" id="card-number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23"><em class="field__error" data-error="cardNumber"></em></label>' +
        '<label class="field field--full"><span>Name on card</span><input name="cardName" id="card-name" autocomplete="cc-name" placeholder="As printed on the card"><em class="field__error" data-error="cardName"></em></label>' +
        '<label class="field"><span>Expiry</span><input name="cardExpiry" id="card-expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"><em class="field__error" data-error="cardExpiry"></em></label>' +
        '<label class="field"><span>CVC</span><input name="cardCvc" id="card-cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"><em class="field__error" data-error="cardCvc"></em></label>' +
        "</div>" +
        '<div class="demo-hint"><strong>Demo cards</strong><span><code>4242 4242 4242 4242</code> approves · <code>4000 0000 0000 0002</code> declines.</span><span>Any future expiry and any 3-digit CVC.</span></div>' +
        "</div>" +

        '<div class="paypanel" data-panel="wallet" hidden>' +
        '<p class="paypanel__copy">Choose a wallet. A simulated authorisation sheet will appear — nothing leaves this browser.</p>' +
        '<div class="wallets">' +
        '<button type="button" class="wallet" data-wallet="Apple Pay"><span class="wallet__mark">&#63743;</span><span>Apple Pay</span></button>' +
        '<button type="button" class="wallet" data-wallet="Google Pay"><span class="wallet__mark">G</span><span>Google Pay</span></button>' +
        '<button type="button" class="wallet" data-wallet="Noor Pay"><span class="wallet__mark">N</span><span>Noor Pay</span></button>' +
        "</div>" +
        '<p class="paypanel__small">Wallet buttons are decorative in this prototype and always approve.</p>' +
        "</div>" +

        '<div class="paypanel" data-panel="cod" hidden>' +
        '<p class="paypanel__copy">Pay the courier in cash when your order arrives. We will hold the pieces for 48 hours.</p>' +
        '<div class="cod-note">' + NS.ui.icon("truck") + "<div><strong>Cash on delivery</strong><p>Available for orders under " + S.money(30000) + ". A " + S.money(250) + " handling fee applies on delivery — shown in your confirmation.</p></div></div>" +
        "</div>" +

        '<div class="checkout__submit">' +
        '<button class="btn btn--ink btn--lg btn--block" type="submit" id="pay-button">Pay ' + S.money(t.total) + "</button>" +
        '<p class="fineprint">By placing this order you agree to our demo terms. This is a prototype store — no money is taken, no goods are shipped, and card details never leave your browser.</p>' +
        "</div></section></form></div>" +

        '<aside class="summary summary--checkout" id="checkout-summary">' + summaryHtml() + "</aside></div>",
      mount() {
        const root = document.getElementById("checkout-root");
        if (!root) return;
        const form = document.getElementById("checkout-form");
        const summary = document.getElementById("checkout-summary");
        const payBtn = document.getElementById("pay-button");

        function refresh() {
          if (!document.getElementById("checkout-root")) return;
          if (summary) summary.innerHTML = summaryHtml();
          const t = S.totals();
          if (payBtn) payBtn.textContent = current === "cod" ? "Place order — pay on delivery" : "Pay " + S.money(t.total);
          const std = document.querySelector('[data-delivery-price="standard"]');
          if (std) std.textContent = t.subtotal - t.discount >= D.SHIPPING.freeThreshold ? "Free" : S.money(D.SHIPPING.standard);
          const exp = document.querySelector('[data-delivery-price="express"]');
          if (exp) exp.textContent = S.money(D.SHIPPING.express);
          document.querySelectorAll(".delivery-opt").forEach((el) => {
            const input = el.querySelector("input");
            el.classList.toggle("is-selected", input && input.checked);
          });
        }

        function setPay(method) {
          current = method;
          document.querySelectorAll(".paytab").forEach((b) => {
            const on = b.dataset.pay === method;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-selected", on);
          });
          document.querySelectorAll(".paypanel").forEach((p) => {
            p.hidden = p.dataset.panel !== method;
          });
          refresh();
        }

        document.querySelectorAll(".paytab").forEach((b) => b.addEventListener("click", () => setPay(b.dataset.pay)));

        form.addEventListener("change", (e) => {
          if (e.target.name === "delivery") {
            S.setDelivery(e.target.value);
            refresh();
          }
        });

        /* ---------------------------------------------------- card field UX */
        const num = document.getElementById("card-number");
        const nameInput = document.getElementById("card-name");
        const exp = document.getElementById("card-expiry");
        const cvc = document.getElementById("card-cvc");
        const previewNum = document.getElementById("card-preview-num");
        const previewName = document.getElementById("card-preview-name");
        const previewExp = document.getElementById("card-preview-exp");
        const brand = document.getElementById("card-brand");

        function formatNumber(value) {
          const d = digits(value).slice(0, 19);
          const parts = d.match(/.{1,4}/g);
          return parts ? parts.join(" ") : "";
        }

        if (num) {
          num.addEventListener("input", () => {
            num.value = formatNumber(num.value);
            if (previewNum) previewNum.textContent = num.value || "•••• •••• •••• ••••";
            if (brand) brand.textContent = digits(num.value).length > 1 ? brandOf(num.value) : "Card";
            clearError("cardNumber");
          });
        }
        if (nameInput) {
          nameInput.addEventListener("input", () => {
            if (previewName) previewName.textContent = (nameInput.value || "YOUR NAME").toUpperCase().slice(0, 26);
            clearError("cardName");
          });
        }
        if (exp) {
          exp.addEventListener("input", () => {
            let d = digits(exp.value).slice(0, 4);
            if (d.length > 2) d = d.slice(0, 2) + "/" + d.slice(2);
            exp.value = d;
            if (previewExp) previewExp.textContent = exp.value || "MM/YY";
            clearError("cardExpiry");
          });
        }
        if (cvc) {
          cvc.addEventListener("input", () => {
            cvc.value = digits(cvc.value).slice(0, 4);
            clearError("cardCvc");
          });
        }

        /* ---------------------------------------------------------- errors */
        function clearError(name) {
          const slot = form.querySelector('[data-error="' + name + '"]');
          if (slot) slot.textContent = "";
          const field = form.querySelector('[name="' + name + '"]');
          if (field) field.classList.remove("is-invalid");
        }

        function setError(name, message) {
          const slot = form.querySelector('[data-error="' + name + '"]');
          if (slot) slot.textContent = message;
          const field = form.querySelector('[name="' + name + '"]');
          if (field) field.classList.add("is-invalid");
        }

        function validateContact() {
          const errors = {};
          const val = (n) => (form.elements[n] && form.elements[n].value ? form.elements[n].value.trim() : "");
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) errors.email = "Enter a valid email address.";
          if (val("firstName").length < 2) errors.firstName = "Required.";
          if (val("lastName").length < 2) errors.lastName = "Required.";
          if (val("address").length < 4) errors.address = "Enter your street address.";
          if (val("city").length < 2) errors.city = "Required.";
          if (val("postal").length < 3) errors.postal = "Enter a valid postcode.";
          if (val("phone") && digits(val("phone")).length < 6) errors.phone = "Enter a valid phone number.";
          Object.keys(errors).forEach((k) => setError(k, errors[k]));
          const first = Object.keys(errors)[0];
          if (first) {
            const el = form.querySelector('[name="' + first + '"]');
            if (el) el.focus({ preventScroll: false });
          }
          return Object.keys(errors).length === 0;
        }

        function validateCard() {
          const errors = {};
          const number = digits(num ? num.value : "");
          if (!luhn(number)) errors.cardNumber = "That card number is not valid — try 4242 4242 4242 4242.";
          if (!nameInput || nameInput.value.trim().length < 2) errors.cardName = "Enter the name on the card.";
          const expiry = exp ? exp.value : "";
          const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
          if (!m) {
            errors.cardExpiry = "Use MM/YY.";
          } else {
            const month = parseInt(m[1], 10);
            const year = 2000 + parseInt(m[2], 10);
            const now = new Date();
            if (month < 1 || month > 12) errors.cardExpiry = "Month must be 01–12.";
            else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.cardExpiry = "That card has expired.";
          }
          const c = cvc ? cvc.value : "";
          if (!/^\d{3,4}$/.test(c)) errors.cardCvc = "3 or 4 digits.";
          Object.keys(errors).forEach((k) => setError(k, errors[k]));
          if (Object.keys(errors).length) {
            const first = Object.keys(errors)[0];
            const el = form.querySelector('[name="' + first + '"]');
            if (el) el.focus();
            return false;
          }
          return true;
        }

        function customer() {
          const val = (n) => (form.elements[n] && form.elements[n].value ? form.elements[n].value.trim() : "");
          return {
            email: val("email"),
            firstName: val("firstName"),
            lastName: val("lastName"),
            address: val("address"),
            city: val("city"),
            postal: val("postal"),
            country: val("country") || "United Kingdom",
            phone: val("phone"),
          };
        }

        /* ------------------------------------------------------ processing */
        function overlay(kind, title, message) {
          const el = document.createElement("div");
          el.className = "pay-overlay";
          el.innerHTML =
            '<div class="pay-sheet">' +
            (kind === "loading" ? '<div class="spinner" aria-hidden="true"></div>' : '<div class="pay-sheet__mark">' + NS.ui.icon(kind === "declined" ? "close" : "check") + "</div>") +
            "<h3>" + esc(title) + "</h3><p>" + esc(message) + "</p>" +
            (kind === "declined" ? '<button type="button" class="btn btn--ink" data-close-overlay>Try another card</button>' : "") +
            "</div>";
          document.body.appendChild(el);
          document.body.classList.add("is-locked");
          requestAnimationFrame(() => el.classList.add("is-in"));
          return el;
        }

        function closeOverlay(el) {
          if (!el) return;
          el.classList.remove("is-in");
          document.body.classList.remove("is-locked");
          window.setTimeout(() => el.remove(), 220);
        }

        function finish(order) {
          window.location.hash = "#/confirm/" + order.id;
        }

        function processPayment(method, label, last4) {
          const loading = overlay("loading", "Authorising", "Contacting your bank — this is a simulation.");
          const messages = ["Contacting your bank…", "Verifying the card…", "Authorising payment…"];
          let step = 0;
          const tick = window.setInterval(() => {
            const el = loading.querySelector("p");
            if (el) el.textContent = messages[Math.min(step, messages.length - 1)];
            step += 1;
          }, 650);

          window.setTimeout(() => {
            window.clearInterval(tick);
            closeOverlay(loading);
            const order = S.createOrder({
              status: method === "cod" ? "cod" : "paid",
              payment: { method: method, label: label, last4: last4 || "" },
              customer: customer(),
            });
            finish(order);
          }, 2000);
        }

        /* --------------------------------------------------------- submit */
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (!validateContact()) return;

          if (current === "card") {
            if (!validateCard()) return;
            const number = digits(num.value);
            if (number === "4000000000000002") {
              const el = overlay("declined", "Card declined", "Your bank declined this card. In the demo, 4242 4242 4242 4242 always approves.");
              el.querySelector("[data-close-overlay]").addEventListener("click", () => {
                closeOverlay(el);
                if (num) num.focus();
              });
              return;
            }
            processPayment("card", brandOf(number) + " ending " + number.slice(-4), number.slice(-4));
          } else if (current === "cod") {
            processPayment("cod", "Cash on delivery", "");
          } else {
            NS.app.toast("Choose a wallet above to continue.", "error");
          }
        });

        document.querySelectorAll("[data-wallet]").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (!validateContact()) {
              NS.app.toast("Add your delivery details first.", "error");
              return;
            }
            const wallet = btn.dataset.wallet;
            processPayment("wallet", wallet, "");
          });
        });

        setPay("card");
        NS.checkoutController = { refresh: refresh };
      },
    };
  }

  NS.checkout = { view };
})();
