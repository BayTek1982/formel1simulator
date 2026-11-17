/* APEX GP – Welt: Strecke, Gelände, Kulisse, Himmel, Licht */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;
  const TX = {};
  const keep = (t) => { t.keepTex = true; return t; };
  const P = { x: 0, y: 0, z: 0, i: 0 };

  // ---------- Texturen ----------
  function tAsphalt() {
    if (TX.asph) return TX.asph;
    const [c, g] = U.canvas(512, 512), r = U.rng(7);
    g.fillStyle = '#8c8d92'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 30000; i++) { const v = (95 + r() * 90) | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 5) + ',' + (0.25 + r() * 0.45) + ')'; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); }
    for (let i = 0; i < 46; i++) { g.strokeStyle = 'rgba(30,30,34,' + (0.04 + r() * 0.07) + ')'; g.lineWidth = 1 + r() * 4; g.beginPath(); const x = r() * 512; g.moveTo(x, 0); g.lineTo(x + r() * 26 - 13, 512); g.stroke(); }
    return (TX.asph = keep(U.tex(c, { repeat: true })));
  }
  function tNoise() {
    if (TX.noise) return TX.noise;
    const [c, g] = U.canvas(256, 256), r = U.rng(3);
    g.fillStyle = '#b9b9b9'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14000; i++) { const v = (130 + r() * 110) | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.5)'; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
    return (TX.noise = keep(U.tex(c, { repeat: true })));
  }
  function tKerb() {
    if (TX.kerb) return TX.kerb;
    const [c, g] = U.canvas(32, 128);
    g.fillStyle = '#d3201f'; g.fillRect(0, 0, 32, 64); g.fillStyle = '#f1f1ee'; g.fillRect(0, 64, 32, 64);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 60, 32, 8); g.fillRect(0, 0, 32, 4);
    return (TX.kerb = keep(U.tex(c, { repeat: true })));
  }
  function tBanner() {
    if (TX.banner) return TX.banner;
    const [c, g] = U.canvas(2048, 128);
    const ads = [['APEX GP', '#e21a12', '#fff'], ['VOLTARA', '#0b1f4d', '#3df0ff'], ['NORDWIND', '#f1f3f5', '#0a5cff'], ['KOMPASS', '#ffb300', '#15161a'], ['LUMEN', '#15161a', '#ffe14d'], ['ZENIT', '#0f7a4a', '#fff'], ['AURORA', '#6a1bd1', '#fff'], ['HELIX', '#fff', '#e21a12']];
    for (let i = 0; i < 8; i++) {
      const x = i * 256, a = ads[i];
      g.fillStyle = a[1]; g.fillRect(x, 0, 256, 128);
      g.fillStyle = a[2]; g.font = '900 62px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a[0], x + 128, 62, 232);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 3, 128); g.fillRect(x, 116, 256, 12);
    }
    return (TX.banner = keep(U.tex(c, { repeat: true })));
  }
  function tCrowd() {
    if (TX.crowd) return TX.crowd;
    const [c, g] = U.canvas(512, 256), r = U.rng(11);
    const cols = ['#e33', '#fff', '#fc3', '#39f', '#2b2', '#f80', '#ddd', '#c3c', '#222', '#f55', '#6cf', '#e21a12'];
    g.fillStyle = '#3b4049'; g.fillRect(0, 0, 512, 256);
    for (let row = 0; row < 16; row++) {
      const y = row * 16;
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y + 13, 512, 3);
      for (let x = 0; x < 512; x += 7) {
        if (r() < 0.1) continue;
        g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x + r() * 2, y + 4 + r() * 2, 5, 8);
        g.fillStyle = r() < 0.5 ? '#e8c9a8' : '#b98a62'; g.fillRect(x + 1 + r(), y + 1, 3, 3);
      }
    }
    return (TX.crowd = keep(U.tex(c, { repeat: true })));
  }
  function tFacade() {
    if (TX.fac) return TX.fac;
    const [c, g] = U.canvas(256, 256), [c2, g2] = U.canvas(256, 256), r = U.rng(21);
    g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, 256, 256); g2.fillStyle = '#000'; g2.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const lit = r() < 0.42, px = x * 32 + 7, py = y * 32 + 7;
      g.fillStyle = lit ? '#ffe7b0' : (r() < 0.5 ? '#22303f' : '#2c3d52'); g.fillRect(px, py, 18, 20);
      if (lit) { g2.fillStyle = r() < 0.8 ? '#ffd58a' : '#bfe3ff'; g2.fillRect(px, py, 18, 20); }
    }
    TX.fac = keep(U.tex(c, { repeat: true })); TX.facE = keep(U.tex(c2, { repeat: true }));
    return TX.fac;
  }
  function tGarage() {
    if (TX.gar) return TX.gar;
    const [c, g] = U.canvas(640, 128);
    g.fillStyle = '#d9dde2'; g.fillRect(0, 0, 640, 128);
    F1.TEAMS.forEach((t, i) => {
      const x = i * 64;
      g.fillStyle = '#15171b'; g.fillRect(x + 5, 40, 54, 88);
      g.fillStyle = F1.hex(t.c1); g.fillRect(x + 5, 26, 54, 14);
      g.fillStyle = F1.hex(t.c2); g.fillRect(x + 5, 37, 54, 3);
      g.fillStyle = '#2a2f37'; g.fillRect(x + 12, 60, 40, 60);
    });
    g.fillStyle = '#2b5b86'; g.fillRect(0, 0, 640, 18);
    return (TX.gar = keep(U.tex(c, { repeat: true })));
  }
  function tChecker() {
    if (TX.chk) return TX.chk;
    const [c, g] = U.canvas(128, 16);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x * 8, y * 8, 8, 8); }
    const t = keep(U.tex(c)); t.magFilter = THREE.NearestFilter;
    return (TX.chk = t);
  }
  function tFence() {
    if (TX.fence) return TX.fence;
    const [c, g] = U.canvas(64, 64);
    g.strokeStyle = 'rgba(150,158,168,.95)'; g.lineWidth = 1.5;
    for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); }
    g.fillStyle = 'rgba(120,128,138,1)'; g.fillRect(0, 0, 64, 2);
    return (TX.fence = keep(U.tex(c, { repeat: true })));
  }
  function tCloud() {
    if (TX.cloud) return TX.cloud;
    const [c, g] = U.canvas(256, 128), r = U.rng(5);
    for (let i = 0; i < 26; i++) {
      const x = 40 + r() * 176, y = 46 + r() * 44, rad = 18 + r() * 34, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return (TX.cloud = keep(U.tex(c)));
  }
  function tGlow() {
    if (TX.glow) return TX.glow;
    const [c, g] = U.canvas(64, 64), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (TX.glow = keep(U.tex(c)));
  }
  F1.glowTex = tGlow;
  function tBoard(txt) {
    const k = 'b' + txt; if (TX[k]) return TX[k];
    const [c, g] = U.canvas(128, 96);
    g.fillStyle = '#f5f5f2'; g.fillRect(0, 0, 128, 96); g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 90);
    g.fillStyle = '#111'; g.font = '900 62px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 52, 112);
    return (TX[k] = keep(U.tex(c)));
  }

  // ---------- Farben / Stimmung ----------
  function mixHex(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex(); }
  function palette(env, theme) {
    const t = env.time, w = env.weather, wet = w === 'rain' || w === 'storm', grey = wet || w === 'cloudy' || w === 'mixed';
    let p;
    if (t === 'night') p = { top: 0x04060d, hor: theme === 'city' ? 0x1d1a2c : 0x0e1524, bot: 0x07080c, sun: 0xdfe9ff, sunI: 1.55, hemiS: 0x42527c, hemiG: 0x17171d, hemiI: 0.62, fogN: 150, fogF: 2400, el: 64, az: 0.7, disc: 0xcfd8ff, discAmt: 0.55, discEl: 26, dim: 0.14, cloud: 0x1a2030, em: 1 };
    else if (t === 'dusk') p = { top: 0x27407d, hor: 0xff9d5c, bot: 0x40302a, sun: 0xffa262, sunI: 2.5, hemiS: 0x9388c8, hemiG: 0x4a3624, hemiI: 0.62, fogN: 250, fogF: 3600, el: 9, az: 2.2, disc: 0xffb070, discAmt: 1, dim: 0.72, cloud: 0xffb48a, em: 0.55 };
    else p = { top: 0x2468d8, hor: 0xbcdaf4, bot: 0x8b9ca8, sun: 0xfff0dc, sunI: 2.8, hemiS: 0xbdd6ff, hemiG: 0x5c5a48, hemiI: 0.72, fogN: 350, fogF: 4600, el: 50, az: 0.9, disc: 0xfff4e0, discAmt: 1, dim: 1, cloud: 0xffffff, em: 0 };
    if (theme === 'desert' && t === 'day') p.hor = 0xecd9b8;
    if (grey) {
      const g = wet ? 0.86 : 0.62, night = t === 'night';
      p.top = mixHex(p.top, night ? 0x0a0c10 : 0x68717b, g); p.hor = mixHex(p.hor, night ? 0x12151b : 0xa7afb8, g);
      if (!night) { p.sunI *= wet ? 0.22 : 0.5; p.hemiI *= 1.22; } else p.sunI *= 0.85;
      p.fogF *= wet ? 0.32 : 0.7; p.fogN *= 0.5; p.discAmt *= wet ? 0 : 0.3;
      p.cloud = mixHex(p.cloud, night ? 0x10131a : 0x7b838d, 0.8); p.dim *= wet ? 0.6 : 0.8;
    }
    p.grey = grey; p.wet = wet;
    return p;
  }

  // ---------- Geometrie-Helfer ----------
  function ribbon(tr, i0, cnt, m, fn, wantCol) {
    const rows = cnt + 1, pos = new Float32Array(rows * m * 3), uv = new Float32Array(rows * m * 2), col = wantCol ? new Float32Array(rows * m * 3) : null;
    const idx = [], o = [0, 0, 0, 0, 1, 1, 1];
    for (let r = 0; r < rows; r++) {
      const i = (i0 + r) % tr.n;
      for (let k = 0; k < m; k++) {
        fn(i, i0 + r, k, o);
        const q = r * m + k;
        pos[q * 3] = tr.px[i] + tr.nx[i] * o[0]; pos[q * 3 + 1] = tr.py[i] + o[1]; pos[q * 3 + 2] = tr.pz[i] + tr.nz[i] * o[0];
        uv[q * 2] = o[2]; uv[q * 2 + 1] = o[3];
        if (col) { col[q * 3] = o[4]; col[q * 3 + 1] = o[5]; col[q * 3 + 2] = o[6]; }
      }
    }
    for (let r = 0; r < cnt; r++) for (let k = 0; k < m - 1; k++) { const a = r * m + k, b = a + 1, c = a + m, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function quad(a, b, c, d, u, v) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
    g.computeVertexNormals();
    return g;
  }
  function runs(flags, n) {
    const out = []; let st = 0;
    while (st < n && flags[st]) st++;
    if (st === n) return [[0, n]];
    let a = -1;
    for (let q = 1; q <= n; q++) {
      const i = (st + q) % n;
      if (flags[i] && a < 0) a = st + q;
      if (!flags[i] && a >= 0) { out.push([a % n, st + q - a]); a = -1; }
    }
    return out;
  }

  // ---------- Welt ----------
  function create(tr, env, renderer, q) {
    const theme = tr.theme, n = tr.n, ds = tr.ds, hw = tr.hw, L = tr.L, b = tr.bbox, pal = palette(env, theme);
    const rnd = U.rng(1234 + n);
    const root = new THREE.Group();
    const w = { group: root, track: tr, env, pal, tvCams: [], anim: [], gates: [] };
    const night = env.time === 'night';
    const put = (g, s, side, dist, yOff, yawExtra) => {
      tr.pos(s, side * dist, P);
      return U.xf(g, P.x, P.y + (yOff || 0), P.z, 0, tr.headingAt(s) + (side < 0 ? Math.PI : 0) + (yawExtra || 0), 0);
    };
    const wallAt = (s, side) => tr.at(side > 0 ? tr.wl : tr.wr, s);

    // ----- Himmel -----
    const elR = (pal.el * Math.PI) / 180, lightDir = new THREE.Vector3(Math.cos(elR) * Math.sin(pal.az), Math.sin(elR), Math.cos(elR) * Math.cos(pal.az));
    const dEl = ((pal.discEl || pal.el) * Math.PI) / 180, discDir = new THREE.Vector3(Math.cos(dEl) * Math.sin(pal.az + (night ? 2 : 0)), Math.sin(dEl), Math.cos(dEl) * Math.cos(pal.az + (night ? 2 : 0)));
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: U.col(pal.top) }, hor: { value: U.col(pal.hor) }, bot: { value: U.col(pal.bot) }, sunDir: { value: discDir }, sunCol: { value: U.col(pal.disc) }, sunAmt: { value: pal.discAmt }, flash: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; uniform float flash; varying vec3 vDir;\n' +
        'void main(){ vec3 d = normalize(vDir); float h = d.y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.5)) : mix(hor, bot, pow(min(1.0, -h * 5.0), 0.7));\n' +
        'float sd = max(dot(d, sunDir), 0.0); c += sunCol * (pow(sd, 1100.0) * 8.0 + pow(sd, 70.0) * 0.4 + pow(sd, 7.0) * 0.14) * sunAmt; c += vec3(0.75, 0.8, 1.0) * flash;\n' +
        'gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}',
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), skyMat);
    sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky);
    w.sky = sky; w.skyMat = skyMat;
    if (night && !pal.wet) {
      const sp = new Float32Array(900 * 3);
      for (let i = 0; i < 900; i++) { const a = rnd() * 6.283, e = Math.asin(0.04 + rnd() * 0.96); sp[i * 3] = Math.cos(e) * Math.sin(a) * 4200; sp[i * 3 + 1] = Math.sin(e) * 4200; sp[i * 3 + 2] = Math.cos(e) * Math.cos(a) * 4200; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: pal.grey ? 0.25 : 0.85, depthWrite: false }));
      stars.frustumCulled = false; stars.renderOrder = -9; sky.add(stars);
    }
    // Umgebungslicht für Lack & nasse Straße
    try {
      const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      es.add(new THREE.Mesh(sky.geometry, skyMat));
      w.envRT = pm.fromScene(es, 0, 1, 6000); pm.dispose();
    } catch (e) { w.envRT = null; }
    // Wolken
    const cloudN = pal.wet ? 0 : pal.grey ? 30 : 12;
    for (let i = 0; i < cloudN; i++) {
      const sm = new THREE.SpriteMaterial({ map: tCloud(), color: U.col(pal.cloud), fog: false, transparent: true, opacity: pal.grey ? 0.85 : 0.75, depthWrite: false });
      const s = new THREE.Sprite(sm), a = rnd() * 6.283, rr = 1500 + rnd() * 2300;
      s.position.set(b.cx + Math.sin(a) * rr, 520 + rnd() * 600, b.cz + Math.cos(a) * rr);
      const sc = 900 + rnd() * 900; s.scale.set(sc, sc * 0.42, 1); s.renderOrder = -8; root.add(s);
    }

    // ----- Licht -----
    const sun = new THREE.DirectionalLight(U.col(pal.sun), pal.sunI);
    sun.castShadow = !!q.shadows;
    if (q.shadows) {
      const R = env.time === 'dusk' ? 75 : 62, sc = sun.shadow.camera;
      sun.shadow.mapSize.set(q.shadowSize, q.shadowSize); sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 20; sc.far = 520;
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
    }
    const hemi = new THREE.HemisphereLight(U.col(pal.hemiS), U.col(pal.hemiG), pal.hemiI);
    root.add(sun, sun.target, hemi);
    w.sun = sun; w.hemi = hemi; w.lightDir = lightDir;
    w.fog = new THREE.Fog(U.col(pal.hor), pal.fogN, pal.fogF);

    // ----- Gelände -----
    const sub = []; for (let i = 0; i < n; i += 5) sub.push(i);
    const M = theme === 'city' ? 950 : 1250, step = q.terrainStep || 14;
    const x0 = b.minX - M, z0 = b.minZ - M, nxv = Math.ceil((b.maxX - b.minX + 2 * M) / step) + 1, nzv = Math.ceil((b.maxZ - b.minZ + 2 * M) / step) + 1;
    const TH = new Float32Array(nxv * nzv), tpos = new Float32Array(nxv * nzv * 3), tcol = new Float32Array(nxv * nzv * 3), tuv = new Float32Array(nxv * nzv * 2);
    const waterX = b.maxX + 36;
    const cGrass = U.col(theme === 'alpine' ? 0x5a8a42 : 0x5c8f3e), cGrass2 = U.col(theme === 'alpine' ? 0x3f6a34 : 0x44742f), cRock = U.col(0x6d6a66), cSnow = U.col(0xf4f7fb), cSand = U.col(0xd9b77e), cSand2 = U.col(0xc39a5e), cCity = U.col(0x3a3d43), cCity2 = U.col(0x4a4e55);
    const tc = new THREE.Color();
    for (let iz = 0; iz < nzv; iz++) for (let ix = 0; ix < nxv; ix++) {
      const x = x0 + ix * step, z = z0 + iz * step, vi = iz * nxv + ix;
      let md = 1e18, mi = 0, sw = 0, sh = 0;
      for (let qq = 0; qq < sub.length; qq++) {
        const i = sub[qq], dx = x - tr.px[i], dz = z - tr.pz[i], d2 = dx * dx + dz * dz;
        if (d2 < md) { md = d2; mi = i; }
        if (!tr.flat) { const ww = 1 / ((d2 + 30) * (d2 + 30)); sw += ww; sh += ww * tr.py[i]; }
      }
      const base = tr.flat ? 0 : sh / sw, clr = Math.sqrt(md) - Math.max(tr.wl[mi], tr.wr[mi]) - 2;
      const bl = U.smooth(2, 150, clr), near = U.smooth(0, 9, clr);
      const dOut = Math.hypot(Math.max(0, b.minX - x, x - b.maxX), Math.max(0, b.minZ - z, z - b.maxZ));
      let y = base - 0.7 + near * 0.3, f;
      if (theme === 'park') {
        f = U.fbm(x / 240 + 5, z / 240 + 9, 4); y += bl * (f - 0.42) * 22 + U.smooth(100, 900, dOut) * 60 * U.fbm(x / 500, z / 500, 3);
        tc.copy(cGrass).lerp(cGrass2, U.clamp(U.fbm(x / 60, z / 60, 3) * 1.6 - 0.3, 0, 1));
      } else if (theme === 'alpine') {
        f = U.fbm(x / 300 + 2, z / 300 + 7, 5);
        const far = U.smooth(40, 800, dOut);
        y += bl * (f - 0.38) * 46 + far * (90 + 420 * U.fbm(x / 650 + 3, z / 650, 4));
        const hh = y - base;
        tc.copy(cGrass).lerp(cGrass2, U.clamp(U.fbm(x / 50, z / 50, 3) * 1.6 - 0.3, 0, 1));
        tc.lerp(cRock, U.smooth(55, 120, hh + f * 40)); tc.lerp(cSnow, U.smooth(190, 260, hh + f * 60));
      } else if (theme === 'desert') {
        f = U.fbm(x / 280 + 1, z / 280 + 4, 4);
        const dune = Math.abs(Math.sin(x / 85 + 3 * f) * Math.cos(z / 120 + 2 * f));
        y += bl * (dune * 11 + (f - 0.4) * 16) + U.smooth(150, 900, dOut) * 130 * Math.pow(U.fbm(x / 420, z / 420, 3), 2);
        tc.copy(cSand).lerp(cSand2, U.clamp(dune * 0.8 + U.fbm(x / 40, z / 40, 2) * 0.5 - 0.2, 0, 1));
      } else {
        y = x > waterX ? -9 : -0.7 + near * 0.3;
        tc.copy(cCity).lerp(cCity2, U.fbm(x / 35, z / 35, 2));
      }
      TH[vi] = y;
      tpos[vi * 3] = x; tpos[vi * 3 + 1] = y; tpos[vi * 3 + 2] = z;
      tcol[vi * 3] = tc.r; tcol[vi * 3 + 1] = tc.g; tcol[vi * 3 + 2] = tc.b;
      tuv[vi * 2] = x / 9; tuv[vi * 2 + 1] = z / 9;
    }
    const tidx = new Uint32Array((nxv - 1) * (nzv - 1) * 6);
    let ti = 0;
    for (let iz = 0; iz < nzv - 1; iz++) for (let ix = 0; ix < nxv - 1; ix++) {
      const a = iz * nxv + ix, c = a + nxv;
      tidx[ti++] = a; tidx[ti++] = c; tidx[ti++] = a + 1; tidx[ti++] = a + 1; tidx[ti++] = c; tidx[ti++] = c + 1;
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(tuv, 2));
    tg.setIndex(new THREE.BufferAttribute(tidx, 1)); tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, map: tNoise() }));
    terrain.receiveShadow = true; root.add(terrain);
    const terrH = (x, z) => {
      const fx = U.clamp((x - x0) / step, 0, nxv - 1.001), fz = U.clamp((z - z0) / step, 0, nzv - 1.001), ix = Math.floor(fx), iz = Math.floor(fz), ax = fx - ix, az = fz - iz, a = iz * nxv + ix;
      return (TH[a] * (1 - ax) + TH[a + 1] * ax) * (1 - az) + (TH[a + nxv] * (1 - ax) + TH[a + nxv + 1] * ax) * az;
    };
    w.terrH = terrH;

    // ----- Straße -----
    const e = hw, inner = e - 0.375, K = 8;
    const offs = [e, e - 0.1, e - 0.115, e - 0.36, inner];
    for (let k = 1; k < K; k++) offs.push(inner * (1 - (2 * k) / K));
    offs.push(-inner, -(e - 0.36), -(e - 0.115), -(e - 0.1), -e);
    const tun = tr.def.tunnel ? [Math.floor(tr.def.tunnel[0] * n), Math.floor(tr.def.tunnel[1] * n)] : null;
    const inTun = (i) => tun && i >= tun[0] && i <= tun[1];
    const roadG = ribbon(tr, 0, n, offs.length, (i, row, k, o) => {
      const off = offs[k]; o[0] = off; o[1] = 0; o[2] = off / 8; o[3] = (row * ds) / 8;
      let v;
      if (k === 2 || k === 3 || k === offs.length - 3 || k === offs.length - 4) v = 2.6;
      else { const dd = (off - tr.ro[i]) / 1.6; v = 0.36 * (1 - 0.24 * Math.exp(-dd * dd)) * (0.92 + 0.16 * U.noise2(row * 0.07, off * 0.35)); }
      if (inTun(i)) v *= 0.8;
      o[4] = o[5] = o[6] = v;
    }, true);
    const roadMat = new THREE.MeshStandardMaterial({ map: tAsphalt(), vertexColors: true, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 });
    const road = new THREE.Mesh(roadG, roadMat); road.receiveShadow = true; root.add(road);
    w.roadMat = roadMat;

    // Kerbs
    const kerbMat = new THREE.MeshLambertMaterial({ map: tKerb() }), kerbGeos = [];
    for (const side of [1, -1]) {
      for (const [a, cnt] of runs(side > 0 ? tr.kerbL : tr.kerbR, n)) {
        kerbGeos.push(ribbon(tr, a, cnt, 3, (i, row, k, o) => {
          const kk = side > 0 ? 2 - k : k;          // immer von links nach rechts
          o[0] = side * (hw + [0, 1.35, 1.5][kk]); o[1] = [0.012, 0.085, 0.0][kk]; o[2] = kk / 2; o[3] = (row * ds) / 4;
        }));
      }
    }
    if (kerbGeos.length) { const km = new THREE.Mesh(U.merge(kerbGeos), kerbMat); km.receiveShadow = true; root.add(km); }

    // Seitenstreifen (Gras / Kies / Beton)
    const cGrav = U.col(theme === 'desert' ? 0xb08a55 : 0xcfc0a0), cConc = U.col(0x565a61), cPaint = U.col(theme === 'desert' ? 0x2f7d6a : 0x3f8d38);
    const vergeG = [];
    for (const side of [1, -1]) {
      const wa = side > 0 ? tr.wl : tr.wr, gr = side > 0 ? tr.gravL : tr.gravR;
      vergeG.push(ribbon(tr, 0, n, 3, (i, row, k, o) => {
        const kk = side > 0 ? k : 2 - k;             // kk: 0 = Mauer, 1 = Mitte, 2 = Straßenrand
        const mid = Math.min(hw + 2.6, (hw + wa[i]) / 2), off = kk === 0 ? wa[i] : kk === 1 ? mid : hw;
        o[0] = side * off; o[1] = kk === 2 ? -0.015 : -0.03;
        tr.pos(row * ds, side * off, P); o[2] = P.x / 5; o[3] = P.z / 5;
        if (theme === 'city') tc.copy(cConc);
        else if (gr[i] && kk < 2) tc.copy(cGrav);
        else if (theme === 'desert') tc.copy(kk === 2 ? cPaint : cSand);
        else tc.copy(cGrass).lerp(cGrass2, U.noise2(row * 0.11, kk * 3 + side));
        o[4] = tc.r; o[5] = tc.g; o[6] = tc.b;
      }, true));
    }
    const verge = new THREE.Mesh(U.merge(vergeG, true), new THREE.MeshLambertMaterial({ vertexColors: true, map: tNoise() }));
    verge.receiveShadow = true; root.add(verge);

    // Mauern mit Bandenwerbung
    const wallG = [], fenceG = [];
    for (const side of [1, -1]) {
      const wa = side > 0 ? tr.wl : tr.wr;
      wallG.push(ribbon(tr, 0, n, 2, (i, row, k, o) => { o[0] = side * wa[i]; o[1] = k === 0 ? 1.05 : -0.9; o[2] = (side * row * ds) / 48; o[3] = k === 0 ? 1 : -0.77; }));
      if (theme === 'city') fenceG.push(ribbon(tr, 0, n, 2, (i, row, k, o) => { o[0] = side * (wa[i] + 0.05); o[1] = k === 0 && !inTun(i) ? 3.2 : 1.05; o[2] = (row * ds) / 1.6; o[3] = k === 0 ? 1.4 : 0; }));
    }
    const wallMat = new THREE.MeshLambertMaterial({ map: tBanner(), side: THREE.DoubleSide });
    const walls = new THREE.Mesh(U.merge(wallG), wallMat); walls.castShadow = true; walls.receiveShadow = true; root.add(walls);
    if (fenceG.length) root.add(new THREE.Mesh(U.merge(fenceG), new THREE.MeshBasicMaterial({ map: tFence(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: new THREE.Color(pal.dim * 0.5 + 0.12, pal.dim * 0.5 + 0.12, pal.dim * 0.5 + 0.14) })));

    // Markierungen: Ziellinie + Startplätze
    const marks = [];
    marks.push(put(U.xf(new THREE.PlaneGeometry(2 * hw - 0.8, 1.6), 0, 0, 0, -Math.PI / 2, 0, 0), 0, 1, 0, 0.02));
    const chk = new THREE.Mesh(marks[0], new THREE.MeshLambertMaterial({ map: tChecker(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    chk.receiveShadow = true; root.add(chk);
    const slots = [];
    for (let k2 = 0; k2 < 20; k2++) {
      const s = -(9 + 8 * k2), lat = k2 % 2 ? -2.7 : 2.7;
      slots.push(put(U.xf(new THREE.PlaneGeometry(2.5, 0.16), 0, 0, 2.9, -Math.PI / 2, 0, 0), s, U.sign(lat), Math.abs(lat), 0.02));
      for (const sx of [-1.17, 1.17]) slots.push(put(U.xf(new THREE.PlaneGeometry(0.16, 1.3), sx, 0, 2.25, -Math.PI / 2, 0, 0), s, U.sign(lat), Math.abs(lat), 0.02));
    }
    const slotMesh = new THREE.Mesh(U.merge(slots), new THREE.MeshLambertMaterial({ color: 0xe8e8e8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    slotMesh.receiveShadow = true; root.add(slotMesh);

    // ----- Bauten -----
    const props = [], crowd = [], lamps = [], bannerQ = [];
    const outside = -tr.turnSign, inside = tr.turnSign;
    function stand(s, side, len, D, H) {
      const dist = wallAt(s, side) + 5;
      tr.pos(s, side * (dist + D + 3), P);
      if (tr.clearance(P.x, P.z) < 3) return;
      const add = (g, hex) => props.push(U.tint(put(g, s, side, dist), hex));
      add(U.box(D, 1.2, len, D / 2, 0.6, 0), 0x8d949c);
      add(U.box(0.5, H + 0.6, len, D + 0.25, (H + 0.6) / 2, 0), 0x6a727b);
      for (const zz of [-len / 2, len / 2]) add(quad([0, 0, zz], [D, 0, zz], [D, H, zz], [0, 1.2, zz], 1, 1), 0x7b838c);
      add(U.box(D + 3.5, 0.3, len + 1.5, D / 2 - 1, H + 3.4, 0, 0, 0, 0.1), 0xe3e7ec);
      for (const zz of [-len / 2 + 1, len / 2 - 1]) add(U.beam(D + 0.3, 0, zz, D + 0.3, H + 3.8, zz, 0.4), 0x59616a);
      crowd.push(put(quad([0.02, 1.2, -len / 2], [0.02, 1.2, len / 2], [D, H, len / 2], [D, H, -len / 2], len / 15, 1), s, side, dist));
    }
    for (let s = -168; s <= 96; s += 44) stand(s, outside, 42, 13, 9);
    const big = tr.corners.slice().sort((a, c) => c.dv - a.dv).slice(0, 4);
    for (const c of big) { stand(c.s - 34, -c.dir, 30, 10, 7); stand(c.s + 2, -c.dir, 30, 10, 7); }

    // Boxengebäude
    {
      const s = -70, dist = wallAt(s, inside) + 4, len = 150;
      tr.pos(s, inside * (dist + 18), P);
      if (tr.clearance(P.x, P.z) > 2) {
        props.push(U.tint(put(U.box(14, 9, len, 7, 4.5, 0), s, inside, dist), 0xd5d9de));
        props.push(U.tint(put(U.box(15, 0.5, len + 2, 6.5, 9.2, 0), s, inside, dist), 0x2b5b86));
        const gq = put(quad([-0.04, 0, len / 2], [-0.04, 0, -len / 2], [-0.04, 5, -len / 2], [-0.04, 5, len / 2], 2, 1), s, inside, dist);
        root.add(new THREE.Mesh(gq, new THREE.MeshLambertMaterial({ map: tGarage(), side: THREE.DoubleSide })));
        const win = put(quad([-0.05, 5.6, len / 2], [-0.05, 5.6, -len / 2], [-0.05, 8.2, -len / 2], [-0.05, 8.2, len / 2], 1, 1), s, inside, dist);
        root.add(new THREE.Mesh(win, new THREE.MeshLambertMaterial({ color: U.col(0x1d2c3d), emissive: U.col(0xffd9a0), emissiveIntensity: pal.em * 0.9, side: THREE.DoubleSide })));
      }
    }

    // Startampel
    const gantryS = 16;
    {
      const wL = wallAt(gantryS, 1) + 0.6, wR = wallAt(gantryS, -1) + 0.6, span = wL + wR, mid = (wL - wR) / 2;
      const add = (g, hex) => props.push(U.tint(put(g, gantryS, 1, 0), hex));
      add(U.box(0.5, 7.4, 0.5, wL, 3.7, 0), 0x3a4048); add(U.box(0.5, 7.4, 0.5, -wR, 3.7, 0), 0x3a4048);
      add(U.box(span, 0.9, 0.5, mid, 7.1, 0), 0x2a2f36);
      bannerQ.push(put(quad([mid + span / 2, 6.7, -0.27], [mid - span / 2, 6.7, -0.27], [mid - span / 2, 7.5, -0.27], [mid + span / 2, 7.5, -0.27], span / 6 / 8, 1), gantryS, 1, 0));
      w.startMats = []; w.startGlow = [];
      for (let j = 0; j < 5; j++) {
        const x = (j - 2) * 1.15;
        add(U.box(0.8, 1.25, 0.3, x, 5.85, 0), 0x0c0d10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x2a0505 }), lg = [];
        for (const yy of [5.55, 6.15]) lg.push(put(U.xf(new THREE.CircleGeometry(0.22, 14), x, yy, -0.16, 0, Math.PI, 0), gantryS, 1, 0));
        root.add(new THREE.Mesh(U.merge(lg), mat)); w.startMats.push(mat);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tGlow(), color: 0xff2a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
        tr.pos(gantryS - 0.5, x, P); sp.position.set(P.x, P.y + 5.85, P.z); sp.scale.set(3.4, 3.4, 1); sp.visible = false; root.add(sp); w.startGlow.push(sp);
      }
    }
    w.setStartLights = function (k) {
      for (let j = 0; j < 5; j++) { w.startMats[j].color.setHex(j < k ? 0xff1a10 : 0x2a0505); w.startGlow[j].visible = j < k; }
    };

    // Werbebrücken
    for (const fr of [0.3, 0.52, 0.76]) {
      let bi = Math.floor(fr * n), found = -1;
      for (let d = 0; d < 60 && found < 0; d++) for (const sg of [1, -1]) { const i = (bi + sg * d + n) % n; if (Math.abs(tr.kc[i]) < 0.0012 && !inTun(i)) { found = i; break; } }
      if (found < 0) continue;
      const s = found * ds, wL = wallAt(s, 1) + 0.7, wR = wallAt(s, -1) + 0.7, span = wL + wR, mid = (wL - wR) / 2;
      const add = (g, hex) => props.push(U.tint(put(g, s, 1, 0), hex));
      add(U.box(0.6, 8, 0.6, wL, 4, 0), 0x3a4048); add(U.box(0.6, 8, 0.6, -wR, 4, 0), 0x3a4048); add(U.box(span, 1.9, 0.7, mid, 7.6, 0), 0x20242a);
      for (const zz of [-0.37, 0.37]) bannerQ.push(put(quad([mid + span / 2, 6.75, zz], [mid - span / 2, 6.75, zz], [mid - span / 2, 8.45, zz], [mid + span / 2, 8.45, zz], span / 8 / 8, 1), s, 1, 0));
    }
    if (bannerQ.length) root.add(new THREE.Mesh(U.merge(bannerQ), new THREE.MeshLambertMaterial({ map: tBanner(), side: THREE.DoubleSide })));

    // Bremspunkt-Tafeln
    const boards = { 150: [], 100: [], 50: [] };
    for (const c of tr.corners) {
      if (c.dv < 16) continue;
      for (const dist of [150, 100, 50]) {
        const s = c.s - 22 - dist, i = Math.floor(U.mod(s, L) / ds) % n;
        if (inTun(i)) continue;
        const side = -c.dir, off = Math.min(hw + 2.2, (side > 0 ? tr.wl[i] : tr.wr[i]) - 0.4);
        boards[dist].push(put(U.xf(new THREE.PlaneGeometry(1.25, 0.9), 0, 1.35, 0, 0, Math.PI, 0), s, 1, side * off));
        props.push(U.tint(put(U.box(0.08, 0.95, 0.08, 0, 0.45, 0.02), s, 1, side * off), 0x30343a));
      }
    }
    for (const d of [150, 100, 50]) if (boards[d].length) root.add(new THREE.Mesh(U.merge(boards[d]), new THREE.MeshLambertMaterial({ map: tBoard(String(d)), side: THREE.DoubleSide })));

    // Flutlicht (nachts & in der Stadt)
    if (night || theme === 'city') {
      for (let s = 20, j = 0; s < L; s += 85, j++) {
        const side = j % 2 ? 1 : -1, i = Math.floor(s / ds) % n;
        if (inTun(i)) continue;
        const dist = wallAt(s, side) + 2.2;
        tr.pos(s, side * (dist + 2), P);
        if (tr.clearance(P.x, P.z) < 0.5) continue;
        props.push(U.tint(put(U.box(0.35, 17, 0.35, 0, 8.5, 0), s, side, dist), 0x4a5058));
        props.push(U.tint(put(U.box(1.2, 0.8, 2.6, -0.7, 17, 0), s, side, dist), 0x23262b));
        tr.pos(s, side * (dist - 1.2), P); lamps.push(P.x, P.y + 16.6, P.z);
      }
    }

    // Tunnel (Stadtkurs)
    if (tun) {
      const cnt = tun[1] - tun[0];
      const tg2 = [];
      tg2.push(ribbon(tr, tun[0], cnt, 2, (i, row, k, o) => { o[0] = k === 0 ? tr.wl[i] + 0.4 : -tr.wr[i] - 0.4; o[1] = 5.4; o[2] = k; o[3] = row / 4; }));
      for (const side of [1, -1]) tg2.push(ribbon(tr, tun[0], cnt, 2, (i, row, k, o) => { o[0] = side * ((side > 0 ? tr.wl[i] : tr.wr[i]) + 0.12); o[1] = k === 0 ? 5.4 : 1.0; o[2] = k; o[3] = row / 4; }));
      const tm = new THREE.Mesh(U.merge(tg2), new THREE.MeshLambertMaterial({ color: U.col(0x7d828a), side: THREE.DoubleSide }));
      tm.castShadow = true; root.add(tm);
      const strips = [];
      for (let i = tun[0] + 2; i < tun[1] - 1; i += 3) strips.push(put(U.box(0.5, 0.08, 3.2, 0, 5.33, 0), i * ds, 1, 0));
      root.add(new THREE.Mesh(U.merge(strips), new THREE.MeshBasicMaterial({ color: 0xffe9c0 })));
      for (const ii of [tun[0], tun[1]]) {
        const s = ii * ds, wL = tr.wl[ii] + 1.6, wR = tr.wr[ii] + 1.6;
        props.push(U.tint(put(U.box(wL + wR, 2.6, 2.2, (wL - wR) / 2, 6.6, 0), s, 1, 0), 0x6b7078));
        props.push(U.tint(put(U.box(1.4, 6, 2.2, wL - 0.5, 3, 0), s, 1, 0), 0x6b7078)); props.push(U.tint(put(U.box(1.4, 6, 2.2, -wR + 0.5, 3, 0), s, 1, 0), 0x6b7078));
      }
      for (const f of [0.18, 0.5, 0.82]) {
        const pl = new THREE.PointLight(U.col(0xffe2b0), 1.6, 95, 1.6);
        tr.pos((tun[0] + cnt * f) * ds, 0, P); pl.position.set(P.x, P.y + 4.6, P.z); root.add(pl);
      }
      w.tunnel = tun;
    }

    // ----- Kulisse je Thema -----
    const dim = new THREE.Color(pal.dim, pal.dim, pal.dim);
    const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    function instanced(geo, list, cast) {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, treeMat, list.length), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), eu = new THREE.Euler();
      list.forEach((t, i) => {
        eu.set(t.rx || 0, t.ry, 0); qt.setFromEuler(eu); ps.set(t.x, t.y, t.z); sc.set(t.s, t.sy || t.s, t.s);
        im.setMatrixAt(i, m4.compose(ps, qt, sc)); im.setColorAt(i, tc.setScalar(0.72 + t.c * 0.5));
      });
      im.castShadow = !!cast; im.frustumCulled = false; root.add(im);
    }
    const conifer = () => U.merge([U.tint(new THREE.CylinderGeometry(0.22, 0.32, 2, 6).translate(0, 1, 0), 0x4a3524), U.tint(new THREE.ConeGeometry(2.3, 4.2, 7).translate(0, 3.6, 0), 0x1f4a26), U.tint(new THREE.ConeGeometry(1.8, 3.6, 7).translate(0, 5.8, 0), 0x245428), U.tint(new THREE.ConeGeometry(1.2, 3, 7).translate(0, 7.8, 0), 0x2b5f2d)], true);
    const leafy = () => U.merge([U.tint(new THREE.CylinderGeometry(0.25, 0.38, 3, 6).translate(0, 1.5, 0), 0x4c3826), U.tint(new THREE.IcosahedronGeometry(2.6, 1).translate(0, 5, 0), 0x2f6b2a), U.tint(new THREE.IcosahedronGeometry(1.9, 1).translate(1.4, 4.2, 0.6), 0x3a7a30), U.tint(new THREE.IcosahedronGeometry(1.7, 1).translate(-1.2, 4.4, -0.8), 0x2a6226)], true);
    const palm = () => {
      const pp = [U.tint(U.beam(0, 0, 0, 0.7, 7.5, 0.2, 0.34), 0x7a5c3a)];
      for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; pp.push(U.tint(U.beam(0.7, 7.5, 0.2, 0.7 + Math.cos(a) * 3, 6.6 - (k % 2) * 0.8, 0.2 + Math.sin(a) * 3, 0.75, 0.07), k % 2 ? 0x2f7a35 : 0x3b8a3c)); }
      return U.merge(pp, true);
    };
    const treesA = [], treesB = [], rocks = [];
    const nTrees = Math.round((theme === 'park' ? 2800 : theme === 'alpine' ? 3000 : theme === 'desert' ? 240 : 0) * q.trees);
    for (let i = 0, tries = 0; i < nTrees && tries < nTrees * 30; tries++) {
      const far = theme === 'desert' ? 150 : 480;
      const x = b.minX - far + rnd() * (b.maxX - b.minX + 2 * far), z = b.minZ - far + rnd() * (b.maxZ - b.minZ + 2 * far), clr = tr.clearance(x, z);
      if (clr < 4) continue;
      if (theme === 'desert') { if (clr > 60 || U.fbm(x / 130 + 9, z / 130, 2) < 0.52) continue; }
      else if (U.fbm(x / 170 + 3, z / 170 + 1, 3) < 0.43 && rnd() > 0.07) continue;
      const y = terrH(x, z);
      if (theme === 'alpine' && y - tr.heightIDW(x, z) > 95) continue;
      const t = { x, y: y - 0.2, z, ry: rnd() * 6.283, s: 0.75 + rnd() * 0.8, c: rnd() };
      if (theme === 'park' && rnd() < 0.62) treesB.push(t); else treesA.push(t);
      i++;
    }
    if (theme === 'city') {
      for (let z = b.minZ - 40; z < b.maxZ + 60; z += 21) treesA.push({ x: waterX - 7 + rnd() * 2, y: -0.4, z: z + rnd() * 4, ry: rnd() * 6.283, s: 0.9 + rnd() * 0.3, c: rnd() });
    }
    if (theme === 'alpine' || theme === 'desert') {
      for (let i = 0, tries = 0; i < 260 * q.trees && tries < 6000; tries++) {
        const x = b.minX - 300 + rnd() * (b.maxX - b.minX + 600), z = b.minZ - 300 + rnd() * (b.maxZ - b.minZ + 600);
        if (tr.clearance(x, z) < 5) continue;
        rocks.push({ x, y: terrH(x, z) - 0.3, z, ry: rnd() * 6.283, rx: rnd() * 3, s: 0.8 + rnd() * 2.6, sy: 0.5 + rnd() * 1.6, c: rnd() * 0.5 });
        i++;
      }
    }
    instanced(theme === 'desert' || theme === 'city' ? palm() : conifer(), treesA, q.shadows && q.trees > 0.5);
    instanced(leafy(), treesB, q.shadows && q.trees > 0.5);
    if (rocks.length) instanced(U.merge([U.tint(new THREE.DodecahedronGeometry(1, 0), theme === 'desert' ? 0xa5754a : 0x77736e)], true), rocks, false);

    // Berge am Horizont
    if (theme !== 'city') {
      const N = 180, rows = [[2150, 0], [2500, 1], [2850, 0.55], [3300, 0]], hBase = theme === 'alpine' ? 900 : theme === 'desert' ? 260 : 300;
      const mp = [], mc = [], mi2 = [];
      const cLow = U.col(theme === 'alpine' ? 0x49604f : theme === 'desert' ? 0xb98556 : 0x40664a), cHigh = U.col(theme === 'alpine' ? 0x8a8d94 : theme === 'desert' ? 0xd9a26a : 0x587c5c);
      for (let a = 0; a <= N; a++) {
        const ang = (a / N) * 6.283, f = U.fbm(Math.cos(ang) * 3 + 7, Math.sin(ang) * 3 + 2, 4), f2 = U.fbm(Math.cos(ang) * 9 + 1, Math.sin(ang) * 9 + 5, 3);
        const h = hBase * (0.25 + 1.5 * f * f + 0.35 * f2);
        for (const [rr, hf] of rows) {
          const jit = 1 + (f2 - 0.5) * 0.12, y = hf * h - 30;
          mp.push(b.cx + Math.sin(ang) * rr * jit, y, b.cz + Math.cos(ang) * rr * jit);
          tc.copy(cLow).lerp(cHigh, U.clamp(y / hBase, 0, 1));
          if (theme === 'alpine') tc.lerp(cSnow, U.smooth(420, 640, y + f2 * 160));
          tc.multiply(dim); mc.push(tc.r, tc.g, tc.b);
        }
      }
      const R = rows.length;
      for (let a = 0; a < N; a++) for (let k = 0; k < R - 1; k++) { const p0 = a * R + k, p1 = p0 + R; mi2.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1); }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(mc, 3)); mg.setIndex(mi2);
      root.add(new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    }

    // Stadt: Häuser, Wasser, Riesenrad, Boote
    if (theme === 'city') {
      tFacade();
      const bg = [];
      const addB = (x, z, bw, bd, bh, hue) => {
        const g = new THREE.BoxGeometry(bw, bh, bd), uv = g.attributes.uv;
        for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
          const ii = f * 4 + v;
          if (f === 2 || f === 3) uv.setXY(ii, 0.004, 0.004);
          else uv.setXY(ii, uv.getX(ii) * Math.round((f < 2 ? bd : bw) / 3) / 8, uv.getY(ii) * Math.round(bh / 3.2) / 8);
        }
        g.translate(x, bh / 2 - 1, z);
        g.userData.col = new THREE.Color().setHSL(hue, 0.12, 0.34 + rnd() * 0.3).convertSRGBToLinear();
        bg.push(g);
      };
      for (let x = b.minX - 520; x < waterX - 30; x += 50) for (let z = b.minZ - 520; z < b.maxZ + 520; z += 50) {
        const bx = x + rnd() * 10, bz = z + rnd() * 10, bw = 24 + rnd() * 16, bd = 24 + rnd() * 16;
        let ok = true;
        for (const [ox, oz] of [[0, 0], [bw / 2, bd / 2], [-bw / 2, bd / 2], [bw / 2, -bd / 2], [-bw / 2, -bd / 2]]) if (tr.clearance(bx + ox, bz + oz) < 5) { ok = false; break; }
        if (!ok || rnd() < 0.1) continue;
        const dC = Math.hypot(bx - b.cx, bz - b.cz), tall = rnd() < 0.08 ? 80 + rnd() * 110 : 0;
        addB(bx, bz, bw, bd, tall || 12 + rnd() * rnd() * 46 + (dC > 500 ? 20 * rnd() : 0), 0.55 + rnd() * 0.15);
      }
      const bm = new THREE.Mesh(U.merge(bg, true), new THREE.MeshLambertMaterial({ map: TX.fac, vertexColors: true, emissiveMap: TX.facE, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: pal.em * 1.25 }));
      bm.castShadow = false; root.add(bm);
      // Wasser
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(5200, 6400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: U.col(night ? 0x061425 : 0x1a4f78), roughness: 0.14, metalness: 0.55, envMapIntensity: 1.5 }));
      wm.position.set(waterX - 4 + 2600, -1.7, b.cz); root.add(wm);
      props.push(U.tint(U.box(3, 3, b.maxZ - b.minZ + 1100, waterX - 3, -1.2, b.cz), 0x70757c));
      // Boote
      for (let i = 0; i < 12; i++) {
        const x = waterX + 40 + rnd() * 320, z = b.minZ - 100 + rnd() * (b.maxZ - b.minZ + 200), ry = rnd() * 6.283, sc = 0.8 + rnd() * 1.4;
        props.push(U.tint(U.xf(U.box(4, 1.6, 13, 0, 0, 0), x, -1.2, z, 0, ry, 0, sc, sc, sc), 0xf2f4f6));
        props.push(U.tint(U.xf(U.box(3, 1.3, 5.5, 0, 1.4, -0.8), x, -1.2, z, 0, ry, 0, sc, sc, sc), 0xdfe4ea));
        lamps.push(x, 1.6 * sc, z);
      }
      // Riesenrad auf dem Pier
      const fx = waterX + 70, fz = b.cz + 60, R = 40, cy = 46;
      props.push(U.tint(U.box(110, 2, 34, waterX + 52, -1.2, fz), 0x8a8f96));
      for (const zz of [-4, 4]) { props.push(U.tint(U.beam(fx - 16, -0.3, fz + zz, fx, cy, fz + zz, 1.1), 0xe9edf2)); props.push(U.tint(U.beam(fx + 16, -0.3, fz + zz, fx, cy, fz + zz, 1.1), 0xe9edf2)); }
      const wheel = new THREE.Group(); wheel.position.set(fx, cy, fz);
      const wp = [U.tint(new THREE.TorusGeometry(R, 0.55, 6, 48), 0xf2f4f7), U.tint(new THREE.TorusGeometry(R * 0.55, 0.3, 6, 36), 0xdfe4ea)];
      const rim = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 6.283, cx2 = Math.cos(a) * R, cy2 = Math.sin(a) * R;
        wp.push(U.tint(U.beam(0, 0, 0, cx2, cy2, 0, 0.28), 0xe9edf2));
        wp.push(U.tint(U.box(3.2, 3, 3.2, cx2, cy2, 0), [0xe21a12, 0xffc21a, 0x1e88ff, 0x2fbf5b][k % 4]));
      }
      for (let k = 0; k < 48; k++) { const a = (k / 48) * 6.283; rim.push(Math.cos(a) * R, Math.sin(a) * R, 0); }
      wheel.add(new THREE.Mesh(U.merge(wp, true), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
      const rl = new THREE.Points(rg, new THREE.PointsMaterial({ map: tGlow(), color: 0xffd27a, size: night ? 9 : 4, transparent: true, opacity: night ? 1 : pal.em, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      wheel.add(rl); root.add(wheel);
      w.anim.push((dt) => { wheel.rotation.z += dt * 0.07; });
    }

    // Heißluftballons
    if ((theme === 'park' || theme === 'alpine') && !night && !pal.grey) {
      for (let i = 0; i < 4; i++) {
        const cols = [[0xe21a12, 0xffffff], [0xffc21a, 0x1e88ff], [0x2fbf5b, 0xffffff], [0x9b3bd1, 0xffc21a]][i];
        const sp = new THREE.SphereGeometry(13, 14, 10); sp.scale(1, 1.18, 1);
        const ca = new Float32Array(sp.attributes.position.count * 3), c1 = U.col(cols[0]), c2 = U.col(cols[1]);
        for (let v = 0; v < sp.attributes.position.count; v++) { const a = Math.atan2(sp.attributes.position.getZ(v), sp.attributes.position.getX(v)), cc = Math.floor((a / 6.283 + 0.5) * 10) % 2 ? c1 : c2; ca[v * 3] = cc.r; ca[v * 3 + 1] = cc.g; ca[v * 3 + 2] = cc.b; }
        sp.setAttribute('color', new THREE.BufferAttribute(ca, 3));
        const bal = new THREE.Mesh(U.merge([sp, U.tint(U.box(3, 2.4, 3, 0, -20, 0), 0x6b4a2a), U.tint(new THREE.ConeGeometry(6, 9, 10).rotateX(Math.PI).translate(0, -14.5, 0), cols[0])], true), new THREE.MeshLambertMaterial({ vertexColors: true }));
        const a = rnd() * 6.283, rr = 300 + rnd() * 500, by = 140 + rnd() * 160;
        bal.position.set(b.cx + Math.sin(a) * rr, by, b.cz + Math.cos(a) * rr); root.add(bal);
        const ph = rnd() * 6;
        w.anim.push((dt, t) => { bal.position.y = by + Math.sin(t * 0.25 + ph) * 9; bal.position.x += dt * 1.6; bal.rotation.y += dt * 0.05; });
      }
    }

    // Sammel-Meshes
    if (props.length) { const pm = new THREE.Mesh(U.merge(props, true), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); pm.castShadow = true; pm.receiveShadow = true; root.add(pm); }
    if (crowd.length) root.add(new THREE.Mesh(U.merge(crowd), new THREE.MeshLambertMaterial({ map: tCrowd() })));
    if (lamps.length && (night || env.time === 'dusk')) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
      const lp = new THREE.Points(lg, new THREE.PointsMaterial({ map: tGlow(), color: 0xeaf2ff, size: night ? 26 : 12, transparent: true, opacity: night ? 0.95 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      lp.frustumCulled = false; root.add(lp);
    }

    // TV-Kameras (Innenseite der Kurven + Start/Ziel)
    for (const c of tr.corners) {
      const i = c.i, side = c.dir, dist = Math.min((side > 0 ? tr.wl[i] : tr.wr[i]) + 3, hw + 9);
      tr.pos(c.s, side * dist, P); w.tvCams.push({ x: P.x, y: P.y + 3.6, z: P.z, s: c.s });
    }
    tr.pos(70, outside * (wallAt(70, outside) + 4), P); w.tvCams.push({ x: P.x, y: P.y + 7.5, z: P.z, s: 70 });
    for (const f of [0.2, 0.42, 0.6, 0.85]) { const s = f * L, sd = f * 10 % 2 < 1 ? 1 : -1; tr.pos(s, sd * (wallAt(s, sd) + 2), P); w.tvCams.push({ x: P.x, y: P.y + 5, z: P.z, s }); }
    w.tvCams.sort((a, c) => a.s - c.s);

    // Checkpoint-Tore (Zeitjagd)
    w.makeGates = function (list) {
      const geo = new THREE.TorusGeometry(hw + 2.2, 0.38, 8, 28, Math.PI);
      for (const s of list) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x38ff8a, transparent: true, opacity: 0.85, fog: false }));
        tr.pos(s, 0, P); m.position.set(P.x, P.y - 0.3, P.z); m.rotation.y = tr.headingAt(s); root.add(m); w.gates.push(m);
      }
    };

    // ----- Laufzeit -----
    let wet = -1;
    w.setWet = function (v) {
      if (Math.abs(v - wet) < 0.004) return; wet = v;
      roadMat.roughness = U.lerp(0.9, 0.2, v); roadMat.envMapIntensity = U.lerp(0.3, 1.35, v); roadMat.color.setScalar(U.lerp(1, 0.6, v));
      kerbMat.color.setScalar(U.lerp(1, 0.75, v));
    };
    w.setRain = function (r) {
      w.fog.far = pal.fogF * (pal.wet ? 1 : U.lerp(1, 0.42, r)); sun.intensity = pal.sunI * (pal.wet || night ? 1 : U.lerp(1, 0.45, r));
    };
    let flashT = 0;
    w.lightning = function () { flashT = 0.32; };
    w.update = function (dt, t, focus, cam) {
      sky.position.copy(cam.position);
      sun.position.set(focus.x + lightDir.x * 260, focus.y + lightDir.y * 260, focus.z + lightDir.z * 260);
      sun.target.position.set(focus.x, focus.y, focus.z);
      for (const f of w.anim) f(dt, t);
      if (flashT > 0) { flashT -= dt; const k = flashT > 0 ? (Math.sin(flashT * 60) > -0.2 ? flashT * 3 : 0.1) : 0; skyMat.uniforms.flash.value = k; hemi.intensity = pal.hemiI * (1 + k * 6); }
    };
    w.dispose = function () { U.disposeTree(root); if (w.envRT) w.envRT.dispose(); };
    w.setWet(0);
    return w;
  }

  F1.World = { create };
})();
