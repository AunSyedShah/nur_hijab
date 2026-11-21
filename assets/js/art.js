/* ==========================================================================
   NOOR — procedural product artwork
   Every product image is generated as an SVG so the prototype works offline
   and stays perfectly on-brand. Three compositions: drape, fold, detail.
   ========================================================================== */
(function () {
  "use strict";
  const NS = (window.Nooor = window.Nooor || {});

  let uidCounter = 0;
  function uid() {
    uidCounter += 1;
    return "a" + uidCounter;
  }

  function parse(hex) {
    let h = String(hex || "#cccccc").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return { r: 204, g: 204, b: 204 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function clamp(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  /** amt > 0 lightens toward white, amt < 0 darkens toward black */
  function shade(hex, amt) {
    const p = parse(hex);
    const t = amt < 0 ? 0 : 255;
    const k = Math.abs(amt);
    return (
      "#" +
      [p.r, p.g, p.b]
        .map((v) => clamp(v + (t - v) * k).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  function alpha(hex, a) {
    const p = parse(hex);
    return `rgba(${p.r},${p.g},${p.b},${a})`;
  }

  /* the hood: crown, cheeks, and a wrap that closes under the chin */
  const HOOD =
    "M 200 92 C 264 92 296 138 293 191 C 291 231 280 262 265 288 " +
    "C 279 304 288 328 291 352 C 294 376 282 392 262 394 " +
    "C 238 406 162 406 138 394 C 118 392 106 376 109 352 " +
    "C 112 328 121 304 135 288 " +
    "C 120 262 109 231 107 191 C 104 138 136 92 200 92 Z";

  /* long end of the drape, falling over the left shoulder */
  const TAIL =
    "M 128 296 C 103 344 91 404 93 470 C 93 484 94 492 95 500 " +
    "L 151 500 C 141 442 143 372 157 318 C 149 304 139 298 128 296 Z";

  const FACE = { cx: 200, cy: 205, rx: 46, ry: 58 };

  function patternDefs(style, base, dark, light, id) {
    if (style === "printed") {
      const accent = shade(base, 0.45);
      return `<pattern id="${id}p" width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
        <circle cx="14" cy="14" r="7" fill="${accent}" opacity="0.5"/>
        <circle cx="14" cy="14" r="3" fill="${dark}" opacity="0.4"/>
        <path d="M36 34 q6 -9 12 0 q-6 9 -12 0" fill="${light}" opacity="0.6"/>
        <circle cx="42" cy="10" r="2.2" fill="${dark}" opacity="0.3"/>
        <circle cx="6" cy="40" r="1.8" fill="${dark}" opacity="0.26"/>
      </pattern>`;
    }
    if (style === "pleated") {
      return `<pattern id="${id}p" width="18" height="12" patternUnits="userSpaceOnUse">
        <rect width="7" height="12" fill="${light}" opacity="0.5"/>
        <rect x="7" width="2" height="12" fill="${dark}" opacity="0.26"/>
        <rect x="9" width="9" height="12" fill="${base}" opacity="0.18"/>
      </pattern>`;
    }
    if (style === "instant") {
      return `<pattern id="${id}p" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 5 H10" stroke="${dark}" stroke-opacity="0.13" stroke-width="1"/>
      </pattern>`;
    }
    return "";
  }

  function folds(base, dark, light, style) {
    const out = [];
    const targets = [92, 124, 156, 246, 278, 310];
    targets.forEach((bx) => {
      const sx = 200 + (bx - 200) * 0.42;
      const sy = 130 + Math.abs(bx - 200) * 0.05;
      out.push(
        `<path d="M ${sx.toFixed(0)} ${sy.toFixed(0)} C ${(200 + (bx - 200) * 0.72).toFixed(0)} 238, ${(bx - 14).toFixed(0)} 340, ${bx} 400" ` +
          `fill="none" stroke="${alpha(dark, 0.15)}" stroke-width="2.4"/>`
      );
      out.push(
        `<path d="M ${(sx + 7).toFixed(0)} ${(sy + 16).toFixed(0)} C ${(200 + (bx - 200) * 0.74 + 8).toFixed(0)} 250, ${(bx - 4).toFixed(0)} 340, ${(bx + 11).toFixed(0)} 400" ` +
          `fill="none" stroke="${alpha(light, 0.36)}" stroke-width="1.4"/>`
      );
    });

    /* wrap edge under the chin */
    out.push(
      `<path d="M 140 352 C 172 372 228 372 260 352" fill="none" stroke="${alpha(dark, 0.26)}" stroke-width="3"/>`,
      `<path d="M 141 360 C 174 380 226 380 259 360" fill="none" stroke="${alpha(light, 0.35)}" stroke-width="2"/>`
    );

    if (style === "wrap" || style === "instant") {
      out.push(
        `<path d="M 112 300 C 160 330 240 330 288 300 L 292 330 C 240 360 160 360 108 330 Z" fill="${alpha(light, 0.4)}"/>`,
        `<path d="M 112 300 C 160 330 240 330 288 300" fill="none" stroke="${alpha(dark, 0.24)}" stroke-width="2"/>`
      );
    }
    return out.join("");
  }

  function tailFolds(dark, light) {
    return (
      `<path d="M 120 340 C 108 400 106 456 110 500" fill="none" stroke="${alpha(light, 0.4)}" stroke-width="2"/>` +
      `<path d="M 142 330 C 132 396 130 452 134 500" fill="none" stroke="${alpha(dark, 0.16)}" stroke-width="2.4"/>` +
      `<path d="M 96 430 C 116 440 140 440 164 432" fill="none" stroke="${alpha(dark, 0.12)}" stroke-width="2"/>`
    );
  }

  function pearls(dark) {
    const out = [];
    for (let a = 6; a <= 174; a += 12) {
      const rad = (a * Math.PI) / 180;
      const x = FACE.cx + Math.cos(rad) * 56;
      const y = FACE.cy + Math.sin(rad) * 69;
      out.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.1" fill="#FFFBF1" stroke="${alpha(dark, 0.45)}" stroke-width="0.7"/>`
      );
    }
    return out.join("");
  }

  function drapeArt(product, color, opts) {
    const base = color.hex;
    const dark = shade(base, -0.3);
    const mid = shade(base, -0.12);
    const light = shade(base, 0.2);
    const tint = shade(base, 0.88);
    const id = uid();
    const style = product.style || "classic";
    const isBridal = style === "bridal";
    const garment = "#EBDFCD";
    const skin = "#EAD4B8";

    return `<svg class="art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" ${
      opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"'
    }>
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FAF5EC"/>
          <stop offset="1" stop-color="${tint}"/>
        </linearGradient>
        <linearGradient id="${id}fab" x1="0.1" y1="0" x2="0.92" y2="1">
          <stop offset="0" stop-color="${light}"/>
          <stop offset="0.4" stop-color="${base}"/>
          <stop offset="0.78" stop-color="${mid}"/>
          <stop offset="1" stop-color="${dark}"/>
        </linearGradient>
        <linearGradient id="${id}tail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${mid}"/>
          <stop offset="0.6" stop-color="${base}"/>
          <stop offset="1" stop-color="${shade(base, -0.2)}"/>
        </linearGradient>
        <radialGradient id="${id}sheen" cx="0.34" cy="0.16" r="0.9">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
          <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.08"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${id}glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="${alpha(base, 0.45)}"/>
          <stop offset="1" stop-color="${alpha(base, 0)}"/>
        </radialGradient>
        <radialGradient id="${id}face" cx="0.5" cy="0.4" r="0.62">
          <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="${alpha(dark, 0.2)}"/>
        </radialGradient>
        <clipPath id="${id}hood"><path d="${HOOD}"/></clipPath>
        <clipPath id="${id}tailc"><path d="${TAIL}"/></clipPath>
        ${patternDefs(style, base, dark, light, id)}
      </defs>

      <rect width="400" height="500" fill="url(#${id}bg)"/>
      <path d="M 62 500 L 62 250 A 138 138 0 0 1 338 250 L 338 500 Z" fill="#FFFFFF" opacity="0.42"/>
      <path d="M 62 500 L 62 250 A 138 138 0 0 1 338 250 L 338 500" fill="none" stroke="${alpha(dark, 0.12)}"/>
      <circle cx="200" cy="250" r="168" fill="url(#${id}glow)" opacity="0.5"/>
      <ellipse cx="200" cy="498" rx="150" ry="16" fill="${alpha(dark, 0.1)}"/>

      <!-- mannequin: shoulders, neck, head -->
      <path d="M 34 500 C 40 438 96 396 146 380 L 254 380 C 304 396 360 438 366 500 Z" fill="${garment}"/>
      <path d="M 34 500 C 40 438 96 396 146 380 L 170 380 L 150 500 Z" fill="${alpha("#FFFFFF", 0.25)}"/>
      <rect x="180" y="296" width="40" height="96" rx="16" fill="${shade(garment, -0.06)}"/>
      <ellipse cx="200" cy="205" rx="58" ry="72" fill="${skin}"/>

      <!-- drape: tail behind, hood in front -->
      <path d="${TAIL}" fill="url(#${id}tail)"/>
      <g clip-path="url(#${id}tailc)">${tailFolds(dark, light)}</g>
      <path d="${TAIL}" fill="none" stroke="${alpha(dark, 0.22)}" stroke-width="1.6"/>

      <path d="${HOOD}" fill="url(#${id}fab)"/>
      <g clip-path="url(#${id}hood)">
        ${style === "printed" || style === "pleated" || style === "instant" ? `<rect width="400" height="500" fill="url(#${id}p)"/>` : ""}
        ${folds(base, dark, light, style)}
        <rect width="400" height="500" fill="url(#${id}sheen)"/>
      </g>
      <path d="${HOOD}" fill="none" stroke="${alpha(dark, 0.2)}" stroke-width="1.6"/>

      <!-- face opening -->
      <ellipse cx="${FACE.cx}" cy="${FACE.cy}" rx="${FACE.rx}" ry="${FACE.ry}" fill="${skin}"/>
      <ellipse cx="${FACE.cx}" cy="${FACE.cy}" rx="${FACE.rx}" ry="${FACE.ry}" fill="url(#${id}face)"/>
      <ellipse cx="${FACE.cx}" cy="${FACE.cy}" rx="${FACE.rx}" ry="${FACE.ry}" fill="none" stroke="${alpha(dark, 0.4)}" stroke-width="2.4"/>
      <path d="M 158 236 C 176 262 224 262 242 236" fill="none" stroke="${alpha(dark, 0.07)}" stroke-width="10"/>

      <!-- gold pin at the temple -->
      <circle cx="252" cy="176" r="3.4" fill="#C9A66B"/>
      <circle cx="252" cy="176" r="5.2" fill="none" stroke="#C9A66B" stroke-opacity="0.45" stroke-width="1"/>

      ${
        style === "instant"
          ? `<g transform="translate(298 258) rotate(-16)">
               <ellipse rx="26" ry="16" fill="url(#${id}fab)"/>
               <ellipse rx="26" ry="16" fill="none" stroke="${alpha(dark, 0.32)}" stroke-width="1.6"/>
               <path d="M -17 -5 Q 0 -17 17 -5" fill="none" stroke="${alpha(light, 0.55)}" stroke-width="2"/>
               <path d="M -9 6 Q 0 14 9 6" fill="none" stroke="${alpha(dark, 0.18)}" stroke-width="1.6"/>
             </g>`
          : ""
      }

      ${isBridal ? pearls(dark) : ""}
    </svg>`;
  }

  function foldArt(product, color) {
    const base = color.hex;
    const dark = shade(base, -0.3);
    const light = shade(base, 0.24);
    const tint = shade(base, 0.85);
    const id = uid();
    const style = product.style || "classic";

    return `<svg class="art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FAF5EC"/><stop offset="1" stop-color="${tint}"/>
        </linearGradient>
        <linearGradient id="${id}f1" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${base}"/>
        </linearGradient>
        <linearGradient id="${id}f2" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/>
        </linearGradient>
        <filter id="${id}sh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="${alpha(dark, 0.35)}"/>
        </filter>
      </defs>
      <rect width="400" height="500" fill="url(#${id}bg)"/>
      <ellipse cx="200" cy="392" rx="132" ry="26" fill="${alpha(dark, 0.1)}"/>
      <g filter="url(#${id}sh)" transform="rotate(-6 200 260)">
        <rect x="78" y="186" width="244" height="62" rx="10" fill="${dark}"/>
        <rect x="72" y="214" width="256" height="66" rx="10" fill="url(#${id}f2)"/>
        <rect x="78" y="246" width="244" height="66" rx="10" fill="url(#${id}f1)"/>
        <rect x="84" y="278" width="232" height="62" rx="10" fill="${light}"/>
        <path d="M 84 300 C 150 288 250 312 316 300" fill="none" stroke="${alpha("#FFFFFF", 0.45)}" stroke-width="2"/>
        <path d="M 78 262 C 150 252 250 274 316 262" fill="none" stroke="${alpha(dark, 0.22)}" stroke-width="1.6"/>
        ${style === "printed" ? `<circle cx="128" cy="266" r="5" fill="${alpha(dark, 0.35)}"/><circle cx="176" cy="286" r="3.4" fill="${alpha(dark, 0.3)}"/><circle cx="252" cy="270" r="4.2" fill="${alpha(dark, 0.3)}"/><circle cx="292" cy="292" r="3" fill="${alpha(dark, 0.28)}"/>` : ""}
      </g>
      <g transform="translate(286 316) rotate(-10)">
        <rect x="0" y="0" width="64" height="30" rx="4" fill="#FFFCF5" stroke="${alpha(dark, 0.2)}"/>
        <text x="32" y="14" text-anchor="middle" font-family="Georgia, serif" font-size="7.5" letter-spacing="2.4" fill="${alpha(dark, 0.7)}">NOOR</text>
        <path d="M 8 21 H 56" stroke="${alpha(dark, 0.25)}" stroke-width="0.8"/>
        <text x="32" y="26" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="5" letter-spacing="1.6" fill="${alpha(dark, 0.55)}">${color.name.toUpperCase()}</text>
      </g>
      <text x="200" y="452" text-anchor="middle" font-family="Georgia, serif" font-size="9" letter-spacing="3.2" fill="${alpha(dark, 0.38)}">HAND FINISHED</text>
    </svg>`;
  }

  function detailArt(product, color) {
    const base = color.hex;
    const dark = shade(base, -0.32);
    const light = shade(base, 0.3);
    const tint = shade(base, 0.85);
    const id = uid();

    return `<svg class="art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FAF5EC"/><stop offset="1" stop-color="${tint}"/>
        </linearGradient>
        <linearGradient id="${id}b1" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${base}"/>
        </linearGradient>
        <linearGradient id="${id}b2" x1="0" y1="1" x2="0.8" y2="0">
          <stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${base}"/>
        </linearGradient>
        <linearGradient id="${id}b3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.18)}"/>
        </linearGradient>
        <clipPath id="${id}clip"><rect x="34" y="54" width="332" height="392" rx="6"/></clipPath>
      </defs>
      <rect width="400" height="500" fill="url(#${id}bg)"/>
      <g clip-path="url(#${id}clip)">
        <rect x="34" y="54" width="332" height="392" fill="${base}"/>
        <path d="M 20 150 C 130 78 260 250 380 160 L 380 296 C 250 372 120 200 20 286 Z" fill="url(#${id}b1)"/>
        <path d="M 20 292 C 150 216 262 360 380 300 L 380 430 C 260 486 140 358 20 428 Z" fill="url(#${id}b2)"/>
        <path d="M 20 60 C 150 120 250 20 380 74 L 380 116 C 250 66 150 168 20 106 Z" fill="url(#${id}b3)"/>
        <path d="M 40 180 C 150 120 250 268 372 196" fill="none" stroke="${alpha(light, 0.55)}" stroke-width="2"/>
        <path d="M 30 330 C 150 268 250 400 372 340" fill="none" stroke="${alpha(light, 0.35)}" stroke-width="1.6"/>
        <path d="M 44 214 C 150 158 250 300 372 232" fill="none" stroke="${alpha(dark, 0.25)}" stroke-width="1.2" stroke-dasharray="4 6"/>
        ${product.style === "printed" ? `<g opacity="0.55"><circle cx="120" cy="120" r="10" fill="${alpha(dark, 0.5)}"/><circle cx="270" cy="180" r="7" fill="${alpha(dark, 0.4)}"/><circle cx="200" cy="400" r="12" fill="${alpha(dark, 0.35)}"/></g>` : ""}
        ${product.style === "pleated" ? `<g stroke="${alpha(dark, 0.18)}" stroke-width="2">${Array.from({ length: 16 }, (_, i) => `<path d="M ${40 + i * 21} 54 L ${52 + i * 21} 446"/>`).join("")}</g>` : ""}
      </g>
      <rect x="34" y="54" width="332" height="392" rx="6" fill="none" stroke="${alpha(dark, 0.18)}"/>
      <text x="200" y="482" text-anchor="middle" font-family="Georgia, serif" font-size="9" letter-spacing="3.2" fill="${alpha(dark, 0.45)}">${color.name.toUpperCase()} · ${product.fabric.toUpperCase()}</text>
    </svg>`;
  }

  NS.art = {
    shade,
    alpha,
    /** product SVG; opts: { color: 'Sand', view: 'drape'|'fold'|'detail', label } */
    svg(product, opts) {
      const o = opts || {};
      const list = product.colors || [{ name: "Sand", hex: "#D8C3A5" }];
      const color = list.find((x) => x.name === o.color) || list[0];
      if (o.view === "fold") return foldArt(product, color);
      if (o.view === "detail") return detailArt(product, color);
      return drapeArt(product, color, o);
    },
    colorOf(product, name) {
      const list = product.colors || [];
      return list.find((x) => x.name === name) || list[0];
    },
  };
})();
