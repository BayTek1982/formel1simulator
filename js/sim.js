/* APEX GP – Fahrphysik, KI-Fahrer, Kollisionen */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U, PH = F1.PHYS;
  const GEAR_TOP = [0, 23, 33, 43, 53, 63, 74, 86, 106];
  const loc = { i: 0, s: 0, d: 0 }, P = { x: 0, y: 0, z: 0, i: 0 };
  const S = (F1.Sim = { GEAR_TOP });

  S.newCar = function (o) {
    return Object.assign({
      x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, vx: 0, vz: 0, v: 0, r: 0, s: 0, d: 0, idx: 0, dist: 0,
      steer: 0, throttle: 0, brake: 0, gear: 1, rpm: 0.3, shiftT: 0,
      drsOn: false, drsOK: false, inZone: false, drsV: 0, boost: false, battery: 1, wear: 0, damage: 0, heat: 0, slipS: 0, slide: 0, surf: 0, spin: 0,
      reverse: false, revT: 0, pvF: 0, accS: 0, latS: 0, gapAny: 999,
      lat: 0, latV: 0, latT: 0, vCap: 999, passSide: 0, hit: 0, wait: 0, pace: 1, mu: 1, pow: 1, aggr: 0.5, prof: null, lockT: 0,
      lap: 0, lapStart: 0, laps: [], best: null, last: null, finished: false, finishT: 0, out: false, gone: false, pen: 0, pos: 1,
    }, o);
  };

  S.put = function (c, tr, s, d, dist) {
    s = U.mod(s, tr.L);
    c.s = s; c.d = d; c.dist = dist; c.v = 0; c.vx = c.vz = 0; c.r = 0; c.latV = 0;
    c.lat = d - tr.at(tr.ro, s); c.latT = c.lat;
    tr.pos(s, d, P); c.x = P.x; c.y = P.y; c.z = P.z; c.idx = P.i; c.yaw = tr.headingAt(s);
    c.pitch = c.roll = 0; c.reverse = false; c.gear = 1;
  };
  S.toGrid = function (c, tr, slot) { const back = 9 + 8 * slot; S.put(c, tr, -back, slot % 2 ? -2.7 : 2.7, -back); };

  // ---------- Spielerauto ----------
  /* inp: {steer -1..1 (links +), throttle, brake, boost}; g: {track, assist, wet, playerPow, onImpact} */
  S.stepPlayer = function (c, inp, dt, g) {
    const tr = g.track, A = g.assist;
    const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
    const u = c.vx * sn + c.vz * cs, vl = c.vx * cs - c.vz * sn, au = Math.abs(u);
    // Untergrund: weicher Übergang, je weiter das Auto neben dem Asphalt steht
    const ad = Math.abs(c.d), kerb = c.d > 0 ? tr.kerbL[c.idx] : tr.kerbR[c.idx], grav = c.d > 0 ? tr.gravL[c.idx] : tr.gravR[c.idx];
    const edge = tr.hw + (kerb ? 1.5 : 0), off = U.clamp((ad - (edge - 0.2)) / 1.4, 0, 1);
    let sg = kerb && ad > tr.hw ? 0.95 : 1, sdrag = 0, surf = 0;
    if (off > 0) {
      if (tr.theme === 'city') { sg = U.lerp(sg, 0.93, off); surf = 4; }
      else if (grav && ad > tr.hw + 2.6) { sg = U.lerp(sg, 0.44, off); sdrag = off * (3.2 + 0.11 * au); surf = 3; }
      else { sg = U.lerp(sg, 0.52, off); sdrag = off * (1.5 + 0.035 * au); surf = 2; }
    }
    const mu = PH.MU * sg * (1 - 0.3 * g.wet * (surf === 2 || surf === 3 ? 0.4 : 1)) * (1 - 0.08 * c.wear) * A.grip;
    const aMax = mu * (PH.G + PH.KDF * u * u * (1 - 0.3 * c.damage) * (c.drsOn ? 0.86 : 1));
    const thr = inp.throttle, brk = inp.brake, st = inp.steer;

    const rKin = (u * Math.tan(st * 0.31)) / 3.6;
    const ayNeed = Math.min(Math.abs(u * rKin), 0.97 * aMax);
    const longAvail = Math.sqrt(Math.max(0, aMax * aMax - ayNeed * ayNeed));

    // Rückwärtsgang: Bremse im Stand halten
    if (!c.reverse) { if (au < 1 && brk > 0.5 && thr < 0.1) { c.revT += dt; if (c.revT > 0.3) c.reverse = true; } else c.revT = 0; }
    else if (brk < 0.1) { c.reverse = false; c.revT = 0; }

    let aBrk = brk * aMax;
    aBrk = U.lerp(aBrk, Math.min(aBrk, Math.max(longAvail, 0.3 * aMax)), A.abs);
    const pw = PH.POWER * g.playerPow * (c.boost ? 1.17 : 1) * (1 - 0.12 * c.damage) * (c.shiftT > 0 ? 0.35 : 1);
    const aReq = thr * Math.min(pw / Math.max(au, 5), PH.TRAC * aMax);
    const excess = Math.max(0, aReq - PH.TRAC * longAvail);
    let aDrv = aReq - excess * A.tc;
    const spin = (excess * (1 - A.tc)) / aMax;
    if (spin > 0) aDrv -= excess * (1 - A.tc) * 0.35;
    if (c.reverse) { aDrv = u > -9 ? -brk * 3.5 : 0; aBrk = 0; }
    c.spin = spin;

    const axT = Math.min(aMax, Math.abs(aDrv) + aBrk);
    const ayCap = Math.sqrt(Math.max(0.03 * aMax * aMax, aMax * aMax - axT * axT)) * (1 - Math.min(0.5, spin * 1.5));
    const rLim = (ayCap / Math.max(au, 5)) * A.over;
    let rCmd = U.clamp(rKin, -rLim, rLim);
    const beta = Math.atan2(vl, Math.max(au, 3)), b0 = 0.1 + 0.04 * g.wet;
    if (Math.abs(beta) > b0) rCmd += A.align * (beta - U.sign(beta) * b0);
    if (spin > 0.02) rCmd += spin * 2.6 * (Math.abs(st) > 0.05 ? U.sign(st) : U.sign(c.r));
    c.r += (rCmd - c.r) * Math.min(1, dt / 0.07);

    const x = beta / b0, ax1 = Math.abs(x);
    const f = ax1 < 1 ? x * (1.5 - 0.5 * x * x) : U.sign(x) * (1 - 0.14 * Math.min(1, (ax1 - 1) / 3));
    const ay = -ayCap * f;

    const sgn = u > 0.05 ? 1 : u < -0.05 ? -1 : 0;
    const drag = PH.KDRAG * u * au * (c.drsOn ? 0.78 : 1) * (1 - 0.32 * c.slipS);
    const aLong = aDrv - aBrk * sgn - drag - sgn * (PH.ROLL + sdrag + (thr < 0.05 && !c.reverse ? 0.9 : 0));
    c.vx += (sn * aLong + cs * ay) * dt; c.vz += (cs * aLong - sn * ay) * dt;
    // nicht durch die Bremse rückwärts rollen
    const u2 = c.vx * sn + c.vz * cs;
    if (sgn > 0 && u2 < 0 && !c.reverse) { c.vx -= sn * u2; c.vz -= cs * u2; }
    if (thr < 0.02 && !c.reverse && Math.abs(u2) < 0.35 && Math.hypot(c.vx, c.vz) < 0.6) { c.vx = 0; c.vz = 0; }

    c.x += c.vx * dt; c.z += c.vz * dt; c.yaw += c.r * dt;

    tr.locate(c.x, c.z, c.idx, loc);
    let dsv = loc.s - c.s; if (dsv > tr.L / 2) dsv -= tr.L; else if (dsv < -tr.L / 2) dsv += tr.L;
    c.dist += dsv; c.s = loc.s; c.d = loc.d; c.idx = loc.i;

    // Mauer
    const i = c.idx, wall = (c.d > 0 ? tr.wl[i] : tr.wr[i]) - 1.0;
    if (Math.abs(c.d) > wall) {
      const sd = c.d > 0 ? 1 : -1, nx = tr.nx[i] * sd, nz = tr.nz[i] * sd, pen = Math.abs(c.d) - wall;
      c.x -= nx * pen; c.z -= nz * pen; c.d = sd * wall;
      const vn = c.vx * nx + c.vz * nz;
      if (vn > 0) {
        c.vx -= nx * vn * 1.22; c.vz -= nz * vn * 1.22;
        const fr = Math.min(0.55, vn * 0.04); c.vx *= 1 - fr; c.vz *= 1 - fr;
        let dy = U.wrapPi(tr.hd[i] - c.yaw); if (Math.abs(dy) > Math.PI / 2) dy = U.wrapPi(dy - Math.PI);
        c.yaw += dy * U.clamp(vn * 0.05, 0, 0.5); c.r *= 0.4;
        if (vn > 1.2 && g.onImpact) g.onImpact('wall', vn, c.x + nx, c.z + nz);
      }
    }
  };

  /* einmal pro Bild: Gänge, Batterie, DRS, Verschleiß, Lage */
  S.playerFrame = function (c, inp, dt, g) {
    const tr = g.track, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
    const u = c.vx * sn + c.vz * cs, vl = c.vx * cs - c.vz * sn, sp = Math.hypot(c.vx, c.vz);
    c.v = u; c.speed = sp; c.surf = tr.surface(c.idx, c.d);
    c.throttle = inp.throttle; c.brake = inp.brake; c.steer = inp.steer;
    if (c.shiftT > 0) c.shiftT -= dt;
    if (c.gear < 8 && u > GEAR_TOP[c.gear] * 0.985) { c.gear++; c.shiftT = 0.06; if (g.onShift) g.onShift(); }
    else if (c.gear > 1 && u < GEAR_TOP[c.gear - 1] * 0.84) { c.gear--; if (g.onShift) g.onShift(); }
    c.rpm = U.clamp(Math.abs(u) / GEAR_TOP[c.gear], 0.28, 1.03);
    if (c.spin > 0.05) c.rpm = Math.min(1.03, c.rpm + c.spin * 0.8);
    const beta = Math.atan2(vl, Math.max(Math.abs(u), 3));
    c.slide = Math.max(U.clamp((Math.abs(beta) - 0.075) / 0.22, 0, 1) * U.smooth(4, 14, sp), U.clamp(c.spin * 3, 0, 1));
    c.boost = !!inp.boost && c.battery > 0.015 && inp.throttle > 0.5 && u > 8;
    if (c.boost) c.battery -= dt / 8; else c.battery += dt * (0.02 + (u > 15 ? inp.brake * 0.12 : 0));
    c.battery = U.clamp(c.battery, 0, 1);
    if (sp > 5) c.wear = Math.min(1, c.wear + dt * (0.0009 + c.slide * 0.012));
    c.heat = U.clamp(c.heat + dt * (inp.brake * (u > 20 ? 1.8 : 0.1) - 0.45), 0, 1);
    const inZ = tr.inDrs(c.s);
    if (inZ && !c.inZone) c.drsOK = g.drsFree || (g.drsRace && c.gapAny < Math.max(22, u * 1.05));
    c.inZone = inZ;
    c.drsOn = inZ && c.drsOK && inp.throttle > 0.6 && inp.brake < 0.05 && c.surf === 0 && u > 25;
    c.y = tr.at(tr.py, c.s) + (c.surf === 1 ? Math.sin(c.dist * 5) * 0.012 : c.surf === 2 || c.surf === 3 ? Math.sin(c.dist * 2.3) * 0.02 : 0);
    S.attitude(c, g, dt, u, u * c.r);
  };

  S.attitude = function (c, g, dt, vF, latA) {
    const tr = g.track, i = c.idx;
    const acc = dt > 0 ? (vF - c.pvF) / dt : 0; c.pvF = vF;
    c.accS = U.damp(c.accS, U.clamp(acc, -60, 25), 9, dt); c.latS = U.damp(c.latS, U.clamp(latA, -65, 65), 9, dt);
    c.pitch = -Math.atan(tr.slope[i] * Math.cos(c.yaw - tr.hd[i])) - c.accS * 0.00055;
    c.roll = c.latS * 0.0004;
    c.drsV = U.damp(c.drsV, c.drsOn ? 1 : 0, 14, dt);
  };

  // Lenkhilfe: zielt auf die Ideallinie
  S.autoSteer = function (c, g) {
    const tr = g.track, u = Math.max(0, c.v), look = 11 + 0.33 * u;
    const s = c.s + look; tr.pos(s, tr.at(tr.ro, s), P);
    const dx = P.x - c.x, dz = P.z - c.z, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
    const fwd = dx * sn + dz * cs, left = dx * cs - dz * sn;
    const curv = (2 * left) / (fwd * fwd + left * left + 1e-3);
    return U.clamp(Math.atan(curv * 3.6) / 0.31, -1, 1);
  };

  // ---------- KI ----------
  function placeAI(c, tr) {
    const d = tr.at(tr.ro, c.s) + c.lat;
    tr.pos(c.s, d, P); c.x = P.x; c.y = P.y; c.z = P.z; c.d = d; c.idx = P.i;
    const dd = tr.dro[P.i] + (c.v > 3 ? c.latV / c.v : 0);
    c.yaw = tr.headingAt(c.s) + Math.atan2(dd, Math.max(0.3, 1 - tr.k[P.i] * d));
    c.steer = U.clamp((3.6 * tr.rk[P.i]) / 0.3 + c.latV * 0.12, -1, 1);
  }
  S.placeAI = placeAI;

  S.planAI = function (cars, g, dt) {
    const tr = g.track, L = tr.L, lim = tr.hw - 1.2;
    for (const c of cars) {
      let ahead = null, gapA = 1e9, gapAny = 1e9, sideL = false, sideR = false;
      const look = U.clamp(c.v * 1.3, 28, 95);
      for (const o of cars) {
        if (o === c || o.gone) continue;
        let dsv = o.s - c.s; if (dsv > L / 2) dsv -= L; else if (dsv < -L / 2) dsv += L;
        const dd = o.d - c.d;
        if (dsv > 0 && dsv < gapAny) gapAny = dsv;
        if (dsv > 0 && dsv < look && Math.abs(dd) < 2.25 && dsv < gapA) { ahead = o; gapA = dsv; }
        if (Math.abs(dsv) < 7 && Math.abs(dd) < 4.4 && Math.abs(dd) > 1.1) { if (dd > 0) sideL = true; else sideR = true; }
      }
      c.gapAny = gapAny;
      // Windschatten
      const tow = ahead && Math.abs(ahead.d - c.d) < 1.7 && gapA < 75 ? 1 - gapA / 75 : 0;
      c.slipS = U.damp(c.slipS, tow, 3, dt);
      if (c.isPlayer || c.out) continue;
      c.vCap = 999;
      if (c.hit > 0) c.hit -= dt;
      const roS = tr.at(tr.ro, c.s);
      if (ahead) {
        const gap = gapA - 5.5, closing = c.v - ahead.v;
        const roomL = lim - (ahead.d + 2.5), roomR = lim + (ahead.d - 2.5);
        let side = 0;
        if (c.passSide && (c.passSide > 0 ? roomL > 0 : roomR > 0)) side = c.passSide;
        else if (roomL > 0 || roomR > 0) {
          const kN = tr.rk[(c.idx + 28) % tr.n];
          if (roomL > 0 && roomR > 0) side = Math.abs(kN) > 0.004 ? (kN > 0 ? 1 : -1) : roomL > roomR ? 1 : -1;
          else side = roomL > 0 ? 1 : -1;
        }
        if ((side > 0 && sideL) || (side < 0 && sideR)) side = 0;
        if (side && (closing > -1.5 || gap < 12) && c.hit <= 0 && gap < 10 + c.aggr * 40) { c.passSide = side; c.latT = U.clamp(ahead.d + side * 2.75, -lim, lim) - roS; }
        else c.passSide = 0;
        if (Math.abs(ahead.d - c.d) < 2.05) c.vCap = Math.max(0, ahead.v + (gap - (2.2 + c.v * 0.035)) * 0.9);
      } else {
        c.passSide = 0;
        const dir = -c.lat;
        c.latT = (dir > 0.3 && sideL) || (dir < -0.3 && sideR) ? c.lat : 0;
      }
      // DRS & ERS
      const inZ = tr.inDrs(c.s);
      if (inZ && !c.inZone) c.drsOK = g.drsRace && gapAny < Math.max(22, c.v * 1.05);
      c.inZone = inZ; c.drsOn = inZ && c.drsOK && c.throttle > 0.5;
      const str = Math.abs(tr.rk[c.idx]) < 0.0025;
      if (c.boost) { c.battery -= dt / 8; if (c.battery <= 0.05 || !str || gapAny > 60) c.boost = false; }
      else { c.battery = Math.min(1, c.battery + dt * 0.035); if (c.battery > 0.45 && str && gapAny < 45 && c.v > 40) c.boost = true; }
    }
  };

  S.stepAI = function (c, dt, g) {
    const tr = g.track, n = tr.n, L = tr.L;
    if (c.wait > 0) { c.wait -= dt; c.v = 0; placeAI(c, tr); S.attitude(c, g, dt, 0, 0); return; }
    const f = c.s / tr.ds, i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, t = f - Math.floor(f);
    const kap = Math.abs(tr.rk[i0]);
    let vt = (c.prof[i0] + (c.prof[i1] - c.prof[i0]) * t) * c.pace;
    vt *= 1 - Math.min(0.1, Math.abs(c.lat) * 0.018) * U.smooth(0.004, 0.014, kap);
    if (kap < 0.0025) vt *= 1 + 0.03 * c.slipS + (c.drsOn ? 0.035 : 0) + (c.boost ? 0.02 : 0);
    if (c.lockT > 0) { c.lockT -= dt; vt *= 0.9; }
    if (c.vCap < vt) vt = c.vCap;
    if (c.out) vt = 0;
    const mu = PH.MU * c.mu * (1 - 0.3 * g.wet), aTot = mu * (PH.G + PH.KDF * c.v * c.v);
    const pv = c.v;
    if (c.v < vt) {
      const a = Math.min((PH.POWER * c.pow) / Math.max(c.v, 5), (PH.TRAC * aTot * (0.5 + 0.5 * c.mu)) / c.mu) - PH.KDRAG * c.v * c.v * (1 - 0.32 * c.slipS) * (c.drsOn ? 0.78 : 1) - PH.ROLL;
      c.v = Math.min(vt, c.v + a * dt); c.throttle = c.v < vt - 0.3 ? 1 : 0.6; c.brake = 0;
    } else {
      const dec = 0.92 * aTot + PH.KDRAG * c.v * c.v;
      c.v = Math.max(vt, c.v - dec * dt); c.throttle = 0; c.brake = pv - c.v > dec * dt * 0.35 ? 1 : 0;
    }
    c.heat = U.clamp(c.heat + dt * (c.brake * (c.v > 20 ? 1.8 : 0.1) - 0.45), 0, 1);
    const adv = (c.v * dt) / Math.max(0.6, 1 - tr.k[i0] * (tr.ro[i0] + c.lat));
    c.s += adv; if (c.s >= L) c.s -= L; c.dist += adv;
    const w0 = 2.3;
    c.latV += ((c.latT - c.lat) * w0 * w0 - 2 * w0 * c.latV) * dt;
    const mxV = 0.8 + c.v * 0.05; c.latV = U.clamp(c.latV, -mxV, mxV);
    c.lat += c.latV * dt;
    const lim = tr.hw - 1.1, dNow = tr.at(tr.ro, c.s) + c.lat;
    if (dNow > lim) { c.lat -= dNow - lim; if (c.latV > 0) c.latV = 0; } else if (dNow < -lim) { c.lat += -lim - dNow; if (c.latV < 0) c.latV = 0; }
    // Gänge für den Klang
    if (c.gear < 8 && c.v > GEAR_TOP[c.gear] * 0.985) c.gear++; else if (c.gear > 1 && c.v < GEAR_TOP[c.gear - 1] * 0.84) c.gear--;
    c.rpm = U.clamp(c.v / GEAR_TOP[c.gear], 0.28, 1.03);
    placeAI(c, tr);
    S.attitude(c, g, dt, c.v, c.v * c.v * tr.rk[c.idx]);
  };

  // KI-Autos dürfen sich nicht durchdringen
  S.separateAI = function (cars, g) {
    const L = g.track.L;
    for (let a = 0; a < cars.length; a++) {
      const c = cars[a]; if (c.isPlayer || c.gone) continue;
      for (let b = a + 1; b < cars.length; b++) {
        const o = cars[b]; if (o.isPlayer || o.gone) continue;
        let dsv = o.s - c.s; if (dsv > L / 2) dsv -= L; else if (dsv < -L / 2) dsv += L;
        const dd = o.d - c.d;
        if (Math.abs(dsv) > 5.4 || Math.abs(dd) > 1.95) continue;
        const rear = dsv > 0 ? c : o, front = dsv > 0 ? o : c;
        if (Math.abs(dd) < 1.5) { rear.v = Math.min(rear.v, Math.max(0, front.v - 0.4)); const push = (5.4 - Math.abs(dsv)) * 0.25; rear.s = U.mod(rear.s - push, L); rear.dist -= push; }
        const sep = (1.95 - Math.abs(dd)) * 0.5 * (dd >= 0 ? 1 : -1);
        c.lat -= sep * 0.5; o.lat += sep * 0.5;
      }
    }
  };

  // ---------- Spieler ↔ KI ----------
  const OFFS = [-1.75, 0, 1.75], CR = 0.98;
  S.collide = function (p, cars, g) {
    const tr = g.track, ps = Math.sin(p.yaw), pc = Math.cos(p.yaw);
    for (const o of cars) {
      if (o === p || o.gone) continue;
      const dx0 = p.x - o.x, dz0 = p.z - o.z;
      if (dx0 * dx0 + dz0 * dz0 > 52) continue;
      const os = Math.sin(o.yaw), oc = Math.cos(o.yaw);
      let best = 0, nx = 0, nz = 0, cx = 0, cz = 0, ca = 0;
      for (const a of OFFS) for (const b of OFFS) {
        const ax = p.x + ps * a, az = p.z + pc * a, bx = o.x + os * b, bz = o.z + oc * b, dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz), pen = 2 * CR - d;
        if (pen > best) { best = pen; nx = dx / (d || 1); nz = dz / (d || 1); cx = (ax + bx) / 2; cz = (az + bz) / 2; ca = a; }
      }
      if (best <= 0) continue;
      const oi = o.idx, tX = tr.tx[oi], tZ = tr.tz[oi], nX = tr.nx[oi], nZ = tr.nz[oi];
      p.x += nx * best * 0.6; p.z += nz * best * 0.6;
      const push = best * 0.4, al = (-nx * tX - nz * tZ) * push;
      o.lat += (-nx * nX - nz * nZ) * push; o.s = U.mod(o.s + al, tr.L); o.dist += al;
      const ovx = os * o.v + nX * o.latV, ovz = oc * o.v + nZ * o.latV;
      const vrel = (p.vx - ovx) * nx + (p.vz - ovz) * nz;
      if (vrel < 0) {
        const j = -1.25 * vrel * 0.5;
        p.vx += nx * j; p.vz += nz * j;
        o.v = Math.max(0, o.v + (-nx * tX - nz * tZ) * j); o.latV += (-nx * nX - nz * nZ) * j;
        p.r += U.clamp(ca * (nx * pc - nz * ps) * j * 0.05, -1.2, 1.2);
        o.hit = 1.3; o.passSide = 0;
        if (g.onImpact) g.onImpact('car', -vrel, cx, cz, o);
      }
    }
  };
})();
