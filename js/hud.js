/* APEX GP – Anzeigen im TV-Grafik-Stil */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;
  const H = (F1.HUD = {});
  const el = {};
  let mm = null, mmBase = null, mmMap = null, lastTower = '', bannerT = 0, radioT = 0;
  const txt = (e, s) => { if (e._t !== s) { e._t = s; e.textContent = s; } };
  const cls = (e, c, on) => { if (!!e['_c' + c] !== !!on) { e['_c' + c] = !!on; e.classList.toggle(c, !!on); } };
  const show = (e, on) => cls(e, 'hidden', !on);

  H.init = function () {
    for (const id of ['tower', 'lapNo', 'towerSub', 'towerRows', 'tCur', 'tLast', 'tBest', 'sectors', 'delta', 'invalid', 'bigMsg', 'bigLbl', 'bigVal', 'lights', 'banner', 'wrong', 'brakeHint', 'radio', 'radioTxt', 'coach',
      'minimap', 'leds', 'spd', 'gear', 'brkBar', 'thrBar', 'drs', 'ers', 'posNo', 'posOf', 'carBox', 'carBody', 'wxIcon', 'wxTxt', 'timing', 'posBig', 'dash', 'speedFx', 'flash']) el[id] = document.getElementById(id);
    let h = ''; for (let i = 0; i < 15; i++) h += '<i></i>';
    el.leds.innerHTML = h;
    el.ledList = el.leds.children; el.secList = el.sectors.children; el.lightList = el.lights.children; el.tyList = el.carBox.querySelectorAll('.ty');
    el.brk = el.brkBar.firstElementChild; el.thr = el.thrBar.firstElementChild; el.ersI = el.ers.firstElementChild;
    mm = el.minimap.getContext('2d');
    for (const k of ['hidden']) for (const id of ['bigMsg', 'lights', 'banner', 'wrong', 'brakeHint', 'radio', 'coach', 'invalid']) el[id]['_c' + k] = true;
  };

  H.setTrack = function (tr) {
    const [c, g] = U.canvas(356, 356);
    mmMap = F1.Tracks.fit(tr, 356, 356, 34);
    F1.Tracks.drawOutline(g, tr, mmMap, { width: 10, color: 'rgba(255,255,255,.92)', glow: 'rgba(0,0,0,.6)', start: '#ff2a1f' });
    mmBase = c;
  };
  H.minimap = function (cars, me, gates) {
    if (!mmBase) return;
    mm.clearRect(0, 0, 356, 356); mm.drawImage(mmBase, 0, 0);
    if (gates) for (const g of gates) { mm.fillStyle = g.next ? '#38ff8a' : 'rgba(56,255,138,.35)'; mm.beginPath(); mm.arc(mmMap.X(g.x), mmMap.Y(g.z), g.next ? 9 : 6, 0, 6.3); mm.fill(); }
    for (const c of cars) {
      if (c.gone || c === me) continue;
      mm.fillStyle = c.css; mm.strokeStyle = 'rgba(0,0,0,.8)'; mm.lineWidth = 2;
      mm.beginPath(); mm.arc(mmMap.X(c.x), mmMap.Y(c.z), 7, 0, 6.3); mm.fill(); mm.stroke();
    }
    if (me) {
      const x = mmMap.X(me.x), y = mmMap.Y(me.z);
      mm.fillStyle = '#fff'; mm.strokeStyle = '#ff2a1f'; mm.lineWidth = 5; mm.beginPath(); mm.arc(x, y, 10, 0, 6.3); mm.fill(); mm.stroke();
    }
  };

  H.dash = function (p) {
    txt(el.spd, String(Math.round(Math.abs(p.speed != null ? p.speed : p.v) * 3.6)));
    txt(el.gear, p.reverse ? 'R' : String(p.gear));
    const lit = Math.round(U.clamp((p.rpm - 0.56) / 0.43, 0, 1) * 15);
    if (el._lit !== lit) { el._lit = lit; for (let i = 0; i < 15; i++) el.ledList[i].className = i < lit ? (i < 5 ? 'g' : i < 10 ? 'r' : 'b') : ''; }
    const b = Math.round(p.brake * 20), t = Math.round(p.throttle * 20);
    if (el._b !== b) { el._b = b; el.brk.style.height = b * 5 + '%'; }
    if (el._th !== t) { el._th = t; el.thr.style.height = t * 5 + '%'; }
    cls(el.drs, 'on', p.drsOn); cls(el.drs, 'zone', p.inZone && p.drsOK && !p.drsOn);
    const e = Math.round(p.battery * 50);
    if (el._e !== e) { el._e = e; el.ersI.style.width = e * 2 + '%'; }
    cls(el.ers, 'use', p.boost);
    const sf = U.smooth(55, 95, Math.abs(p.v)) * 0.9;
    if (Math.abs((el._sf || 0) - sf) > 0.03) { el._sf = sf; el.speedFx.style.opacity = sf.toFixed(2); }
  };

  /* rows: [{pos, code, css, gap, me, out, fl}] */
  H.tower = function (rows, head, sub) {
    txt(el.lapNo, head); txt(el.towerSub, sub || '');
    const rowH = window.innerHeight < 560 ? 17 : 21, room = Math.max(4, Math.floor((window.innerHeight - 260 - (window.innerWidth < 560 ? 0 : 0)) / rowH));
    let list = rows;
    if (rows.length > room) {
      const mi = Math.max(0, rows.findIndex((r) => r.me)), n = room - 4;
      let a = Math.max(3, mi - Math.floor(n / 2)), b = Math.min(rows.length, a + n);
      a = Math.max(3, b - n);
      list = rows.slice(0, 3).concat(a > 3 ? [null] : [], rows.slice(a, b));
    }
    let h = '';
    for (const r of list) {
      if (!r) { h += '<div class="sep"></div>'; continue; }
      h += '<div class="row' + (r.me ? ' me' : '') + (r.out ? ' out' : '') + (r.fl ? ' fl' : '') + '"><i>' + r.pos + '</i><u style="background:' + r.css + '"></u><b>' + r.code + '</b><span>' + r.gap + '</span></div>';
    }
    if (h !== lastTower) { lastTower = h; el.towerRows.innerHTML = h; }
  };
  H.timing = function (cur, last, best, delta, invalid) {
    txt(el.tCur, U.fmtTime(cur)); txt(el.tLast, U.fmtTime(last)); txt(el.tBest, U.fmtTime(best));
    txt(el.delta, delta == null ? '' : U.fmtDelta(delta));
    cls(el.delta, 'good', delta != null && delta < 0); cls(el.delta, 'bad', delta != null && delta > 0);
    show(el.invalid, !!invalid);
  };
  H.sectors = function (st) { for (let i = 0; i < 3; i++) { if (el.secList[i]._s !== st[i]) { el.secList[i]._s = st[i]; el.secList[i].className = st[i] || ''; } } };
  H.status = function (pos, total, wear, dmg, wet, rain) {
    txt(el.posNo, String(pos)); txt(el.posOf, total > 1 ? '/' + total : '');
    const w = Math.round(wear * 10);
    if (el._w !== w) { el._w = w; const c = wear < 0.35 ? '#2fe06d' : wear < 0.65 ? '#ffd23f' : '#ff5c52'; for (const t of el.tyList) t.style.background = c; }
    const d = Math.round(dmg * 10);
    if (el._d !== d) { el._d = d; el.carBody.style.background = dmg < 0.05 ? '#8b95a3' : dmg < 0.4 ? '#ffd23f' : '#ff5c52'; }
    const k = rain > 0.6 ? 3 : rain > 0.05 ? 2 : wet > 0.15 ? 1 : 0;
    if (el._k !== k) { el._k = k; txt(el.wxIcon, ['☀', '💧', '🌧', '⛈'][k]); txt(el.wxTxt, ['TROCKEN', 'FEUCHT', 'REGEN', 'STARKREGEN'][k]); }
  };
  H.layout = function (o) { show(el.tower, o.tower); show(el.timing, o.timing); show(el.posBig, o.pos); show(el.dash, o.dash !== false); };
  H.lights = function (k) { show(el.lights, k >= 0); for (let i = 0; i < 5; i++) cls(el.lightList[i], 'on', i < k); };
  H.banner = function (text, c, dur) {
    el.banner.className = c || ''; el.banner._chidden = false; el.banner.textContent = text; bannerT = dur || 2.4;
    el.banner.style.animation = 'none'; void el.banner.offsetWidth; el.banner.style.animation = '';
  };
  H.radio = function (text, dur) { txt(el.radioTxt, text); el.radio._chidden = true; show(el.radio, true); el.radio.style.animation = 'none'; void el.radio.offsetWidth; el.radio.style.animation = ''; radioT = dur || 4.6; };
  H.coach = function (html) { if (el.coach._h !== html) { el.coach._h = html; if (html) el.coach.innerHTML = html; show(el.coach, !!html); } };
  H.big = function (label, value, warn) { show(el.bigMsg, label != null); if (label != null) { txt(el.bigLbl, label); txt(el.bigVal, value); cls(el.bigMsg, 'warn', warn); } };
  H.wrong = (on) => show(el.wrong, on);
  H.brake = (on) => show(el.brakeHint, on);
  H.flash = function (a) { el.flash.style.opacity = a > 0.01 ? a.toFixed(2) : '0'; };
  H.tick = function (dt) {
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) show(el.banner, false); }
    if (radioT > 0) { radioT -= dt; if (radioT <= 0) show(el.radio, false); }
  };
  H.reset = function () {
    bannerT = radioT = 0; lastTower = '';
    for (const id of ['banner', 'radio', 'coach', 'wrong', 'brakeHint', 'bigMsg', 'lights', 'invalid']) show(el[id], false);
    el.coach._h = null; H.sectors(['', '', '']); H.flash(0);
  };
})();
