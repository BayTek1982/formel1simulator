/* APEX GP – Teams, Fahrer und das prozedurale Formel-Auto */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;

  // frei erfundene Teams und Fahrer
  F1.TEAMS = [
    { id: 'vulkan', name: 'Vulkan Racing', c1: 0x1b2a6b, c2: 0xff5a1f, str: 1.0, drivers: [['Kenji Arakawa', 'ARA', 1, 1.0], ['Mateo Vargas', 'VAR', 11, 0.9]] },
    { id: 'solaris', name: 'Solaris GP', c1: 0xff8a00, c2: 0x16181c, str: 0.97, drivers: [['Oliver Whitcombe', 'WHI', 4, 0.97], ['Tom Ashby', 'ASH', 81, 0.93]] },
    { id: 'falcone', name: 'Falcone Corse', c1: 0xd3121a, c2: 0xffd400, str: 0.95, drivers: [['Luca Marinelli', 'MAR', 16, 0.96], ['Dario Conti', 'CON', 55, 0.9]] },
    { id: 'nordstern', name: 'Nordstern Racing', c1: 0x11161b, c2: 0x18e0c8, str: 0.92, drivers: [['Jonas Bergström', 'BER', 63, 0.94], ['Niklas Aaltonen', 'AAL', 77, 0.88]] },
    { id: 'emerald', name: 'Emerald Motorsport', c1: 0x0b6b4a, c2: 0xc8ff3c, str: 0.85, drivers: [['Jack Thornton', 'THO', 14, 0.92], ['Liam O’Rourke', 'ORO', 18, 0.8]] },
    { id: 'azur', name: 'Azur Grand Prix', c1: 0x1e6bff, c2: 0xff5fb2, str: 0.8, drivers: [['Émile Garnier', 'GAR', 10, 0.87], ['Hugo Delacroix', 'DEL', 31, 0.84]] },
    { id: 'kobalt', name: 'Kobalt Engineering', c1: 0xeef1f5, c2: 0x1447c9, str: 0.78, drivers: [['Felix Brandt', 'BRA', 23, 0.86], ['Moritz Keller', 'KEL', 2, 0.78]] },
    { id: 'titan', name: 'Titan Autosport', c1: 0x17181c, c2: 0xd4a531, str: 0.74, drivers: [['Rafael Oliveira', 'OLI', 27, 0.84], ['Thiago Barros', 'BAR', 20, 0.79]] },
    { id: 'sakura', name: 'Sakura Racing', c1: 0xff6fa8, c2: 0xffffff, str: 0.7, drivers: [['Yuto Shimizu', 'SHI', 22, 0.85], ['Arjun Mehta', 'MEH', 3, 0.77]] },
    { id: 'polar', name: 'Polar Dynamics', c1: 0x7fd3ff, c2: 0x0d2038, str: 0.66, drivers: [['Sven Halvorsen', 'HAL', 24, 0.8], ['Piotr Nowicki', 'NOW', 44, 0.76]] },
  ];
  F1.hex = (n) => '#' + ('000000' + n.toString(16)).slice(-6);

  // Querschnitte entlang z zu einem glatten Körper verbinden
  function loft(secs, seg) {
    seg = seg || 16;
    if (secs[0].z > secs[secs.length - 1].z) secs = secs.slice().reverse();
    const pos = [], idx = [], m = secs.length;
    for (let i = 0; i < m; i++) {
      const s = secs[i], e = 2 / (s.p || 2.4), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, xo = s.x || 0;
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        pos.push(xo + s.w * Math.sign(c) * Math.pow(Math.abs(c), e), yc + hh * Math.sign(sn) * Math.pow(Math.abs(sn), e), s.z);
      }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) {
      const A = i * seg + j, B = i * seg + ((j + 1) % seg), C = (i + 1) * seg + ((j + 1) % seg), D = (i + 1) * seg + j;
      idx.push(A, B, D, B, C, D);
    }
    const c0 = pos.length / 3; pos.push(secs[0].x || 0, (secs[0].y0 + secs[0].y1) / 2, secs[0].z);
    const c1 = c0 + 1; pos.push(secs[m - 1].x || 0, (secs[m - 1].y0 + secs[m - 1].y1) / 2, secs[m - 1].z);
    for (let j = 0; j < seg; j++) {
      idx.push(c0, (j + 1) % seg, j);
      idx.push(c1, (m - 1) * seg + j, (m - 1) * seg + ((j + 1) % seg));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  const AX_F = 1.8, AX_R = -1.8, WX_F = 0.81, WX_R = 0.79, WR = 0.36;
  let shared = null;

  function wheelGeom(w) {
    const pts = [[0.2, -w / 2], [0.335, -w / 2], [0.36, -w / 2 + 0.035], [0.36, w / 2 - 0.035], [0.335, w / 2], [0.2, w / 2]].map((p) => new THREE.Vector2(p[0], p[1]));
    const parts = [U.tint(new THREE.LatheGeometry(pts, 22).rotateZ(Math.PI / 2), 0x0d0d0e)];
    parts.push(U.tint(new THREE.CylinderGeometry(0.235, 0.235, w + 0.012, 20).rotateZ(Math.PI / 2), 0x1b1d21));
    for (const sgn of [-1, 1]) {
      const x = sgn * (w / 2 + 0.004);
      parts.push(U.tint(U.xf(new THREE.TorusGeometry(0.228, 0.012, 6, 22), x, 0, 0, 0, Math.PI / 2, 0), 0x9aa3ad));
      parts.push(U.tint(U.xf(new THREE.TorusGeometry(0.298, 0.011, 6, 26), x - sgn * 0.004, 0, 0, 0, Math.PI / 2, 0), 0xffd200));
      for (let q = 0; q < 3; q++) parts.push(U.tint(U.xf(new THREE.BoxGeometry(0.012, 0.44, 0.035), x + sgn * 0.004, 0, 0, (q * Math.PI) / 3, 0, 0), 0x596270));
    }
    return U.merge(parts, true);
  }

  function initShared() {
    const sh = (shared = {});
    sh.wheelF = wheelGeom(0.32); sh.wheelR = wheelGeom(0.42);
    sh.wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.15 });
    sh.carbon = new THREE.MeshStandardMaterial({ color: U.col(0x121317), roughness: 0.42, metalness: 0.55 });
    sh.helmetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.2 });
    sh.paint = {};
    sh.ghost = new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.28, depthWrite: false });

    // --- Lackteile 1 (Hauptfarbe) ---
    const p1 = [];
    p1.push(loft([
      { z: -2.45, w: 0.09, y0: 0.17, y1: 0.33, p: 2 }, { z: -1.95, w: 0.17, y0: 0.12, y1: 0.5, p: 2.2 },
      { z: -1.25, w: 0.25, y0: 0.09, y1: 0.78, p: 2.2 }, { z: -0.62, w: 0.29, y0: 0.08, y1: 0.97, p: 2.2 },
      { z: -0.28, w: 0.34, y0: 0.08, y1: 0.74, p: 2.6 }, { z: 0.3, w: 0.37, y0: 0.08, y1: 0.6, p: 3 },
      { z: 0.9, w: 0.33, y0: 0.1, y1: 0.61, p: 3 }, { z: 1.45, w: 0.25, y0: 0.14, y1: 0.55, p: 2.6 },
      { z: 2.05, w: 0.18, y0: 0.17, y1: 0.45, p: 2.4 }, { z: 2.62, w: 0.125, y0: 0.19, y1: 0.35, p: 2.2 },
    ], 18));
    for (const sg of [-1, 1]) {
      p1.push(loft([
        { z: -1.85, w: 0.09, y0: 0.1, y1: 0.26, p: 2, x: sg * 0.3 }, { z: -1.3, w: 0.19, y0: 0.09, y1: 0.36, p: 2.4, x: sg * 0.44 },
        { z: -0.6, w: 0.27, y0: 0.08, y1: 0.47, p: 2.8, x: sg * 0.58 }, { z: 0.2, w: 0.27, y0: 0.08, y1: 0.52, p: 3, x: sg * 0.62 },
        { z: 0.72, w: 0.2, y0: 0.13, y1: 0.5, p: 3, x: sg * 0.64 },
      ], 14));
      p1.push(U.box(0.022, 0.6, 0.6, sg * 0.5, 0.66, -2.42));       // Heckflügel-Endplatte
      p1.push(U.box(0.02, 0.2, 0.52, sg * 0.93, 0.185, 2.74));      // Frontflügel-Endplatte
    }
    p1.push(U.box(1.8, 0.02, 0.2, 0, 0.155, 2.66, 0.28));
    sh.p1 = U.merge(p1);

    // --- Lackteile 2 (Akzentfarbe) ---
    const p2 = [];
    p2.push(loft([{ z: 2.58, w: 0.132, y0: 0.185, y1: 0.355, p: 2.2 }, { z: 2.85, w: 0.1, y0: 0.19, y1: 0.31, p: 2.1 }, { z: 3.06, w: 0.055, y0: 0.2, y1: 0.265, p: 2 }], 14));
    p2.push(U.box(0.018, 0.26, 0.85, 0, 0.8, -1.38));               // Finne
    for (const sg of [-1, 1]) {
      p2.push(U.box(0.68, 0.02, 0.17, sg * 0.55, 0.215, 2.55, 0.45));
      p2.push(U.box(0.16, 0.075, 0.05, sg * 0.52, 0.66, 0.78));
    }
    p2.push(U.box(0.07, 0.07, 0.22, 0, 1.0, -0.62));                // T-Kamera
    sh.p2 = U.merge(p2);

    // --- Carbon ---
    const cb = [];
    cb.push(U.box(1.56, 0.03, 3.5, 0, 0.06, -0.35));                // Unterboden
    cb.push(U.box(0.5, 0.03, 1.0, 0, 0.06, 1.6));
    cb.push(U.box(1.0, 0.14, 0.5, 0, 0.15, -2.2, -0.25));           // Diffusor
    cb.push(U.box(1.84, 0.022, 0.4, 0, 0.1, 2.8));                  // Frontflügel
    cb.push(U.box(0.98, 0.035, 0.33, 0, 0.84, -2.4, 0.12));         // Heckflügel
    cb.push(U.box(0.9, 0.02, 0.16, 0, 0.4, -2.38, 0.2));
    cb.push(U.box(0.035, 0.36, 0.14, 0, 0.62, -2.32));
    cb.push(U.box(0.16, 0.12, 0.3, 0, 0.26, -2.5));
    cb.push(U.box(0.2, 0.13, 0.05, 0, 0.87, -0.43));                // Airbox-Einlass
    cb.push(loft([{ z: -0.25, w: 0.2, y0: 0.5, y1: 0.69, p: 3 }, { z: 0.3, w: 0.25, y0: 0.5, y1: 0.625, p: 3 }, { z: 0.82, w: 0.19, y0: 0.5, y1: 0.632, p: 3 }], 12));
    cb.push(U.xf(new THREE.TorusGeometry(0.33, 0.024, 7, 18, Math.PI), 0, 0.885, 0.18, Math.PI / 2, 0, 0, 1, 1.8, 1));   // Halo
    cb.push(U.beam(0, 0.885, 0.775, 0, 0.6, 0.96, 0.03, 0.05));
    for (const sg of [-1, 1]) {
      cb.push(U.beam(sg * 0.33, 0.885, 0.18, sg * 0.36, 0.7, -0.32, 0.045));
      cb.push(U.box(0.02, 0.1, 0.2, sg * 0.08, 0.16, 2.74));
      cb.push(U.box(0.3, 0.2, 0.02, sg * 0.64, 0.325, 0.735));
      cb.push(U.beam(sg * 0.34, 0.56, 0.8, sg * 0.5, 0.64, 0.78, 0.02));
      for (const [az, wx] of [[AX_F, WX_F], [AX_R, WX_R]]) {
        cb.push(U.beam(sg * 0.2, 0.44, az + 0.28, sg * (wx - 0.1), 0.43, az, 0.03, 0.012));
        cb.push(U.beam(sg * 0.2, 0.44, az - 0.28, sg * (wx - 0.1), 0.43, az, 0.03, 0.012));
        cb.push(U.beam(sg * 0.18, 0.2, az + 0.3, sg * (wx - 0.1), 0.24, az, 0.03, 0.012));
        cb.push(U.beam(sg * 0.18, 0.2, az - 0.3, sg * (wx - 0.1), 0.24, az, 0.03, 0.012));
        cb.push(U.beam(sg * 0.2, 0.5, az, sg * (wx - 0.1), 0.27, az, 0.02));
      }
    }
    sh.cb = U.merge(cb);

    sh.flap = new THREE.BoxGeometry(0.98, 0.022, 0.19).translate(0, 0, -0.095);
    sh.rain = new THREE.BoxGeometry(0.07, 0.11, 0.03);
    const gl = [];
    for (const sg of [-1, 1]) for (const [az, wx] of [[AX_F, WX_F], [AX_R, WX_R]]) gl.push(U.xf(new THREE.TorusGeometry(0.17, 0.05, 6, 16), sg * wx, WR, az, 0, Math.PI / 2, 0));
    sh.glow = U.merge(gl);
    const numG = [];
    numG.push(U.xf(new THREE.PlaneGeometry(0.24, 0.24), 0, 0.462, 2.0, -Math.PI / 2 + 0.16, 0, 0));
    numG.push(U.xf(new THREE.PlaneGeometry(0.22, 0.22), 0.0105, 0.815, -1.38, 0, Math.PI / 2, 0));
    numG.push(U.xf(new THREE.PlaneGeometry(0.22, 0.22), -0.0105, 0.815, -1.38, 0, -Math.PI / 2, 0));
    sh.num = U.merge(numG);
    sh.all = U.merge([sh.p1, sh.p2, sh.cb]);
  }

  function paintMat(hex) {
    if (!shared.paint[hex]) {
      shared.paint[hex] = new THREE.MeshPhysicalMaterial({ color: U.col(hex), metalness: 0.25, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.55 });
    }
    return shared.paint[hex];
  }
  function numberTex(num, c2) {
    const [cv, g] = U.canvas(64, 64);
    g.font = '900 46px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(String(num), 32, 35);
    g.fillStyle = '#fff'; g.fillText(String(num), 32, 35);
    return U.tex(cv);
  }

  /* o: {team, num, helmet(hex), player(bool), ghost(bool)} */
  function build(o) {
    if (!shared) initShared();
    const sh = shared, grp = new THREE.Group();
    grp.rotation.order = 'YXZ';
    const vis = { group: grp, wheels: [], pivots: [], spin: 0, own: [] };
    if (o.ghost) {
      grp.add(new THREE.Mesh(sh.all, sh.ghost));
      for (const sg of [1, -1]) for (const [az, wx, gm] of [[AX_F, WX_F, sh.wheelF], [AX_R, WX_R, sh.wheelR]]) {
        const w = new THREE.Mesh(gm, sh.ghost); w.position.set(sg * wx, WR, az); grp.add(w);
      }
      return vis;
    }
    const body = new THREE.Mesh(sh.p1, paintMat(o.team.c1)), acc = new THREE.Mesh(sh.p2, paintMat(o.team.c2)), cb = new THREE.Mesh(sh.cb, sh.carbon);
    body.castShadow = cb.castShadow = true;
    grp.add(body, acc, cb);
    // Helm
    const hg = U.merge([U.tint(U.xf(new THREE.SphereGeometry(0.135, 14, 10), 0, 0.74, 0.02), o.helmet || 0xffffff), U.tint(U.box(0.2, 0.055, 0.06, 0, 0.755, 0.125), 0x0a0a0c)], true);
    vis.helmet = new THREE.Mesh(hg, sh.helmetMat); grp.add(vis.helmet); vis.own.push(hg);
    // Räder (vorn lenkbar)
    for (const sg of [1, -1]) {
      const piv = new THREE.Group(); piv.position.set(sg * WX_F, WR, AX_F);
      const w = new THREE.Mesh(sh.wheelF, sh.wheelMat); w.castShadow = true; piv.add(w); grp.add(piv);
      vis.pivots.push(piv); vis.wheels.push(w);
    }
    for (const sg of [1, -1]) {
      const w = new THREE.Mesh(sh.wheelR, sh.wheelMat); w.castShadow = true; w.position.set(sg * WX_R, WR, AX_R); grp.add(w);
      vis.wheels.push(w);
    }
    // DRS-Klappe
    vis.flap = new THREE.Mesh(sh.flap, paintMat(o.team.c2)); vis.flap.position.set(0, 0.935, -2.3); vis.flap.rotation.x = 0.42; grp.add(vis.flap);
    // Bremsglühen, Regenlicht, Startnummer
    vis.glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    vis.glow = new THREE.Mesh(sh.glow, vis.glowMat); vis.glow.visible = false; grp.add(vis.glow);
    vis.rainMat = new THREE.MeshBasicMaterial({ color: 0xff1010 });
    vis.rain = new THREE.Mesh(sh.rain, vis.rainMat); vis.rain.position.set(0, 0.27, -2.665); vis.rain.visible = false; grp.add(vis.rain);
    const nt = numberTex(o.num);
    vis.numMat = new THREE.MeshBasicMaterial({ map: nt, transparent: true, alphaTest: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    grp.add(new THREE.Mesh(sh.num, vis.numMat));
    vis.own.push(vis.glowMat, vis.rainMat, vis.numMat, nt);

    if (o.player) {
      // Lenkrad mit Display (nur in der Cockpit-Ansicht sichtbar)
      const outer = new THREE.Group(); outer.position.set(0, 0.585, 0.47); outer.rotation.set(-0.3, Math.PI, 0, 'YXZ'); outer.scale.setScalar(1.2);
      const inner = new THREE.Group(); outer.add(inner);
      const wg = U.merge([
        U.tint(U.box(0.26, 0.13, 0.03, 0, 0, 0), 0x15161a), U.tint(U.box(0.05, 0.17, 0.045, 0.135, -0.01, 0), 0x0c0c0e), U.tint(U.box(0.05, 0.17, 0.045, -0.135, -0.01, 0), 0x0c0c0e),
        U.tint(U.box(0.2, 0.03, 0.03, 0, 0.075, 0), 0x0c0c0e), U.tint(U.box(0.06, 0.2, 0.05, 0, -0.03, -0.14, 1.2), 0x0c0c0e),
        U.tint(U.box(0.062, 0.085, 0.07, 0.14, -0.015, 0.035), 0x1a1c20), U.tint(U.box(0.062, 0.085, 0.07, -0.14, -0.015, 0.035), 0x1a1c20),
        U.tint(U.box(0.018, 0.018, 0.012, 0.085, -0.04, 0.018), 0xff3030), U.tint(U.box(0.018, 0.018, 0.012, -0.085, -0.04, 0.018), 0x30c0ff),
        U.tint(U.box(0.018, 0.018, 0.012, 0.085, 0.035, 0.018), 0x40e060), U.tint(U.box(0.018, 0.018, 0.012, -0.085, 0.035, 0.018), 0xffd040),
      ], true);
      inner.add(new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
      const [cv, g] = U.canvas(160, 96);
      vis.swCanvas = cv; vis.swCtx = g; vis.swTex = U.tex(cv);
      const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.075), new THREE.MeshBasicMaterial({ map: vis.swTex }));
      disp.position.set(0, 0.005, 0.0165); inner.add(disp);
      outer.visible = false; grp.add(outer);
      vis.sw = inner; vis.swGroup = outer; vis.own.push(wg, vis.swTex);
    }
    return vis;
  }

  /* st: {x,y,z,yaw,pitch,roll,v,steer,drs(0..1),heat(0..1),rainOn} */
  function update(vis, st, dt) {
    const g = vis.group;
    g.position.set(st.x, st.y, st.z);
    g.rotation.set(st.pitch || 0, st.yaw, st.roll || 0);
    vis.spin += (st.v / WR) * dt;
    const ws = vis.wheels;
    for (let i = 0; i < ws.length; i++) ws[i].rotation.x = vis.spin;
    if (vis.pivots.length) { const a = (st.steer || 0) * 0.3; vis.pivots[0].rotation.y = a; vis.pivots[1].rotation.y = a; }
    if (vis.flap) vis.flap.rotation.x = 0.42 - 0.4 * (st.drs || 0);
    if (vis.glow) { const h = st.heat || 0; vis.glow.visible = h > 0.03; vis.glowMat.opacity = h * 0.9; }
    if (vis.rain) vis.rain.visible = !!st.rainOn;
    if (vis.sw) vis.sw.rotation.z = (st.steer || 0) * 1.15;
  }
  function drawWheelDisplay(vis, d) {
    const g = vis.swCtx; if (!g) return;
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 160, 96);
    const n = 13, lit = Math.round(U.clamp((d.rpm - 0.55) / 0.42, 0, 1) * n);
    for (let i = 0; i < n; i++) { g.fillStyle = i < lit ? (i < 5 ? '#3dff6a' : i < 10 ? '#ff3b30' : '#4d7dff') : '#1a1f27'; g.fillRect(6 + i * 11.5, 5, 9, 7); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 54px Arial, sans-serif'; g.fillText(d.gear, 80, 54);
    g.font = '700 17px Arial, sans-serif'; g.fillStyle = '#9fe8ff'; g.fillText(String(d.kmh), 28, 44);
    g.font = '600 9px Arial, sans-serif'; g.fillStyle = '#7d8896'; g.fillText('KM/H', 28, 60); g.fillText('ERS', 132, 60);
    g.font = '700 17px Arial, sans-serif'; g.fillStyle = '#ffe14d'; g.fillText(d.ers + '%', 132, 44);
    g.font = '700 12px Arial, sans-serif'; g.fillStyle = d.drs ? '#3dff6a' : '#39424e'; g.fillText('DRS', 28, 82);
    g.fillStyle = '#cfd6de'; g.fillText('P' + d.pos, 132, 82);
    vis.swTex.needsUpdate = true;
  }
  function dispose(vis) {
    for (const o of vis.own) if (o && o.dispose) o.dispose();
  }

  F1.Car = { build, update, dispose, drawWheelDisplay, WR };
})();
