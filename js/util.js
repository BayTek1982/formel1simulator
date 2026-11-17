/* APEX GP – Hilfsfunktionen */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = (F1.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (a, b, x) => { x = U.clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  U.wrapPi = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  U.mod = (a, n) => ((a % n) + n) % n;
  U.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  U.sign = (v) => (v < 0 ? -1 : 1);

  // deterministischer Zufall (mulberry32)
  U.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash2 = function (x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.noise2 = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = U.hash2(xi, yi), b = U.hash2(xi + 1, yi), c = U.hash2(xi, yi + 1), d = U.hash2(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  U.fbm = function (x, y, oct) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { v += amp * U.noise2(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return v;
  };

  U.fmtTime = function (t) {
    if (t == null || !isFinite(t)) return '-:--.---';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
  };
  U.fmtDelta = function (d) {
    if (d == null || !isFinite(d)) return '';
    return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(3);
  };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // lokaler Speicher (kann im Artefakt fehlen)
  U.store = {
    get(k, def) { try { const v = localStorage.getItem('apexgp.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('apexgp.' + k, JSON.stringify(v)); } catch (e) { /* egal */ } },
  };

  // ---------- Three.js-Helfer ----------
  U.col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  U.canvas = function (w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  };
  U.tex = function (canvas, o) {
    o = o || {};
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (o.repeat.length) t.repeat.set(o.repeat[0], o.repeat[1]); }
    t.anisotropy = o.aniso || U.maxAniso || 4;
    return t;
  };
  // Geometrie verschieben/drehen (Reihenfolge: skalieren, drehen XYZ, verschieben)
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  U.xf = function (g, x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _p.set(x || 0, y || 0, z || 0); _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    return g;
  };
  U.box = function (w, h, d, x, y, z, rx, ry, rz) {
    return U.xf(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  };
  // Balken zwischen zwei Punkten
  U.beam = function (x0, y0, z0, x1, y1, z1, w, h) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
    const g = new THREE.BoxGeometry(w, h == null ? w : h, len);
    const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    return U.xf(g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, pitch, yaw, 0);
  };
  U.tint = function (g, hex) { g.userData.col = U.col(hex); return g; };
  // mehrere Geometrien zu einer (nicht indizierten) verschmelzen; Farben über userData.col
  U.merge = function (list, withColor) {
    let total = 0; const parts = [];
    for (const g0 of list) {
      if (!g0) continue;
      const g = g0.index ? g0.toNonIndexed() : g0;
      if (!g.attributes.normal) g.computeVertexNormals();
      parts.push([g, g0.userData.col]); total += g.attributes.position.count;
    }
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const col = withColor ? new Float32Array(total * 3) : null;
    let o = 0;
    for (const [g, c] of parts) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array.subarray(0, n * 3), o * 3);
      nor.set(g.attributes.normal.array.subarray(0, n * 3), o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, n * 2), o * 2);
      if (col) {
        if (g.attributes.color) col.set(g.attributes.color.array.subarray(0, n * 3), o * 3);
        else { const r = c ? c.r : 1, gg = c ? c.g : 1, b = c ? c.b : 1; for (let i = 0; i < n; i++) { col[(o + i) * 3] = r; col[(o + i) * 3 + 1] = gg; col[(o + i) * 3 + 2] = b; } }
      }
      o += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  };
  U.disposeTree = function (root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k] && !m[k].keepTex) m[k].dispose();
          m.dispose();
        }
      }
    });
  };
})();
