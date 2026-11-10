/*
 * clk-noise.js — noise per-profil untuk sinyal yang engine CloakBrowser belum punya.
 *
 * Dua blok TERPISAH, bisa dinyalakan sendiri-sendiri:
 *   __RECTS__  -> Element.getBoundingClientRect / getClientRects / SVG text metrics
 *                 ⚠ terdeteksi Cloudflare (fungsi jadi non-native) -> default OFF
 *   __AUDIO__  -> AudioBuffer.getChannelData
 *                 relatif aman, dan tanpa ini audio identik di semua profil -> default ON
 *
 * Deterministik per seed: nilai sama tiap kali profil dibuka.
 * Wrapper disamarkan supaya Function.prototype.toString tetap melaporkan
 * "[native code]" untuk fungsi yang kita timpa.
 */
(() => {
  const SEED = __SEED__;
  const DO_RECTS = __RECTS__;
  const DO_AUDIO = __AUDIO__;
  if (!DO_RECTS && !DO_AUDIO) return;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(SEED);
  const desc = (proto, name) => Object.getOwnPropertyDescriptor(proto, name);

  // --- samarkan wrapper: toString/name/length tetap seperti native ---
  const wrapped = new WeakMap();
  const nativeStr = Function.prototype.toString;
  const fakeToString = {
    toString() {
      const name = wrapped.get(this);
      return name ? `function ${name}() { [native code] }` : nativeStr.call(this);
    },
  }.toString;
  Object.defineProperty(Function.prototype, "toString", {
    ...desc(Function.prototype, "toString"),
    value: fakeToString,
  });
  function mask(fn, name, arity) {
    wrapped.set(fn, name);
    try {
      Object.defineProperty(fn, "name", { value: name, configurable: true });
      Object.defineProperty(fn, "length", { value: arity, configurable: true });
    } catch (e) {}
    return fn;
  }

  // ================= RECTS + SVG =================
  if (DO_RECTS) {
    const RECT_XY = 0.6;
    const RECT_WH = 0.25;
    const off = new WeakMap();
    function offsetFor(el) {
      let o = off.get(el);
      if (!o) {
        o = {
          x: (rnd() - 0.5) * RECT_XY,
          y: (rnd() - 0.5) * RECT_XY,
          w: (rnd() - 0.5) * RECT_WH,
          h: (rnd() - 0.5) * RECT_WH,
        };
        off.set(el, o);
      }
      return o;
    }

    const gbcr = desc(Element.prototype, "getBoundingClientRect");
    if (gbcr && gbcr.value) {
      const orig = gbcr.value;
      Object.defineProperty(Element.prototype, "getBoundingClientRect", {
        ...gbcr,
        value: mask(function () {
          const r = orig.call(this);
          const o = offsetFor(this);
          try {
            return new DOMRect(r.x + o.x, r.y + o.y, r.width + o.w, r.height + o.h);
          } catch (e) {
            return r;
          }
        }, "getBoundingClientRect", 0),
      });
    }

    const gcr = desc(Element.prototype, "getClientRects");
    if (gcr && gcr.value) {
      const orig = gcr.value;
      Object.defineProperty(Element.prototype, "getClientRects", {
        ...gcr,
        value: mask(function () {
          const list = orig.call(this);
          if (!list || !list.length) return list;
          const o = offsetFor(this);
          const out = [];
          for (let i = 0; i < list.length; i++) {
            const r = list[i];
            try {
              out.push(new DOMRect(r.x + o.x, r.y + o.y, r.width + o.w, r.height + o.h));
            } catch (e) {
              out.push(r);
            }
          }
          out.item = (i) => out[i] ?? null;
          return out;
        }, "getClientRects", 0),
      });
    }

    // Range (iphey/creepjs kadang ukur lewat Range, bukan Element)
    if (window.Range && Range.prototype) {
      const r1 = desc(Range.prototype, "getBoundingClientRect");
      if (r1 && r1.value) {
        const orig = r1.value;
        Object.defineProperty(Range.prototype, "getBoundingClientRect", {
          ...r1,
          value: mask(function () {
            const r = orig.call(this);
            const o = offsetFor(this);
            try {
              return new DOMRect(r.x + o.x, r.y + o.y, r.width + o.w, r.height + o.h);
            } catch (e) {
              return r;
            }
          }, "getBoundingClientRect", 0),
        });
      }
      const r2 = desc(Range.prototype, "getClientRects");
      if (r2 && r2.value) {
        const orig = r2.value;
        Object.defineProperty(Range.prototype, "getClientRects", {
          ...r2,
          value: mask(function () {
            const list = orig.call(this);
            if (!list || !list.length) return list;
            const o = offsetFor(this);
            const out = [];
            for (let i = 0; i < list.length; i++) {
              const r = list[i];
              try {
                out.push(new DOMRect(r.x + o.x, r.y + o.y, r.width + o.w, r.height + o.h));
              } catch (e) {
                out.push(r);
              }
            }
            out.item = (i) => out[i] ?? null;
            return out;
          }, "getClientRects", 0),
        });
      }
    }

    // SVGGeometryElement.getBBox + getBoundingRect (SVG "Computed Style")
    if (window.SVGGraphicsElement && SVGGraphicsElement.prototype) {
      const gbb = desc(SVGGraphicsElement.prototype, "getBBox");
      if (gbb && gbb.value) {
        const orig = gbb.value;
        Object.defineProperty(SVGGraphicsElement.prototype, "getBBox", {
          ...gbb,
          value: mask(function () {
            const b = orig.call(this);
            const o = offsetFor(this);
            try {
              return new DOMRect(b.x + o.x, b.y + o.y, b.width + o.w, b.height + o.h);
            } catch (e) {
              return b;
            }
          }, "getBBox", 0),
        });
      }
    }

    const svgProto = window.SVGTextContentElement && SVGTextContentElement.prototype;
    if (svgProto) {
      const gctl = desc(svgProto, "getComputedTextLength");
      if (gctl && gctl.value) {
        const orig = gctl.value;
        Object.defineProperty(svgProto, "getComputedTextLength", {
          ...gctl,
          value: mask(function () {
            return orig.call(this) + offsetFor(this).w;
          }, "getComputedTextLength", 0),
        });
      }
      const gsl = desc(svgProto, "getSubStringLength");
      if (gsl && gsl.value) {
        const orig = gsl.value;
        Object.defineProperty(svgProto, "getSubStringLength", {
          ...gsl,
          value: mask(function (a, b) {
            return orig.call(this, a, b) + offsetFor(this).w / 2;
          }, "getSubStringLength", 2),
        });
      }
    }
  }

  // ================= AUDIO =================
  if (DO_AUDIO && window.AudioBuffer && AudioBuffer.prototype) {
    const AUDIO_AMP = 2e-7;
    const d = desc(AudioBuffer.prototype, "getChannelData");
    if (d && d.value) {
      const orig = d.value;
      const touched = new WeakSet();
      Object.defineProperty(AudioBuffer.prototype, "getChannelData", {
        ...d,
        value: mask(function (ch) {
          const arr = orig.call(this, ch);
          if (!touched.has(this)) {
            touched.add(this);
            const n = Math.min(arr.length, 8820);
            for (let i = 0; i < n; i++) {
              arr[i] += (rnd() - 0.5) * 2 * AUDIO_AMP;
            }
          }
          return arr;
        }, "getChannelData", 1),
      });
    }
  }
})();
