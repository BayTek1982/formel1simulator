/* APEX GP – Strecken: Layout, Ideallinie, Tempoprofil */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;
  const PHYS = (F1.PHYS = { G: 9.81, MU: 1.75, KDF: 0.0034, KDRAG: 0.00112, POWER: 940, TRAC: 0.62, ROLL: 0.25, VTOP: 105 });

  // Layout-Sprache: ['s',Meter] Gerade · ['S',0] Gerade mit automatischer Länge (2 pro Strecke, schließen die Runde)
  //                 ['l',Grad,Radius] Linkskurve · ['r',Grad,Radius] Rechtskurve
  const DEFS = [
    {
      id: 'monteverde', name: 'Autodromo Monteverde', tag: 'Highspeed-Tempel im Königspark', theme: 'park', width: 13, time: 'day',
      elev: [[0, 0], [0.18, 3], [0.4, -2.5], [0.62, 4], [0.85, 1]],
      segs: [['s', 330], ['r', 45, 28], ['l', 90, 24], ['r', 45, 28], ['s', 120], ['l', 75, 260], ['S', 0],
        ['l', 45, 30], ['r', 90, 26], ['l', 45, 30], ['s', 180], ['l', 65, 75], ['s', 150], ['l', 70, 60], ['s', 700],
        ['l', 35, 70], ['r', 70, 80], ['l', 35, 70], ['s', 380], ['l', 70, 70], ['l', 80, 150], ['S', 0]],
    },
    {
      id: 'porto', name: 'Porto Azzurro', tag: 'Enger Stadtkurs am Hafen – mit Tunnel', theme: 'city', width: 11, time: 'night',
      elev: [[0, 0], [0.5, 0]], tunnel: [0.478, 0.572],
      segs: [['s', 300], ['r', 90, 22], ['s', 140], ['l', 90, 25], ['s', 200], ['l', 90, 30], ['s', 160], ['r', 90, 20], ['s', 160],
        ['l', 180, 16], ['s', 300], ['r', 90, 25], ['s', 120], ['l', 90, 28], ['s', 480], ['l', 90, 40], ['S', 0],
        ['r', 40, 30], ['l', 80, 26], ['r', 40, 30], ['s', 60], ['l', 90, 30], ['S', 0]],
    },
    {
      id: 'alpen', name: 'Alpenring Silberhorn', tag: 'Berg-und-Tal-Bahn mit zwei Kehren', theme: 'alpine', width: 12.5, time: 'day',
      elev: [[0, 0], [0.12, 16], [0.28, 40], [0.4, 30], [0.55, 6], [0.66, -8], [0.8, 12], [0.92, 3]],
      segs: [['s', 260], ['r', 70, 90], ['s', 150], ['l', 50, 110], ['s', 200], ['r', 150, 32], ['s', 180], ['l', 80, 60], ['s', 150],
        ['r', 60, 140], ['s', 220], ['r', 100, 45], ['S', 0], ['l', 120, 38], ['s', 200], ['r', 95, 70], ['s', 260],
        ['r', 75, 120], ['s', 140], ['r', 60, 55], ['S', 0]],
    },
    {
      id: 'dunes', name: 'Dünenring Sahara', tag: 'Wüstenkurs mit endlosen Geraden', theme: 'desert', width: 14, time: 'dusk',
      elev: [[0, 0], [0.2, 5], [0.45, -3], [0.7, 6], [0.9, 1]],
      segs: [['s', 380], ['l', 100, 40], ['s', 120], ['r', 70, 50], ['s', 160], ['l', 150, 70], ['s', 600],
        ['l', 45, 35], ['r', 90, 30], ['l', 45, 35], ['s', 240], ['r', 95, 45], ['s', 140], ['l', 185, 28], ['S', 0],
        ['l', 60, 180], ['s', 180], ['l', 30, 100], ['S', 0]],
    },
  ];

  const THEMES = {
    park: { runBase: 5, runK: 620, runMax: 19, inside: 4.5, gravel: true },
    alpine: { runBase: 4.5, runK: 520, runMax: 15, inside: 4, gravel: true },
    desert: { runBase: 7, runK: 700, runMax: 22, inside: 6, gravel: true },
    city: { runBase: 1.4, runK: 110, runMax: 6, inside: 1.4, gravel: false },
  };

  function turtle(segs, flex) {
    let x = 0, z = 0, h = 0, fi = 0;
    const xs = [0], zs = [0], fh = [];
    for (const sg of segs) {
      const t = sg[0];
      if (t === 's' || t === 'S') {
        let len = sg[1];
        if (t === 'S') { len = flex[fi++]; fh.push(h); }
        if (len <= 0) continue;
        const k = Math.max(1, Math.floor(len / 2)), st = len / k;
        for (let i = 0; i < k; i++) { x += Math.sin(h) * st; z += Math.cos(h) * st; xs.push(x); zs.push(z); }
      } else {
        const ang = (sg[1] * Math.PI / 180) * (t === 'l' ? 1 : -1), R = sg[2];
        const arc = Math.abs(ang) * R, k = Math.max(2, Math.floor(arc / 2)), da = ang / k, st = arc / k;
        for (let i = 0; i < k; i++) { h += da / 2; x += Math.sin(h) * st; z += Math.cos(h) * st; h += da / 2; xs.push(x); zs.push(z); }
      }
    }
    return { xs, zs, fh, x, z, h };
  }

  function resample(xs, zs, n) {
    const m = xs.length, cum = new Float64Array(m + 1);
    for (let i = 0; i < m; i++) { const j = (i + 1) % m; cum[i + 1] = cum[i] + Math.hypot(xs[j] - xs[i], zs[j] - zs[i]); }
    const L = cum[m], ox = new Float64Array(n), oz = new Float64Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const t = (i * L) / n;
      while (k < m - 1 && cum[k + 1] < t) k++;
      const f = (t - cum[k]) / (cum[k + 1] - cum[k] || 1), j = (k + 1) % m;
      ox[i] = xs[k] + (xs[j] - xs[k]) * f; oz[i] = zs[k] + (zs[j] - zs[k]) * f;
    }
    return { x: ox, z: oz, L };
  }
  function smoothClosed(a, passes) {
    const n = a.length, b = new Float64Array(n);
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < n; i++) b[i] = (a[(i + n - 1) % n] + 2 * a[i] + a[(i + 1) % n]) / 4;
      a.set(b);
    }
  }

  function racingLine(tr) {
    const n = tr.n, px = tr.px, pz = tr.pz, nx = tr.nx, nz = tr.nz, hw = tr.hw;
    const o = new Float64Array(n), hi = new Float64Array(n), lo = new Float64Array(n);
    for (let i = 0; i < n; i++) { hi[i] = hw - (tr.kerbL[i] ? 0.8 : 1.35); lo[i] = -(hw - (tr.kerbR[i] ? 0.8 : 1.35)); }
    for (const step of [16, 8, 4, 2, 1]) {
      const m = n / step, iters = step >= 8 ? 500 : step === 4 ? 350 : step === 2 ? 220 : 110;
      for (let it = 0; it < iters; it++) {
        for (let a = 0; a < m; a++) {
          const i = a * step, i1 = ((a - 1 + m) % m) * step, i2 = ((a - 2 + m) % m) * step, j1 = ((a + 1) % m) * step, j2 = ((a + 2) % m) * step;
          const q1x = px[i1] + nx[i1] * o[i1], q1z = pz[i1] + nz[i1] * o[i1];
          const q2x = px[i2] + nx[i2] * o[i2], q2z = pz[i2] + nz[i2] * o[i2];
          const r1x = px[j1] + nx[j1] * o[j1], r1z = pz[j1] + nz[j1] * o[j1];
          const r2x = px[j2] + nx[j2] * o[j2], r2z = pz[j2] + nz[j2] * o[j2];
          const NA = nx[i] * (q2x - 2 * q1x + px[i]) + nz[i] * (q2z - 2 * q1z + pz[i]);
          const NB = nx[i] * (q1x + r1x - 2 * px[i]) + nz[i] * (q1z + r1z - 2 * pz[i]);
          const NC = nx[i] * (px[i] - 2 * r1x + r2x) + nz[i] * (pz[i] - 2 * r1z + r2z);
          o[i] = U.clamp((2 * NB - NA - NC) / 6, lo[i], hi[i]);
        }
      }
      if (step > 1) {
        const h = step / 2;
        for (let a = 0; a < m; a++) { const i = a * step, j = ((a + 1) % m) * step; o[i + h] = U.clamp((o[i] + o[j]) / 2, lo[i + h], hi[i + h]); }
      }
    }
    smoothClosed(o, 2);
    for (let i = 0; i < n; i++) o[i] = U.clamp(o[i], lo[i], hi[i]);
    return o;
  }

  // Tempoprofil entlang der Ideallinie (o: {mu, pow, df} als Faktoren)
  function profile(tr, o) {
    o = o || {};
    const P = PHYS, n = tr.n, ds = tr.ds, rk = tr.rk, v = new Float32Array(n);
    const mu = P.MU * (o.mu || 1), muA = P.MU * (o.muAcc || o.mu || 1), pow = P.POWER * (o.pow || 1), kdf = P.KDF * (o.df || 1), vTop = o.vTop || P.VTOP, BR = o.brake || 0.92;
    for (let i = 0; i < n; i++) {
      const den = Math.abs(rk[i]) - mu * kdf * 0.96;
      v[i] = den <= 1e-6 ? vTop : Math.min(vTop, Math.sqrt((mu * P.G * 0.96) / den));
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = n - 1; i >= 0; i--) {
        const j = (i + 1) % n, vj = v[j];
        const aTot = mu * (P.G + kdf * vj * vj) * BR, aLat = vj * vj * Math.abs(rk[j]);
        const aLong = Math.sqrt(Math.max(0, aTot * aTot - aLat * aLat)) + P.KDRAG * vj * vj;
        const vi = Math.sqrt(vj * vj + 2 * aLong * ds);
        if (vi < v[i]) v[i] = vi;
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, vi = v[i];
        const aTot = mu * (P.G + kdf * vi * vi), aLat = Math.min(aTot, vi * vi * Math.abs(rk[i]));
        const grip = Math.sqrt(Math.max(0, 1 - (aLat / aTot) * (aLat / aTot)));
        const a = Math.min(pow / Math.max(vi, 5), P.TRAC * muA * (P.G + kdf * vi * vi) * grip) - P.KDRAG * vi * vi - P.ROLL;
        const vj = Math.sqrt(Math.max(1, vi * vi + 2 * a * ds));
        if (vj < v[j]) v[j] = vj;
      }
    }
    return v;
  }
  function lapTime(tr, prof) { let t = 0; for (let i = 0; i < tr.n; i++) t += tr.ds / Math.max(1, prof[i]); return t; }

  function build(def) {
    const th = THEMES[def.theme];
    // --- Layout schließen ---
    const r0 = turtle(def.segs, [0, 0]);
    const d1x = Math.sin(r0.fh[0]), d1z = Math.cos(r0.fh[0]), d2x = Math.sin(r0.fh[1]), d2z = Math.cos(r0.fh[1]);
    const det = d1x * d2z - d1z * d2x;
    const L1 = (-r0.x * d2z + r0.z * d2x) / det, L2 = (-d1x * r0.z + d1z * r0.x) / det;
    const r = turtle(def.segs, [L1, L2]);
    r.xs.pop(); r.zs.pop();
    let L0 = 0;
    for (let i = 0; i < r.xs.length; i++) { const j = (i + 1) % r.xs.length; L0 += Math.hypot(r.xs[j] - r.xs[i], r.zs[j] - r.zs[i]); }
    const n = Math.round(L0 / 3 / 16) * 16;
    let rs = resample(r.xs, r.zs, n);
    smoothClosed(rs.x, 8); smoothClosed(rs.z, 8);
    rs = resample(Array.from(rs.x), Array.from(rs.z), n);
    const L = rs.L, ds = L / n, hw = def.width / 2;

    const tr = { def, id: def.id, theme: def.theme, n, L, ds, hw, turnSign: r0.h > 0 ? 1 : -1 };
    const px = (tr.px = new Float32Array(rs.x)), pz = (tr.pz = new Float32Array(rs.z));
    const tx = (tr.tx = new Float32Array(n)), tz = (tr.tz = new Float32Array(n));
    const nx = (tr.nx = new Float32Array(n)), nz = (tr.nz = new Float32Array(n));
    const hd = (tr.hd = new Float32Array(n)), k = (tr.k = new Float32Array(n));
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      let dx = px[b] - px[a], dz = pz[b] - pz[a]; const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      tx[i] = dx; tz[i] = dz; nx[i] = dz; nz[i] = -dx; hd[i] = Math.atan2(dx, dz);
    }
    for (let i = 0; i < n; i++) k[i] = U.wrapPi(hd[(i + 1) % n] - hd[(i + n - 1) % n]) / (2 * ds);
    const kc = new Float64Array(k); smoothClosed(kc, 5); tr.kc = new Float32Array(kc);

    // --- Höhe ---
    const py = new Float64Array(n), ek = def.elev;
    for (let i = 0; i < n; i++) {
      const t = i / n; let a = ek.length - 1;
      for (let j = 0; j < ek.length; j++) if (ek[j][0] <= t) a = j;
      const b = (a + 1) % ek.length;
      const fa = ek[a][0] <= t ? ek[a][0] : ek[a][0] - 1, fb = b > a ? ek[b][0] : ek[b][0] + 1;
      const u = (t - fa) / (fb - fa || 1);
      py[i] = U.lerp(ek[a][1], ek[b][1], (1 - Math.cos(Math.PI * U.clamp(u, 0, 1))) / 2);
    }
    smoothClosed(py, 30);
    tr.py = new Float32Array(py);
    tr.flat = ek.every((e) => e[1] === 0);
    const slope = (tr.slope = new Float32Array(n));
    for (let i = 0; i < n; i++) slope[i] = (py[(i + 1) % n] - py[(i + n - 1) % n]) / (2 * ds);

    // --- Kerbs ---
    const kerbL = (tr.kerbL = new Uint8Array(n)), kerbR = (tr.kerbR = new Uint8Array(n));
    for (let i = 0; i < n; i++) {
      let mx = 0;
      for (let j = -5; j <= 5; j++) mx = Math.max(mx, Math.abs(kc[(i + j + n) % n]));
      if (mx > 0.0055) { kerbL[i] = 1; kerbR[i] = 1; }
    }

    // --- Auslaufzonen & Mauern ---
    const wl = new Float64Array(n), wr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let K = 0, sg = 0;
      for (let j = -16; j <= 16; j++) { const v = kc[(i + j + n) % n]; if (Math.abs(v) > K) { K = Math.abs(v); sg = v > 0 ? 1 : -1; } }
      let out = th.runBase, ins = th.runBase;
      if (K > 0.003) { out = U.clamp(th.runBase + th.runK * (K - 0.003), th.runBase, th.runMax); ins = th.inside; }
      wl[i] = hw + (sg > 0 ? ins : out); wr[i] = hw + (sg > 0 ? out : ins);
    }
    smoothClosed(wl, 14); smoothClosed(wr, 14);
    const minW = hw + 0.9;
    for (let i = 0; i < n; i++) {
      let mL = 1e9, mR = 1e9;
      for (let j = 0; j < n; j += 2) {
        const sep = Math.min(Math.abs(i - j), n - Math.abs(i - j)) * ds;
        if (sep < 70) continue;
        const dx = px[j] - px[i], dz = pz[j] - pz[i], d2 = dx * dx + dz * dz;
        if (d2 > 8100) continue;
        const d = Math.sqrt(d2) / 2 - 0.6;
        if (dx * nx[i] + dz * nz[i] > 0) { if (d < mL) mL = d; } else if (d < mR) mR = d;
      }
      if (k[i] > 0.004) mL = Math.min(mL, 0.6 / k[i]);
      if (k[i] < -0.004) mR = Math.min(mR, 0.6 / -k[i]);
      wl[i] = Math.max(minW, Math.min(wl[i], mL)); wr[i] = Math.max(minW, Math.min(wr[i], mR));
    }
    smoothClosed(wl, 3); smoothClosed(wr, 3);
    for (let i = 0; i < n; i++) { wl[i] = Math.max(minW, wl[i]); wr[i] = Math.max(minW, wr[i]); }
    tr.wl = new Float32Array(wl); tr.wr = new Float32Array(wr);
    const gravL = (tr.gravL = new Uint8Array(n)), gravR = (tr.gravR = new Uint8Array(n));
    if (th.gravel) for (let i = 0; i < n; i++) { gravL[i] = wl[i] - hw > 9 ? 1 : 0; gravR[i] = wr[i] - hw > 9 ? 1 : 0; }

    // --- Ideallinie ---
    const ro = racingLine(tr);
    tr.ro = new Float32Array(ro);
    const rx = (tr.rx = new Float32Array(n)), rz = (tr.rz = new Float32Array(n));
    for (let i = 0; i < n; i++) { rx[i] = px[i] + nx[i] * ro[i]; rz[i] = pz[i] + nz[i] * ro[i]; }
    const rh = new Float64Array(n), rk = new Float64Array(n);
    for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n; rh[i] = Math.atan2(rx[b] - rx[a], rz[b] - rz[a]); }
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      rk[i] = U.wrapPi(rh[b] - rh[a]) / (Math.hypot(rx[b] - rx[a], rz[b] - rz[a]) || 1);
    }
    smoothClosed(rk, 2);
    tr.rk = new Float32Array(rk);
    const dro = (tr.dro = new Float32Array(n));
    for (let i = 0; i < n; i++) dro[i] = (ro[(i + 1) % n] - ro[(i + n - 1) % n]) / (2 * ds);

    tr.refProf = profile(tr, {});
    tr.refTime = lapTime(tr, tr.refProf);

    // --- Kurven ---
    const v = tr.refProf, corners = (tr.corners = []);
    let skip = -1;
    for (let i = 0; i < n; i++) {
      if (i <= skip || v[i] > 80) continue;
      let isMin = true;
      for (let j = -12; j <= 12 && isMin; j++) if (v[(i + j + n) % n] < v[i] - 1e-4) isMin = false;
      if (!isMin) continue;
      let b = i, steps = 0;
      while (steps < 200 && v[(b + n - 1) % n] > v[b] + 1e-3) { b = (b + n - 1) % n; steps++; }
      corners.push({ i, s: i * ds, v: v[i], dir: rk[i] > 0 ? 1 : -1, brakeI: b, brakeS: b * ds, dv: v[b] - v[i] });
      skip = i + 12;
    }
    corners.forEach((c, j) => (c.num = j + 1));

    // --- Geraden / DRS ---
    tr.drs = [];
    let longest = { len: 0, endI: 0 };
    let i0 = 0;
    for (let i = 0; i < n; i++) if (Math.abs(kc[i]) >= 0.0015) { i0 = i; break; }
    let runStart = -1;
    for (let q = 0; q <= n; q++) {
      const i = (i0 + q) % n, straight = Math.abs(kc[i]) < 0.0015 && q < n;
      if (straight && runStart < 0) runStart = q;
      if (!straight && runStart >= 0) {
        const len = (q - runStart) * ds, sA = ((i0 + runStart) % n) * ds, sB = ((i0 + q) % n) * ds;
        if (len >= 400) tr.drs.push({ s0: (sA + 110) % L, s1: U.mod(sB - 25, L), len });
        if (len > longest.len) longest = { len, endI: (i0 + q) % n };
        runStart = -1;
      }
    }
    tr.trapS = U.mod(longest.endI * ds - 70, L);
    tr.sectors = [L / 3, (2 * L) / 3];

    // --- Suchraster ---
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < n; i++) { minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i]); minZ = Math.min(minZ, pz[i]); maxZ = Math.max(maxZ, pz[i]); }
    tr.bbox = { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
    const CELL = 40, grid = new Map();
    const key = (cx, cz) => cx * 8192 + cz;
    for (let i = 0; i < n; i++) {
      const kk = key(Math.floor((px[i] - minX) / CELL) + 8, Math.floor((pz[i] - minZ) / CELL) + 8);
      let a = grid.get(kk); if (!a) grid.set(kk, (a = [])); a.push(i);
    }
    // Abstand zur Mittellinie (nur bis ~40 m verlässlich, sonst Infinity)
    tr.distTo = function (x, z, out) {
      const cx = Math.floor((x - minX) / CELL) + 8, cz = Math.floor((z - minZ) / CELL) + 8;
      let best = 1e18, bi = -1;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const arr = grid.get(key(cx + a, cz + b)); if (!arr) continue;
        for (let q = 0; q < arr.length; q++) { const i = arr[q], dx = x - px[i], dz = z - pz[i], d2 = dx * dx + dz * dz; if (d2 < best) { best = d2; bi = i; } }
      }
      if (out) out.i = bi;
      return bi < 0 ? Infinity : Math.sqrt(best);
    };
    // Abstand zum Streckenkorridor (negativ = innerhalb der Mauern)
    tr.clearance = function (x, z) {
      const o = {}; const d = tr.distTo(x, z, o);
      if (o.i < 0) return Infinity;
      const side = (x - px[o.i]) * nx[o.i] + (z - pz[o.i]) * nz[o.i];
      return d - (side > 0 ? wl[o.i] : wr[o.i]);
    };

    // --- Abfragen ---
    tr.locate = function (x, z, hint, out) {
      let bi = 0, best = 1e18;
      if (hint == null || hint < 0) {
        for (let i = 0; i < n; i++) { const dx = x - px[i], dz = z - pz[i], d2 = dx * dx + dz * dz; if (d2 < best) { best = d2; bi = i; } }
      } else {
        for (let q = -14; q <= 14; q++) { const i = (hint + q + n) % n, dx = x - px[i], dz = z - pz[i], d2 = dx * dx + dz * dz; if (d2 < best) { best = d2; bi = i; } }
      }
      const dx = x - px[bi], dz = z - pz[bi];
      out.i = bi;
      out.s = U.mod(bi * ds + dx * tx[bi] + dz * tz[bi], L);
      out.d = dx * nx[bi] + dz * nz[bi];
      return out;
    };
    tr.pos = function (s, d, out) {
      const f = U.mod(s, L) / ds, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
      const ax = px[i] + nx[i] * d, az = pz[i] + nz[i] * d, bx = px[j] + nx[j] * d, bz = pz[j] + nz[j] * d;
      out.x = ax + (bx - ax) * t; out.z = az + (bz - az) * t; out.y = tr.py[i] + (tr.py[j] - tr.py[i]) * t;
      out.i = i;
      return out;
    };
    tr.at = function (arr, s) {
      const f = U.mod(s, L) / ds, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
      return arr[i] + (arr[j] - arr[i]) * t;
    };
    tr.headingAt = function (s) {
      const f = U.mod(s, L) / ds, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
      return hd[i] + U.wrapPi(hd[j] - hd[i]) * t;
    };
    // 0 Asphalt · 1 Kerb · 2 Gras · 3 Kies · 4 befestigter Auslauf
    tr.surface = function (i, d) {
      const a = Math.abs(d), left = d > 0, kerb = left ? kerbL[i] : kerbR[i];
      if (a <= hw + (kerb ? 0 : 0.6)) return 0;
      if (kerb && a <= hw + 2.0) return 1;
      if (def.theme === 'city') return 4;
      if ((left ? gravL[i] : gravR[i]) && a > hw + 2.6) return 3;
      return 2;
    };
    tr.inDrs = function (s) {
      for (const zn of tr.drs) { if (zn.s0 < zn.s1 ? s >= zn.s0 && s <= zn.s1 : s >= zn.s0 || s <= zn.s1) return true; }
      return false;
    };
    // weich interpolierte Geländehöhe aus den Streckenhöhen
    const sub = [];
    for (let i = 0; i < n; i += 6) sub.push(i);
    tr.heightIDW = function (x, z) {
      if (tr.flat) return 0;
      let sw = 0, sh = 0;
      for (let q = 0; q < sub.length; q++) {
        const i = sub[q], dx = x - px[i], dz = z - pz[i], d2 = dx * dx + dz * dz + 30;
        const w = 1 / (d2 * d2); sw += w; sh += w * tr.py[i];
      }
      return sh / sw;
    };
    tr.profile = (o) => profile(tr, o);
    tr.lapTime = (p) => lapTime(tr, p);
    return tr;
  }

  const cache = {};
  F1.Tracks = {
    DEFS,
    get(id) { if (!cache[id]) cache[id] = build(DEFS.find((d) => d.id === id) || DEFS[0]); return cache[id]; },
    // Umriss in ein Canvas zeichnen; liefert die Abbildung Welt → Pixel
    fit(tr, w, h, pad) {
      const b = tr.bbox, sc = Math.min((w - 2 * pad) / (b.maxX - b.minX), (h - 2 * pad) / (b.maxZ - b.minZ));
      const ox = w / 2 - b.cx * sc, oz = h / 2 - b.cz * sc;
      return { sc, X: (x) => x * sc + ox, Y: (z) => z * sc + oz };
    },
    drawOutline(ctx, tr, m, o) {
      o = o || {};
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); for (let i = 0; i < tr.n; i += 2) { const x = m.X(tr.px[i]), y = m.Y(tr.pz[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); };
      if (o.glow) { ctx.strokeStyle = o.glow; ctx.lineWidth = (o.width || 4) + 5; path(); ctx.stroke(); }
      ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = o.width || 4; path(); ctx.stroke();
      if (o.sectors) {
        const cols = ['#ff4d5e', '#4db8ff', '#ffd23f'];
        for (let q = 0; q < 3; q++) {
          ctx.strokeStyle = cols[q]; ctx.lineWidth = (o.width || 4) * 0.55; ctx.beginPath();
          const a = Math.floor((q * tr.n) / 3), b = Math.floor(((q + 1) * tr.n) / 3);
          for (let i = a; i <= b; i += 2) { const j = i % tr.n, x = m.X(tr.px[j]), y = m.Y(tr.pz[j]); if (i === a) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      // Start/Ziel
      const x = m.X(tr.px[0]), y = m.Y(tr.pz[0]);
      ctx.fillStyle = o.start || '#fff'; ctx.beginPath(); ctx.arc(x, y, (o.width || 4) * 0.9, 0, 6.3); ctx.fill();
    },
  };
})();
