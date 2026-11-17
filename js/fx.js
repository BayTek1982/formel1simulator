/* APEX GP – Effekte: Rauch, Gischt, Funken, Regen, Bremsspuren, Feuerwerk */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;

  function pointSystem(max, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), sa = new Float32Array(max * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('sa', new THREE.BufferAttribute(sa, 2).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: F1.glowTex() }, scale: { value: 600 } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
      vertexShader: 'attribute vec3 pcolor; attribute vec2 sa; uniform float scale; varying vec3 vC; varying float vA;\nvoid main(){ vC = pcolor; vA = sa.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(700.0, sa.x * scale / max(0.1, -mv.z)); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA;\nvoid main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}',
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    const P = { max, n: 0, pts, mat, x: new Float32Array(max), y: new Float32Array(max), z: new Float32Array(max), vx: new Float32Array(max), vy: new Float32Array(max), vz: new Float32Array(max),
      life: new Float32Array(max), ml: new Float32Array(max), s0: new Float32Array(max), s1: new Float32Array(max), a0: new Float32Array(max), grav: new Float32Array(max), drag: new Float32Array(max), col };
    P.spawn = function (x, y, z, vx, vy, vz, life, s0, s1, a0, r, g, b, grav, drag) {
      if (P.n >= max) return;
      const i = P.n++;
      P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz; P.life[i] = P.ml[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.a0[i] = a0; P.grav[i] = grav || 0; P.drag[i] = drag || 0;
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    };
    P.update = function (dt, floorFn) {
      for (let i = 0; i < P.n; i++) {
        P.life[i] -= dt;
        if (P.life[i] <= 0) {
          const j = --P.n;
          if (i !== j) {
            for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'ml', 's0', 's1', 'a0', 'grav', 'drag']) P[k][i] = P[k][j];
            col[i * 3] = col[j * 3]; col[i * 3 + 1] = col[j * 3 + 1]; col[i * 3 + 2] = col[j * 3 + 2];
          }
          i--; continue;
        }
        const d = Math.max(0, 1 - P.drag[i] * dt);
        P.vx[i] *= d; P.vz[i] *= d; P.vy[i] = P.vy[i] * d - P.grav[i] * dt;
        P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
        const t = 1 - P.life[i] / P.ml[i];
        pos[i * 3] = P.x[i]; pos[i * 3 + 1] = P.y[i]; pos[i * 3 + 2] = P.z[i];
        sa[i * 2] = P.s0[i] + (P.s1[i] - P.s0[i]) * t; sa[i * 2 + 1] = P.a0[i] * (1 - t) * Math.min(1, t * 12);
      }
      geo.setDrawRange(0, P.n);
      geo.attributes.position.needsUpdate = geo.attributes.pcolor.needsUpdate = geo.attributes.sa.needsUpdate = true;
    };
    return P;
  }

  function create(scene, q) {
    const fx = {};
    const smoke = pointSystem(q.particles || 700, false), sparks = pointSystem(q.particles || 700, true);
    scene.add(smoke.pts, sparks.pts);
    fx.smoke = function (x, y, z, vx, vy, vz, grey, alpha, size, life) {
      smoke.spawn(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, vx + (Math.random() - 0.5) * 1.5, vy + Math.random() * 1.2, vz + (Math.random() - 0.5) * 1.5,
        life || 0.9 + Math.random() * 0.6, size || 1.2, (size || 1.2) * 4.5, alpha, grey, grey, grey * 1.02, -0.4, 1.4);
    };
    fx.dust = function (x, y, z, vx, vz, r, g, b, alpha) {
      smoke.spawn(x, y, z, vx * 0.3 + (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.5, vz * 0.3 + (Math.random() - 0.5) * 2, 0.9 + Math.random() * 0.7, 1.2, 5.5, alpha, r, g, b, -0.2, 1.2);
    };
    fx.spark = function (x, y, z, vx, vy, vz, n, r, g, b) {
      for (let i = 0; i < n; i++) sparks.spawn(x, y, z, vx + (Math.random() - 0.5) * 7, vy + Math.random() * 3.5, vz + (Math.random() - 0.5) * 7, 0.25 + Math.random() * 0.45, 0.28, 0.08, 1, r == null ? 1 : r, g == null ? 0.72 : g, b == null ? 0.3 : b, 9, 0.6);
    };
    // Feuerwerk / Konfetti
    fx.burst = function (x, y, z, hex, n, speed) {
      const c = new THREE.Color(hex);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, e = Math.acos(2 * Math.random() - 1), sp = speed * (0.55 + Math.random() * 0.5);
        sparks.spawn(x, y, z, Math.sin(e) * Math.cos(a) * sp, Math.cos(e) * sp, Math.sin(e) * Math.sin(a) * sp, 1.3 + Math.random() * 1.1, 4.5, 1.2, 1, c.r, c.g, c.b, 5, 0.9);
      }
    };

    // --- Regen ---
    const RN = q.rain || 1500, rpos = new Float32Array(RN * 6), rbase = new Float32Array(RN * 3);
    for (let i = 0; i < RN; i++) { rbase[i * 3] = (Math.random() - 0.5) * 44; rbase[i * 3 + 1] = Math.random() * 24 - 8; rbase[i * 3 + 2] = (Math.random() - 0.5) * 44; }
    const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3).setUsage(THREE.DynamicDrawUsage));
    const rmat = new THREE.LineBasicMaterial({ color: 0xb8ccea, transparent: true, opacity: 0.4, fog: false, depthWrite: false });
    const rain = new THREE.LineSegments(rgeo, rmat); rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 6; scene.add(rain);
    let rainI = 0, rOff = 0;
    fx.setRain = function (i) { rainI = i; rain.visible = i > 0.02; rmat.opacity = 0.18 + 0.3 * i; rgeo.setDrawRange(0, Math.floor(RN * Math.min(1, i * 1.2)) * 2); };

    // --- Bremsspuren ---
    const SK = 1400, spos = new Float32Array(SK * 18), salp = new Float32Array(SK * 6);
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3).setUsage(THREE.DynamicDrawUsage)); sgeo.setAttribute('al', new THREE.BufferAttribute(salp, 1).setUsage(THREE.DynamicDrawUsage));
    const skid = new THREE.Mesh(sgeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide,
      vertexShader: 'attribute float al; varying float vA; void main(){ vA = al; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.012, 0.012, 0.014, vA * 0.62); }',
    }));
    skid.frustumCulled = false; scene.add(skid);
    let sk = 0; const last = [null, null, null, null];
    fx.skid = function (k, x, y, z, nx, nz, alpha) {
      if (alpha <= 0.02) { last[k] = null; return; }
      const hwd = 0.19, ax = x + nx * hwd, az = z + nz * hwd, bx = x - nx * hwd, bz = z - nz * hwd, L = last[k];
      if (L) {
        if ((x - L.x) * (x - L.x) + (z - L.z) * (z - L.z) < 0.2) return;
        const o = sk * 18, a = sk * 6, yy = y + 0.025;
        spos.set([L.ax, L.y, L.az, L.bx, L.y, L.bz, ax, yy, az, L.bx, L.y, L.bz, bx, yy, bz, ax, yy, az], o);
        salp.set([L.al, L.al, alpha, L.al, alpha, alpha], a);
        sk = (sk + 1) % SK;
        sgeo.attributes.position.needsUpdate = sgeo.attributes.al.needsUpdate = true;
      }
      last[k] = { x, z, y: y + 0.025, ax, az, bx, bz, al: alpha };
    };
    fx.clear = function () { smoke.n = 0; sparks.n = 0; spos.fill(0); salp.fill(0); sgeo.attributes.position.needsUpdate = sgeo.attributes.al.needsUpdate = true; for (let i = 0; i < 4; i++) last[i] = null; };

    fx.update = function (dt, cam, camVel, pxScale) {
      smoke.mat.uniforms.scale.value = sparks.mat.uniforms.scale.value = pxScale;
      smoke.update(dt); sparks.update(dt);
      if (rain.visible) {
        rOff += dt * 30;
        const sx = -camVel.x * 0.03, sy = -0.9 - 0.2 * rainI, sz = -camVel.z * 0.03;
        const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
        for (let i = 0; i < RN; i++) {
          const x = cx + U.mod(rbase[i * 3] - cx + 22, 44) - 22, z = cz + U.mod(rbase[i * 3 + 2] - cz + 22, 44) - 22, y = cy + U.mod(rbase[i * 3 + 1] - rOff - cy + 8, 24) - 8;
          const o = i * 6;
          rpos[o] = x; rpos[o + 1] = y; rpos[o + 2] = z; rpos[o + 3] = x + sx; rpos[o + 4] = y + sy; rpos[o + 5] = z + sz;
        }
        rgeo.attributes.position.needsUpdate = true;
      }
    };
    return fx;
  }
  F1.FX = { create };
})();
