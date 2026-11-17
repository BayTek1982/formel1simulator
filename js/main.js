/* APEX GP – Spielablauf, Menü, Kamera, Eingabe */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U, S = F1.Sim, H = F1.HUD, A = F1.Audio;
  const $ = (id) => document.getElementById(id);

  const MODES = {
    gp: { name: 'Grand Prix', icon: '🏁', desc: 'Rennen über mehrere Runden gegen bis zu 19 Gegner.', ai: true },
    champ: { name: 'Meisterschaft', icon: '🏆', desc: 'Alle vier Strecken, Punkte wie bei den Profis.', ai: true },
    ko: { name: 'Knockout', icon: '💥', desc: 'Alle 25 Sekunden fliegt der Letzte raus.', ai: true },
    chase: { name: 'Aufholjagd', icon: '🚀', desc: 'Start vom letzten Platz – 3 Runden bis aufs Podium.', ai: true },
    tt: { name: 'Zeitfahren', icon: '⏱', desc: 'Allein gegen die Uhr – und gegen deinen Geist.', ai: false },
    cp: { name: 'Zeitjagd', icon: '🎯', desc: 'Jedes Tor schenkt Sekunden. Wie weit kommst du?', ai: false },
    school: { name: 'Fahrschule', icon: '🎓', desc: 'Dein Renningenieur erklärt Linie, Bremsen und Technik.', ai: false },
    free: { name: 'Freies Fahren', icon: '🏎', desc: 'Ohne Druck üben und alles ausprobieren.', ai: false },
  };
  const DIFFS = {
    rookie: { name: 'ROOKIE', note: '<b>Rookie:</b> gemütliche Gegner, alle Fahrhilfen, dazu Brems- und Lenkhilfe. Ideal zum Einstieg.', ai: [0.52, 0.64], pow: 0.86, rubber: 0.06, grip: 1.1, assist: 'voll', line: 'voll', autoBrake: 'an', steerHelp: 'an', damage: 'aus', react: [0.3, 0.6], cp: [46, 11] },
    amateur: { name: 'AMATEUR', note: '<b>Amateur:</b> faire Gegner, Traktionskontrolle und ABS helfen, die Ideallinie ist sichtbar.', ai: [0.7, 0.8], pow: 0.93, rubber: 0.03, grip: 1.05, assist: 'voll', line: 'voll', autoBrake: 'aus', steerHelp: 'aus', damage: 'aus', react: [0.28, 0.55], cp: [38, 10] },
    profi: { name: 'PROFI', note: '<b>Profi:</b> schnelle Gegner, weniger Hilfen, Linie nur vor Kurven, Schäden möglich.', ai: [0.83, 0.92], pow: 0.98, rubber: 0, grip: 1, assist: 'mittel', line: 'kurven', autoBrake: 'aus', steerHelp: 'aus', damage: 'an', react: [0.2, 0.42], cp: [32, 9] },
    legende: { name: 'LEGENDE', note: '<b>Legende:</b> Gegner am Limit, keine Hilfen, keine Linie, volle Schäden. Nur für Könner.', ai: [0.93, 1.0], pow: 1.0, rubber: 0, grip: 1, assist: 'aus', line: 'aus', autoBrake: 'aus', steerHelp: 'aus', damage: 'an', react: [0.14, 0.3], cp: [28, 8] },
  };
  const ASSIST = { voll: { tc: 1, abs: 1, over: 0.94, align: 5 }, mittel: { tc: 0.65, abs: 0.6, over: 1.1, align: 2.6 }, aus: { tc: 0, abs: 0, over: 1.35, align: 1.2 } };
  const QUAL = {
    hoch: { pr: 1.6, shadows: true, shadowSize: 2048, trees: 1, particles: 800, rain: 1500, terrainStep: 14 },
    mittel: { pr: 1.2, shadows: true, shadowSize: 1024, trees: 0.55, particles: 500, rain: 900, terrainStep: 17 },
    niedrig: { pr: 1, shadows: false, shadowSize: 512, trees: 0.25, particles: 250, rain: 500, terrainStep: 22 },
  };
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const HELMETS = [0xffd400, 0xffffff, 0xff2a1f, 0x18e0c8, 0x2f6bff, 0xff6fa8, 0x15161a];
  const CAMS = ['VERFOLGER', 'VERFOLGER WEIT', 'TV-ONBOARD', 'COCKPIT', 'NASE', 'VOGELPERSPEKTIVE', 'TV-KAMERA'];
  const WX = { clear: '☀ Sonnig', cloudy: '☁ Bewölkt', rain: '🌧 Regen', storm: '⛈ Gewitter', mixed: '🌦 Wechselhaft' };
  const TIMES = { day: 'Tag', dusk: 'Abend', night: 'Nacht' };

  const DEF = { mode: 'gp', track: 'monteverde', diff: 'amateur', team: 'falcone', helmet: 0xffd400, name: '', laps: 5, opp: 13, grid: 'mid', weather: 'clear', time: 'day',
    assist: 'voll', line: 'voll', autoBrake: 'aus', steerHelp: 'aus', damage: 'aus', quality: 'hoch', cam: 0 };
  const cfg = Object.assign({}, DEF, U.store.get('cfg', {}));
  if (!MODES[cfg.mode]) cfg.mode = DEF.mode; if (!DIFFS[cfg.diff]) cfg.diff = DEF.diff; if (!QUAL[cfg.quality]) cfg.quality = DEF.quality;
  if (!F1.Tracks.DEFS.some((d) => d.id === cfg.track)) cfg.track = DEF.track;
  if (!F1.TEAMS.some((t) => t.id === cfg.team)) cfg.team = DEF.team;
  const save = () => U.store.set('cfg', cfg);

  let renderer, scene, camera, fx, world = null, track = null, worldKey = '', lineMesh = null, lineGeo = null;
  let cars = [], player = null, ghostVis = null, showVis = null;
  let state = 'menu', sess = null, paused = false, tGame = 0, last = 0, menuTab = 'mode', champ = null, pProf = null, pProfWet = -1;
  const G = { track: null, assist: Object.assign({ grip: 1 }, ASSIST.voll), wet: 0, playerPow: 1, drsFree: false, drsRace: false, onImpact: null, onShift: null };
  const P = { x: 0, y: 0, z: 0, i: 0 };
  const perf = { acc: 0, n: 0, scale: 1, cool: 0 };

  // =================== Aufbau ===================
  function init() {
    const canvas = $('gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    U.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, 1, 0.14, 9000);
    scene.add(camera);
    fx = F1.FX.create(scene, QUAL[cfg.quality]);
    // Ideallinie
    const NS = 96;
    lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NS * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const li = []; for (let i = 0; i < NS - 1; i++) { const a = i * 2; li.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    lineGeo.setIndex(li);
    lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, side: THREE.DoubleSide }));
    lineMesh.frustumCulled = false; lineMesh.visible = false; lineMesh.renderOrder = 2; scene.add(lineMesh);

    H.init();
    G.onImpact = onImpact; G.onShift = () => A.shift();
    buildMenu();
    resize(); window.addEventListener('resize', resize);
    bindInput();
    buildWorld(); setupAttract();
    $('loading').classList.add('hidden');
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUAL[cfg.quality].pr) * perf.scale);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const wKey = () => [cfg.track, cfg.time, cfg.weather, cfg.quality].join('|');
  function clearCars() {
    for (const c of cars) { scene.remove(c.vis.group); F1.Car.dispose(c.vis); }
    cars = []; player = null;
    if (ghostVis) { scene.remove(ghostVis.group); ghostVis = null; }
    if (showVis) { scene.remove(showVis.group); F1.Car.dispose(showVis); showVis = null; }
  }
  function buildWorld() {
    const q = QUAL[cfg.quality];
    clearCars();
    if (world) { scene.remove(world.group); world.dispose(); world = null; }
    track = F1.Tracks.get(cfg.track); G.track = track;
    renderer.shadowMap.enabled = q.shadows;
    world = F1.World.create(track, { time: cfg.time, weather: cfg.weather }, renderer, q);
    scene.add(world.group); scene.fog = world.fog; scene.environment = world.envRT ? world.envRT.texture : null;
    H.setTrack(track); fx.clear(); worldKey = wKey(); pProfWet = -1;
    G.wet = cfg.weather === 'rain' ? 0.85 : cfg.weather === 'storm' ? 1 : 0;
    world.setWet(G.wet); fx.setRain(cfg.weather === 'rain' ? 0.7 : cfg.weather === 'storm' ? 1 : 0);
  }

  function roster() {
    const list = [];
    for (const t of F1.TEAMS) t.drivers.forEach((d, i) => list.push({ name: d[0], code: d[1], num: d[2], team: t, rating: 0.55 * t.str + 0.45 * d[3], helmet: HELMETS[(d[2] + i) % HELMETS.length], second: i === 1 }));
    return list;
  }
  function makeCar(drv, isPlayer) {
    const c = S.newCar({ isPlayer, name: drv.name, code: drv.code, team: drv.team, num: drv.num, rating: drv.rating, css: F1.hex(drv.team.c1), lapIdx: -1 });
    c.vis = F1.Car.build({ team: drv.team, num: drv.num, helmet: drv.helmet, player: isPlayer });
    scene.add(c.vis.group);
    return c;
  }
  function setupAI(c, D) {
    const r01 = U.clamp((c.rating - 0.68) / 0.32, 0, 1);
    c.mu = U.lerp(D.ai[0], D.ai[1], r01) * (0.99 + Math.random() * 0.02);
    c.pow = D.pow * (0.975 + 0.025 * r01); c.aggr = 0.25 + Math.random() * 0.75;
    c.prof = aiProfile(c); c.profWet = G.wet; c.basePace = 1; c.pace = 1;
  }
  // Kurventempo hängt von der Stärke ab, geradeaus beschleunigen alle fast gleich gut
  function aiProfile(c) { const w = 1 - 0.3 * G.wet; return track.profile({ mu: c.mu * w, muAcc: (0.5 + 0.5 * c.mu) * w, pow: c.pow }); }
  const playerName = () => (cfg.name || '').trim() || 'DU';
  const playerCode = () => { const s = playerName().toUpperCase().replace(/[^A-ZÄÖÜ]/g, ''); return (s || 'DU').slice(0, 3); };

  // Vorschau im Menü: einige KI-Autos drehen ihre Runden
  function setupAttract() {
    if (worldKey !== wKey()) buildWorld(); else clearCars();
    state = 'menu'; sess = null; lineMesh.visible = false;
    G.drsRace = true; G.drsFree = false;
    const all = roster().filter((d) => !d.second).slice(0, 8), D = DIFFS.profi;
    all.forEach((d, k) => {
      const c = makeCar(d, false); setupAI(c, D);
      const s = (k * track.L) / 8 + 40; S.put(c, track, s, track.at(track.ro, s), s);
      c.lat = 0; c.latT = 0; c.v = track.at(c.prof, s) * 0.9; c.gear = 5;
      cars.push(c);
    });
    const team = F1.TEAMS.find((t) => t.id === cfg.team);
    showVis = F1.Car.build({ team, num: 7, helmet: cfg.helmet, player: false });
    const sd = track.turnSign, s0 = -34;
    track.pos(s0, sd * (track.hw + 2.6), P);
    F1.Car.update(showVis, { x: P.x, y: P.y, z: P.z, yaw: track.headingAt(s0), v: 0 }, 0);
    const hi = Math.floor(U.mod(s0, track.L) / track.ds) % track.n;
    showVis.pos = { x: P.x, y: P.y, z: P.z, base: Math.atan2(-sd * track.nx[hi], -sd * track.nz[hi]) };
    scene.add(showVis.group);
    cam.tv = -1; cam.focus = 0; cam.focusT = 0;
  }

  // =================== Session ===================
  function startSession() {
    A.init(); save();
    if (cam.forced) { cam.mode = camPrev; cam.forced = false; }
    if (worldKey !== wKey()) buildWorld(); else clearCars();
    fx.clear(); H.reset();
    const D = DIFFS[cfg.diff], M = MODES[cfg.mode], mode = cfg.mode, L = track.L;
    G.assist = Object.assign({}, ASSIST[cfg.assist], { grip: D.grip }); G.playerPow = 1;
    G.wet = cfg.weather === 'rain' ? 0.85 : cfg.weather === 'storm' ? 1 : 0;
    sess = { mode, D, t: 0, raceT: 0, go: false, phase: 'intro', phT: 0, laps: 0, order: [], fl: null, leaderDone: false, outN: 0, radioCool: 0, lastPos: 0, posT: 0,
      offT: 0, offN: 0, wrongT: 0, sec: -1, secStart: 0, secState: ['', '', ''], bestSec: [null, null, null], trace: [], bestTrace: null, towerT: 0, mmT: 0,
      rain: cfg.weather === 'rain' ? 0.7 : cfg.weather === 'storm' ? 1 : 0, wxT: 20 + Math.random() * 25, wxOn: false, boltT: 4 + Math.random() * 6, fwT: 0, fwN: 0, said: {}, jump: false, resetCool: 0, hint: 0 };
    if (mode === 'gp' || mode === 'champ') sess.laps = cfg.laps; else if (mode === 'chase') sess.laps = 3; else if (mode === 'school') sess.laps = 2;
    G.drsFree = !M.ai; G.drsRace = false;

    const team = F1.TEAMS.find((t) => t.id === cfg.team);
    player = makeCar({ name: playerName(), code: playerCode(), num: 7, team, rating: 1, helmet: cfg.helmet }, true);
    let field = [];
    if (M.ai) {
      let picks;
      if (mode === 'champ' && champ && champ.field) picks = champ.field;
      else {
        const others = roster().filter((d) => !(d.team === team && d.second));
        for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = others[i]; others[i] = others[j]; others[j] = t; }
        const n = mode === 'ko' ? Math.min(cfg.opp, 11) : mode === 'chase' ? 19 : cfg.opp;
        picks = others.slice(0, n);
        if (mode === 'champ' && champ) champ.field = picks;
      }
      field = picks.map((d) => { const c = makeCar(d, false); setupAI(c, D); c.q = c.rating + Math.random() * 0.1; return c; });
      field.sort((a, b) => b.q - a.q);
      let slot = cfg.grid === 'front' ? 0 : cfg.grid === 'mid' ? Math.floor(field.length / 2) : field.length;
      if (mode === 'chase') slot = field.length;
      if (mode === 'champ' && champ && champ.lastPos) slot = Math.min(field.length, champ.lastPos - 1);
      cars = field.slice(); cars.splice(slot, 0, player);
      cars.forEach((c, k) => S.toGrid(c, track, k));
      sess.lastPos = slot + 1;
    } else {
      cars = [player];
      if (mode === 'tt') { const s = -240; S.put(player, track, s, track.at(track.ro, s), s); }
      else S.toGrid(player, track, 0);
    }
    for (const c of cars) { c.lapIdx = Math.floor(c.dist / L); c.lapStart = 0; }
    player.gridDist = player.dist; sess.startPos = cars.indexOf(player) + 1; player.pos = sess.startPos;
    cam.yaw = player.yaw; cam.tgtInit = false;
    if (mode === 'ko') sess.ko = { next: 32, every: 25 };
    if (mode === 'cp') {
      sess.cp = { n: 0, left: D.cp[0], bonus: D.cp[1], list: [] };
      for (let k = 0; k < 6; k++) { const s = ((k + 1) * L) / 6 % L; track.pos(s, 0, P); sess.cp.list.push({ x: P.x, z: P.z, next: false }); }
      if (!world.gates.length) world.makeGates(sess.cp.list.map((g, k) => ((k + 1) * L) / 6 % L));
    }
    for (const m of world.gates) m.visible = false;
    if (mode === 'school') sess.school = { step: 0, stepT: 0, clean: true };
    if (mode === 'tt') {
      const gd = U.store.get('ghost.' + track.id, null);
      if (gd && gd.d && gd.d.length > 8) { sess.ghost = gd; ghostVis = F1.Car.build({ ghost: true }); ghostVis.group.visible = false; scene.add(ghostVis.group); }
      sess.rec = []; sess.recT = 0;
      player.best = U.store.get('best.' + track.id, null);
    }
    world.setWet(G.wet); fx.setRain(sess.rain); world.setStartLights(0);
    refreshPProf(true);
    state = 'run'; paused = false;
    $('app').classList.remove('menu'); $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause').classList.add('hidden');
    H.layout({ tower: M.ai, timing: mode !== 'cp', pos: M.ai });
    H.lights(-1); lineMesh.visible = false;
    $('touch').classList.toggle('hidden', !touchDevice); $('app').classList.toggle('touch', touchDevice);
    const intro = { gp: 'GRAND PRIX · ' + sess.laps + ' RUNDEN', champ: 'MEISTERSCHAFT · RENNEN ' + ((champ ? champ.round : 0) + 1) + '/4', ko: 'KNOCKOUT · DER LETZTE FLIEGT', chase: 'AUFHOLJAGD · 3 RUNDEN', tt: 'ZEITFAHREN', cp: 'ZEITJAGD', school: 'FAHRSCHULE', free: 'FREIES FAHREN' }[mode];
    H.banner(intro, 'dark', 3);
  }

  function refreshPProf(force) {
    if (!force && Math.abs(G.wet - pProfWet) < 0.05) return;
    pProfWet = G.wet;
    pProf = track.profile({ mu: G.assist.grip * (cfg.autoBrake === 'an' ? 0.7 : 0.9) * (1 - 0.3 * G.wet), pow: 1 });
    for (const c of cars) if (c.prof && !c.isPlayer && Math.abs(c.profWet - G.wet) >= 0.05) { c.prof = aiProfile(c); c.profWet = G.wet; }
  }

  function radio(text, key) {
    if (!sess) return;
    if (key) { if (sess.said[key]) return; sess.said[key] = true; }
    if (sess.radioCool > 0 && !key) return;
    sess.radioCool = 5; H.radio(text); A.radio();
  }

  function onImpact(type, strength, x, z) {
    if (!player || !sess) return;
    const k = U.clamp(strength / 22, 0.1, 1);
    A.thump(k); cam.shake = Math.max(cam.shake, k * 0.9);
    fx.spark(x, player.y + 0.4, z, player.vx * 0.3, 2, player.vz * 0.3, Math.round(6 + k * 26));
    if (cfg.damage === 'an') {
      const add = Math.max(0, strength - (type === 'wall' ? 8 : 6)) * (sess.D === DIFFS.legende ? 0.03 : 0.018);
      if (add > 0) {
        player.damage = Math.min(1, player.damage + add);
        if (player.damage > 0.25) radio('Frontflügel beschädigt – das kostet Abtrieb. Fahr vorsichtig weiter.', 'dmg');
        if (player.damage >= 1 && sess.phase === 'race' && MODES[sess.mode].ai) { player.out = true; player.outOrder = -1; H.banner('TOTALSCHADEN', '', 3); finish('dnf'); }
      }
    }
  }

  // ---------- Wetter ----------
  function weather(dt) {
    const w = cfg.weather;
    if (w === 'mixed') {
      sess.wxT -= dt;
      if (sess.wxT <= 0) {
        sess.wxOn = !sess.wxOn; sess.wxT = sess.wxOn ? 45 + Math.random() * 40 : 40 + Math.random() * 40;
        radio(sess.wxOn ? 'Es fängt an zu regnen! Die Strecke wird rutschig – früher bremsen.' : 'Der Regen lässt nach. Die Strecke trocknet langsam ab.');
        H.banner(sess.wxOn ? 'REGEN SETZT EIN' : 'REGEN LÄSST NACH', 'dark', 2.6);
      }
      sess.rain = U.damp(sess.rain, sess.wxOn ? 0.8 : 0, 0.25, dt);
      G.wet = U.clamp(G.wet + dt * (sess.rain > 0.1 ? 0.035 * sess.rain : -0.012), 0, 0.9);
      world.setRain(sess.rain); fx.setRain(sess.rain);
    }
    if (w === 'storm') {
      sess.boltT -= dt;
      if (sess.boltT <= 0) { sess.boltT = 6 + Math.random() * 12; world.lightning(); setTimeout(() => A.thunder(), 500 + Math.random() * 1500); }
    }
    world.setWet(G.wet); refreshPProf(false);
  }

  // ---------- Eingabe → Auto ----------
  const pin = { steer: 0, throttle: 0, brake: 0, boost: false };
  function playerInput() {
    pin.steer = inp.steer; pin.throttle = inp.throttle; pin.brake = inp.brake; pin.boost = inp.boost;
    if (cfg.steerHelp === 'an') { const a = S.autoSteer(player, G), k = 0.55 * (1 - 0.6 * Math.abs(inp.steer)); pin.steer = U.clamp(inp.steer + (a - inp.steer) * k, -1, 1); }
    const u = player.v, vp = pProf[player.idx], ahead = pProf[(player.idx + Math.round(u * 0.3 / track.ds)) % track.n];
    sess.tooFast = u > ahead + 3 && player.surf <= 1;
    if (cfg.autoBrake === 'an' && u > vp * 1.01 + 1 && player.surf <= 1) { pin.brake = Math.max(pin.brake, U.clamp((u - vp) / 4, 0.35, 1)); pin.throttle = 0; }
    if (!sess.go) {
      // Frühstart ist nur auf Profi und Legende möglich
      if (sess.D.assist === 'voll' || !MODES[sess.mode].ai || sess.phase === 'intro') pin.throttle = 0;
      pin.boost = false;
    }
  }
  function resetPlayer() {
    if (!player || sess.resetCool > 0 || !sess.go || sess.phase !== 'race') return;
    const s = player.s, keep = player.dist;
    S.put(player, track, s, U.clamp(player.d, -track.hw + 2, track.hw - 2), keep);
    cam.yaw = player.yaw; sess.resetCool = 1.5; fx.clear();
    H.banner('ZURÜCK AUF DER STRECKE', 'dark', 1.4);
  }

  // =================== Ablauf pro Bild ===================
  function updateSession(dt) {
    const M = MODES[sess.mode], L = track.L;
    sess.t += dt; sess.phT += dt; sess.radioCool -= dt; sess.resetCool -= dt;
    weather(dt);
    // --- Phasen ---
    if (sess.phase === 'intro' && sess.phT > 3.4) {
      if (M.ai || sess.mode === 'cp') { sess.phase = 'lights'; sess.phT = 0; sess.lightN = 0; sess.hold = 5 * 0.9 + 0.7 + Math.random() * 1.6; }
      else { sess.phase = 'race'; sess.go = true; H.banner('LOS!', 'grn', 1.4); A.beep(1320, 0.4, 0.2); }
    }
    if (sess.phase === 'lights') {
      const n = Math.min(5, Math.floor(sess.phT / 0.9));
      if (n !== sess.lightN) { sess.lightN = n; H.lights(n); world.setStartLights(n); A.beep(660, 0.14, 0.2); }
      else if (sess.lightN === 0) H.lights(0);
      if (!sess.jump && Math.abs(player.dist - player.gridDist) > 0.8) { sess.jump = true; player.pen += 5; H.banner('FRÜHSTART! +5 SEKUNDEN', '', 3); A.chime(false); }
      if (sess.phT > sess.hold) {
        sess.phase = 'race'; sess.go = true; sess.phT = 0; H.lights(0); world.setStartLights(0); A.beep(1320, 0.5, 0.22); G.drsRace = false;
        setTimeout(() => H.lights(-1), 700);
        for (const c of cars) if (!c.isPlayer) c.wait = U.lerp(sess.D.react[0], sess.D.react[1], Math.random());
      }
    }
    // --- Spieler ---
    if (player.isPlayer) {
      playerInput();
      const sub = 4, h = dt / sub;
      for (let i = 0; i < sub; i++) S.stepPlayer(player, pin, h, G);
      S.playerFrame(player, pin, dt, G);
    }
    // --- KI ---
    S.planAI(cars, G, dt);
    for (const c of cars) {
      if (c.isPlayer || c.gone) continue;
      if (sess.go) {
        if (sess.D.rubber && !c.finished && player.isPlayer) { const gap = c.dist - player.dist; c.pace = U.damp(c.pace, c.basePace * (1 - sess.D.rubber * U.clamp(gap / 220, -0.7, 1)), 0.6, dt); }
        S.stepAI(c, dt, G);
        if (c.out && c.v < 1.5) { c.goneT = (c.goneT || 0) + dt; if (c.goneT > 2.5) { c.gone = true; c.vis.group.visible = false; } }
      } else { S.placeAI(c, track); }
    }
    S.separateAI(cars, G);
    if (player.isPlayer) S.collide(player, cars, G);
    if (sess.go) { sess.raceT += dt; raceLogic(dt); }
    if (sess.phase === 'race') modeLogic(dt);
    if (sess.phase === 'finish') {
      if (sess.fireworks && sess.fwN < 34) { sess.fwT -= dt; if (sess.fwT <= 0) { sess.fwT = 0.28 + Math.random() * 0.3; sess.fwN++; firework(); } }
      if (sess.phT > 3.2 && !sess.shown) { sess.shown = true; showResults(); }
    }
    updateHud(dt);
  }

  function firework() {
    const s = Math.random() * 220 - 60; track.pos(s, (Math.random() - 0.5) * 70, P);
    const cols = [0xff3b30, 0xffd23f, 0x4d8dff, 0x2fe06d, 0xff6fa8, 0xffffff, player.team.c1, player.team.c2];
    fx.burst(P.x, P.y + 28 + Math.random() * 40, P.z, cols[(Math.random() * cols.length) | 0], 70, 26); A.firework();
  }

  function rankKey(c) {
    if (c.out) return -1e7 + (c.outOrder || 0);
    if (c.finished) return c.lapsDone * track.L + (1 - c.finishT / 1e5);
    return c.dist;
  }
  function raceLogic(dt) {
    const L = track.L, T = sess.raceT;
    for (const c of cars) {
      if (c.gone) continue;
      const li = Math.floor(c.dist / L);
      if (li > c.lapIdx) {
        const over = (c.dist - li * L) / Math.max(5, Math.abs(c.v)), tC = T - over;
        if (c.lapIdx >= 0) {
          const lt = tC - c.lapStart; c.last = lt; c.laps.push(lt);
          if (!c.lapBad || MODES[sess.mode].ai) {
            if (c.best == null || lt < c.best) { c.best = lt; if (c === player) onPlayerBest(lt); }
            if (MODES[sess.mode].ai && (!sess.fl || lt < sess.fl.t)) { sess.fl = { t: lt, car: c }; if (c === player && c.laps.length > 1) { H.banner('SCHNELLSTE RUNDE  ' + U.fmtTime(lt), 'pur', 3); A.chime(true); } }
          }
        }
        c.lapStart = tC; c.lapIdx = li;
        if (c === player) onPlayerLine(li);
        c.lapBad = false;
        if (sess.laps && !c.finished && !c.out && sess.phase === 'race' && (li >= sess.laps || sess.leaderDone)) {
          c.finished = true; c.finishT = tC + c.pen; c.lapsDone = li;
          if (!sess.leaderDone) sess.leaderDone = true;
          if (c === player) finish('flag'); else c.basePace = c.pace = 0.62;
        }
      }
    }
    sess.order = cars.slice().sort((a, b) => rankKey(b) - rankKey(a));
    sess.order.forEach((c, i) => (c.pos = i + 1));
    if (sess.laps && sess.lapsShown !== player.lapIdx) sess.lapsShown = player.lapIdx;
    // DRS ab Runde 2
    if (!G.drsRace && MODES[sess.mode].ai && sess.order[0].lapIdx >= 1) { G.drsRace = true; radio('DRS ist freigegeben. Unter einer Sekunde Abstand klappt der Flügel auf der Geraden auf.', 'drs'); }
  }

  function onPlayerBest(lt) {
    if (sess.mode === 'tt' || sess.mode === 'free' || sess.mode === 'school') {
      const old = U.store.get('best.' + track.id, null);
      if (G.wet < 0.2 && (old == null || lt < old)) { U.store.set('best.' + track.id, lt); if (sess.mode === 'tt' && sess.recLap) { const gd = { t: lt, d: sess.recLap }; U.store.set('ghost.' + track.id, gd); sess.ghost = gd; if (!ghostVis) { ghostVis = F1.Car.build({ ghost: true }); scene.add(ghostVis.group); } } }
      if (player.laps.length > 1 || sess.mode !== 'tt') { H.banner('NEUE BESTZEIT  ' + U.fmtTime(lt), 'pur', 3); A.chime(true); }
    }
    sess.bestTrace = sess.trace.slice();
  }
  function onPlayerLine(li) {
    sess.recLap = sess.rec; sess.rec = []; sess.recT = 0;       // Aufzeichnung der eben beendeten Runde
    if (player.lapBad && li > 0 && sess.mode !== 'gp') H.banner('RUNDE UNGÜLTIG', 'dark', 2);
    sess.trace = []; sess.sec = 0; sess.secStart = sess.raceT; sess.secState = ['now', '', ''];
    if (sess.laps && li === sess.laps - 1 && MODES[sess.mode].ai) { H.banner('LETZTE RUNDE', 'yel', 2.6); radio('Letzte Runde! Gib alles, bring es nach Hause.'); }
    if (sess.mode === 'school' && li === 1) { sess.school.clean = true; H.banner('GUT! JETZT EINE SAUBERE RUNDE', 'grn', 3); }
    if (sess.mode === 'school' && li >= 2) finish('flag');
  }

  function modeLogic(dt) {
    const L = track.L, p = player, hw = track.hw;
    // Sektoren & Delta
    if (p.lapIdx >= 0) {
      const lapT = sess.raceT - p.lapStart, fr = (p.dist - p.lapIdx * L) / L, sec = Math.min(2, Math.floor(fr * 3));
      if (sec > sess.sec && sess.sec >= 0) {
        const st = sess.raceT - sess.secStart, b = sess.bestSec[sess.sec];
        sess.secState[sess.sec] = b == null || st < b ? 'p' : st < b + 0.35 ? 'g' : 'y';
        if (b == null || st < b) sess.bestSec[sess.sec] = st;
        sess.sec = sec; sess.secStart = sess.raceT; sess.secState[sec] = 'now';
      }
      const k = Math.floor((p.dist - p.lapIdx * L) / 25);
      if (k >= 0 && sess.trace[k] == null) sess.trace[k] = lapT;
      sess.delta = sess.bestTrace && sess.bestTrace[k] != null ? lapT - sess.bestTrace[k] : null;
      if (sess.mode === 'tt') {
        sess.recT -= dt;
        if (sess.recT <= 0) { sess.recT += 0.1; sess.rec.push(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.z * 100) / 100, Math.round(p.yaw * 1000) / 1000); }
      }
    }
    // Streckenbegrenzung
    const off = Math.abs(p.d) > hw + 2.4 && p.surf >= 2 && p.surf !== 4;
    if (off) {
      sess.offT += dt;
      if (sess.offT > 0.3 && !sess.offFlag) {
        sess.offFlag = true; p.lapBad = true;
        if (sess.school) sess.school.clean = false;
        if (MODES[sess.mode].ai && sess.D !== DIFFS.rookie) {
          sess.offN++;
          if (sess.offN >= 3) { sess.offN = 0; p.pen += 5; H.banner('TRACK LIMITS: +5 SEKUNDEN', '', 3); A.chime(false); }
          else radio('Track Limits! Bleib auf der Strecke – Verwarnung ' + sess.offN + ' von 2.');
        }
      }
    } else { sess.offT = 0; sess.offFlag = false; }
    // Falschfahrer
    const wrong = Math.cos(p.yaw - track.hd[p.idx]) < -0.35 && p.v > 4;
    sess.wrongT = wrong ? sess.wrongT + dt : 0;
    H.wrong(sess.wrongT > 1.2);
    // Positionsfunk
    if (MODES[sess.mode].ai && sess.raceT > 9) {
      sess.posT -= dt;
      if (p.pos !== sess.lastPos && sess.posT <= 0) {
        if (p.pos < sess.lastPos) radio(['P' + p.pos + '! Starkes Manöver.', 'Platz ' + p.pos + '. Weiter so, der Nächste ist in Reichweite.', 'Sauber überholt – P' + p.pos + '.'][(Math.random() * 3) | 0]);
        else radio(['Position verloren, P' + p.pos + '. Bleib dran!', 'P' + p.pos + '. Konter auf der nächsten Geraden – nutze den Boost.'][(Math.random() * 2) | 0]);
        sess.lastPos = p.pos; sess.posT = 6;
      } else if (sess.posT <= 0) sess.lastPos = p.pos;
    }
    if (p.battery > 0.98 && sess.raceT > 25) radio('Batterie ist voll – halte die Leertaste für den ERS-Boost!', 'ers');
    // --- Knockout ---
    if (sess.ko) {
      const alive = cars.filter((c) => !c.out);
      const left = sess.ko.next - sess.raceT;
      H.big('NÄCHSTER K.O. IN', Math.max(0, Math.ceil(left)) + ' s', left < 6 && p.pos === alive.length);
      if (left <= 0) {
        sess.ko.next += sess.ko.every;
        const lastCar = sess.order.filter((c) => !c.out).pop();
        lastCar.out = true; lastCar.outOrder = sess.outN++;
        fx.smoke(lastCar.x, lastCar.y + 0.6, lastCar.z, 0, 2, 0, 0.3, 0.6, 3, 1.6);
        if (lastCar === p) { H.banner('DU BIST RAUS', '', 3); A.chime(false); finish('ko'); }
        else { H.banner(lastCar.code + ' IST RAUS', 'dark', 2.2); A.beep(440, 0.25, 0.15, 'square'); if (alive.length - 1 === 1) { finish('win'); } }
      }
    }
    // --- Zeitjagd ---
    if (sess.cp) {
      const cp = sess.cp;
      cp.left -= dt;
      if (p.dist >= ((cp.n + 1) * L) / 6) {
        cp.n++; cp.left += cp.bonus; H.banner('+' + cp.bonus.toFixed(0) + ' SEKUNDEN', 'grn', 1.3); A.chime(true);
        cp.bonus = Math.max(4.5, cp.bonus * 0.955);
      }
      world.gates.forEach((m, k) => { const nx = cp.n % 6, on = k === nx || k === (nx + 1) % 6; m.visible = on; if (on) { m.material.opacity = k === nx ? 0.9 : 0.3; m.material.color.setHex(k === nx ? 0x38ff8a : 0x9fffc8); } cp.list[k].next = k === nx; });
      H.big('ZEIT · TOR ' + (cp.n + 1), Math.max(0, cp.left).toFixed(1) + ' s', cp.left < 6);
      if (cp.left <= 0) { H.banner('ZEIT ABGELAUFEN', '', 3); A.chime(false); finish('time'); }
    }
    // --- Fahrschule ---
    if (sess.school) {
      const sc = sess.school, steps = SCHOOL;
      sc.stepT += dt;
      if (sc.step < steps.length - 1 && steps[sc.step].ok(p, sc)) { sc.step++; sc.stepT = 0; A.chime(true); }
      H.coach(steps[sc.step].t);
    } else if (sess.resetCool < -6 && p.speed < 3 && sess.raceT > 6 && (p.surf >= 2 || sess.wrongT > 1)) H.coach('Steckst du fest? Drücke <b>R</b>, um zurück auf die Strecke zu kommen.');
    else if (!sess.school) H.coach(null);
    H.brake((sess.school || cfg.autoBrake === 'an' || sess.D === DIFFS.rookie) && sess.tooFast && p.brake < 0.3 && p.v > 25);
  }
  const SCHOOL = [
    { t: 'Willkommen in der Fahrschule! Gib Gas mit <b>↑</b> oder <b>W</b> und beschleunige auf über 150 km/h.', ok: (p) => p.v * 3.6 > 150 },
    { t: 'Die bunte Linie zeigt den schnellsten Weg: <b>Grün</b> = Vollgas, Gelb = vom Gas, Rot = bremsen mit <b>↓</b> oder <b>S</b>.', ok: (p, s) => s.stepT > 3 && p.brake > 0.5 && p.v > 20 },
    { t: 'Gut gebremst! Lenke zum inneren Randstein und gib am Kurvenausgang früh wieder Gas.', ok: (p, s) => s.stepT > 4 && p.throttle > 0.8 && p.v * 3.6 > 120 },
    { t: 'Die rot-weißen <b>Kerbs</b> darfst du mitnehmen. Gras und Kies bremsen stark – bleib auf dem Asphalt.', ok: (p, s) => s.stepT > 7 },
    { t: 'Auf langen Geraden klappt der Heckflügel (<b>DRS</b>) von selbst auf. Achte auf die grüne DRS-Anzeige unten.', ok: (p, s) => s.stepT > 3 && (p.drsOn || s.stepT > 25) },
    { t: 'Halte die <b>Leertaste</b> für den <b>ERS-Boost</b>: Extra-Leistung aus der Batterie. Beim Bremsen lädt sie wieder.', ok: (p, s) => p.boost || s.stepT > 20 },
    { t: 'Mit <b>C</b> wechselst du die Kamera – probier das Cockpit! Mit <b>R</b> kommst du nach einem Abflug zurück auf die Strecke.', ok: (p, s) => s.stepT > 8 },
    { t: 'Jetzt du: Fahre diese Runde zu Ende und danach <b>eine saubere Runde</b>, ohne die Strecke zu verlassen.', ok: () => false },
  ];

  function finish(why) {
    if (sess.phase === 'finish') return;
    sess.phase = 'finish'; sess.phT = 0; sess.why = why;
    const M = MODES[sess.mode];
    // Endwertung: wer noch unterwegs ist, wird bis zur Ziellinie hochgerechnet
    if (sess.laps && M.ai && why === 'flag') {
      for (const c of cars) {
        if (c.finished || c.out) continue;
        const lapsEst = Math.max(1, Math.floor(c.dist / track.L) + 1), vA = track.L / (c.best || track.refTime * 1.2);
        c.finished = true; c.estimated = true; c.lapsDone = lapsEst; c.finishT = sess.raceT + Math.max(0, lapsEst * track.L - c.dist) / vA + c.pen;
        c.basePace = c.pace = 0.62;
      }
    }
    sess.order = cars.slice().sort((a, b) => rankKey(b) - rankKey(a)); sess.order.forEach((c, i) => (c.pos = i + 1));
    const podium = M.ai && why !== 'dnf' && why !== 'ko' && player.pos <= 3;
    sess.fireworks = podium || why === 'win' || (sess.mode === 'school');
    if (why === 'flag' && M.ai) H.banner(player.pos === 1 ? 'SIEG!' : 'ZIEL – PLATZ ' + player.pos, player.pos <= 3 ? 'grn' : 'dark', 3.2);
    if (why === 'win') H.banner('SIEG! LETZTER ÜBERLEBENDER', 'grn', 3.2);
    if (sess.fireworks) A.cheer();
    // Auto an den Autopiloten übergeben
    player.isPlayer = false; player.mu = 0.7; player.pow = 0.9; player.prof = aiProfile(player); player.profWet = G.wet;
    player.basePace = player.pace = why === 'flag' || why === 'win' ? 0.62 : 0.0; if (why === 'dnf' || why === 'ko' || why === 'time') player.out = true;
    player.lat = player.d - track.at(track.ro, player.s); player.latT = 0; player.latV = 0; player.v = Math.max(0, player.v); player.drsOn = false; player.boost = false;
    H.wrong(false); H.brake(false); H.coach(null); H.big(null); lineMesh.visible = false;
    if (!cam.forced) camPrev = cam.mode;
    cam.forced = true; cam.mode = 6; cam.tv = -1; cam.tgtInit = false;
  }
  let camPrev = 0;

  // =================== Ergebnis ===================
  function showResults() {
    const M = MODES[sess.mode], mode = sess.mode, p = player, why = sess.why, n = cars.length;
    const order = sess.order, leader = order[0];
    let title = '', lead = '', stars = -1, tip = '', html = '', next = 'NOCHMAL ▶';
    const gapTxt = (c) => {
      if (c.out) return why === 'dnf' && c === p ? 'Ausfall' : 'raus';
      if (!c.finished) return '–';
      if (c === leader) return U.fmtTime(c.finishT);
      if (c.lapsDone < leader.lapsDone) return '+' + (leader.lapsDone - c.lapsDone) + ' Rd.';
      return '+' + (c.finishT - leader.finishT).toFixed(3);
    };
    const table = () => {
      let h = '<table class="res"><tr><th>P</th><th>FAHRER</th><th>TEAM</th><th class="r">ZEIT / ABSTAND</th><th class="r">BESTE RUNDE</th></tr>';
      order.forEach((c, i) => {
        const fl = sess.fl && sess.fl.car === c;
        h += '<tr class="' + (c === p ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><u style="background:' + c.css + '"></u>' + U.esc(c.name) + '</td><td>' + U.esc(c.team.name) + '</td><td class="r">' + gapTxt(c) + (c.pen && c.finished ? ' <small>(+' + c.pen + ' s)</small>' : '') + '</td><td class="r' + (fl ? ' fl' : '') + '">' + (c.best ? U.fmtTime(c.best) : '–') + '</td></tr>';
      });
      return h + '</table>';
    };
    if (M.ai) {
      const pos = p.pos;
      if (mode === 'ko') {
        title = why === 'win' ? 'KNOCKOUT <span>GEWONNEN!</span>' : 'KNOCKOUT · <span>PLATZ ' + pos + '</span>';
        lead = why === 'win' ? 'Du hast als Letzter überlebt. Stark gefahren!' : 'Du bist als ' + (n - pos + 1) + '. Fahrer ausgeschieden – ' + (pos - 1) + ' waren noch im Rennen.';
        stars = why === 'win' ? 3 : pos <= 3 ? 2 : pos <= Math.ceil(n / 2) ? 1 : 0;
      } else if (why === 'dnf') { title = 'AUSFALL · <span>TOTALSCHADEN</span>'; lead = 'Das Auto ist zu stark beschädigt. Mit weniger Mauerkontakt kommst du ins Ziel.'; }
      else {
        title = pos === 1 ? '<span>SIEG!</span> PLATZ 1' : pos <= 3 ? '<span>PODIUM!</span> PLATZ ' + pos : 'ZIEL · <span>PLATZ ' + pos + '</span>';
        lead = 'Gestartet von Platz ' + sess.startPos + ', im Ziel auf Platz ' + pos + ' von ' + n + '.' + (sess.fl && sess.fl.car === p ? ' Dazu die schnellste Rennrunde!' : '');
        if (mode === 'chase') stars = pos <= 3 ? 3 : pos <= 6 ? 2 : pos <= 10 ? 1 : 0;
      }
      html = '<div>' + table() + '</div>';
      if (mode === 'champ' && champ) {
        order.forEach((c, i) => { const key = c === p ? '#me' : c.code; champ.pts[key] = (champ.pts[key] || 0) + (c.out ? 0 : POINTS[i] || 0) + (sess.fl && sess.fl.car === c && i < 10 ? 1 : 0); champ.info[key] = { name: c.name, css: c.css, me: c === p }; });
        champ.lastPos = pos; champ.round++;
        const st = Object.keys(champ.pts).sort((a, b) => champ.pts[b] - champ.pts[a]);
        let h = '<table class="res"><tr><th>P</th><th>GESAMTWERTUNG</th><th class="r">PKT</th></tr>';
        st.forEach((k, i) => { const inf = champ.info[k]; h += '<tr class="' + (inf.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><u style="background:' + inf.css + '"></u>' + U.esc(inf.name) + '</td><td class="r">' + champ.pts[k] + '</td></tr>'; });
        html += '<div>' + h + '</table></div>';
        const myRank = st.indexOf('#me') + 1;
        if (champ.round >= champ.tracks.length) {
          title = myRank === 1 ? '<span>WELTMEISTER!</span>' : 'SAISON BEENDET · <span>PLATZ ' + myRank + '</span>';
          lead = 'Endstand nach ' + champ.tracks.length + ' Rennen: ' + champ.pts['#me'] + ' Punkte.'; next = 'NEUE SAISON ▶'; champ.done = true;
          if (myRank === 1) { sess.fireworks = true; sess.fwN = 0; A.cheer(); }
        } else { next = 'NÄCHSTES RENNEN ▶'; lead += ' Weiter geht es in ' + F1.Tracks.DEFS.find((d) => d.id === champ.tracks[champ.round]).name + '.'; }
      }
      tip = pos > 3 && why !== 'dnf' ? 'Tipp: Fahre im Windschatten dicht hinter dem Vordermann und setze den ERS-Boost (Leertaste) auf der Geraden ein. Zu schwer oder zu leicht? Stelle im Menü die Stärke um.' : '';
    } else if (mode === 'cp') {
      const cp = sess.cp, old = U.store.get('cp.' + track.id, 0);
      if (cp.n > old) U.store.set('cp.' + track.id, cp.n);
      title = 'ZEITJAGD · <span>' + cp.n + ' TORE</span>';
      lead = 'Du bist ' + (Math.max(0, p.dist) / 1000).toFixed(2).replace('.', ',') + ' km weit gekommen.' + (cp.n > old ? ' Neuer Rekord!' : ' Dein Rekord: ' + old + ' Tore.');
      stars = cp.n >= 14 ? 3 : cp.n >= 9 ? 2 : cp.n >= 4 ? 1 : 0;
      tip = 'Tipp: Die Tore geben mit jeder Durchfahrt etwas weniger Zeit. Saubere Kurvenausgänge bringen mehr als spätes Bremsen.';
    } else if (mode === 'school') {
      const best = p.best, ref = track.refTime;
      title = 'FAHRSCHULE <span>BESTANDEN!</span>';
      stars = sess.school.clean ? (best && best < ref * 1.3 ? 3 : 2) : 1;
      lead = 'Beste Runde: ' + U.fmtTime(best) + '.' + (sess.school.clean ? ' Die zweite Runde war sauber – sehr gut!' : ' In der zweiten Runde warst du neben der Strecke – das geht noch sauberer.');
      tip = 'Nächster Schritt: Probiere einen Grand Prix auf „Rookie“ oder jage im Zeitfahren deinen eigenen Geist.';
    }
    if (M.ai || mode === 'cp' || mode === 'school') {
      $('resTitle').innerHTML = title; $('resLead').textContent = lead;
      const se = $('stars'); se.classList.toggle('hidden', stars < 0);
      if (stars >= 0) se.innerHTML = '★'.repeat(stars) + '<s>' + '★'.repeat(3 - stars) + '</s>';
      const g = $('resGrid'); g.innerHTML = html; g.classList.toggle('two', mode === 'champ');
      const te = $('resTip'); te.classList.toggle('hidden', !tip); te.textContent = tip;
      $('bNext').textContent = next; $('bAgain').classList.add('hidden');
      $('results').classList.remove('hidden'); $('app').classList.add('menu'); $('touch').classList.add('hidden');
    }
  }

  function toMenu() {
    paused = false; A.pause(false);
    $('pause').classList.add('hidden'); $('results').classList.add('hidden'); $('menu').classList.remove('hidden'); $('app').classList.add('menu'); $('touch').classList.add('hidden');
    if (cam.forced) { cam.mode = camPrev; cam.forced = false; }
    champ = null; H.reset();
    seg($('segWeather'), 'weather', Object.keys(WX).map((k) => [k, WX[k]]), rebuildSoon);
    seg($('segTime'), 'time', Object.keys(TIMES).map((k) => [k, TIMES[k]]), rebuildSoon);
    setupAttract(); refreshMenu(); drawTrackCards();
  }
  function nextAfterResults() {
    if (sess.mode === 'champ' && champ) {
      if (champ.done) champ = newChamp();
      cfg.track = champ.tracks[champ.round]; cfg.time = F1.Tracks.DEFS.find((d) => d.id === cfg.track).time;
    }
    startSession();
  }
  function newChamp() {
    const ids = F1.Tracks.DEFS.map((d) => d.id), i = ids.indexOf(cfg.track);
    return { round: 0, tracks: ids.slice(i).concat(ids.slice(0, i)), pts: {}, info: {}, field: null, lastPos: 0, done: false };
  }
  function pressStart() {
    champ = cfg.mode === 'champ' ? newChamp() : null;
    startSession();
  }

  // =================== HUD ===================
  function updateHud(dt) {
    const p = player, M = MODES[sess.mode];
    H.dash(p);
    sess.mmT -= dt;
    if (sess.mmT <= 0) { sess.mmT = 0.05; H.minimap(cars, p, sess.cp ? sess.cp.list.filter((g, k) => k === sess.cp.n % 6 || k === (sess.cp.n + 1) % 6) : null); }
    const lapT = p.lapIdx >= 0 && sess.go ? sess.raceT - p.lapStart : 0;
    H.timing(sess.phase === 'finish' ? p.last : lapT, p.last, p.best, sess.phase === 'race' ? sess.delta : null, p.lapBad && sess.phase === 'race');
    H.sectors(sess.secState);
    sess.towerT -= dt;
    if (sess.towerT <= 0) {
      sess.towerT = 0.3;
      if (!sess.startPos) sess.startPos = p.pos || sess.lastPos;
      const order = sess.order.length ? sess.order : cars, leader = order[0], vAvg = track.L / track.refTime / 1.12;
      if (M.ai) {
        const rows = order.map((c, i) => {
          let gap = '';
          if (c.out) gap = 'RAUS';
          else if (i === 0) gap = c.finished ? 'ZIEL' : 'FÜHRT';
          else if (c.finished && leader.finished) gap = c.lapsDone < leader.lapsDone ? '+' + (leader.lapsDone - c.lapsDone) + ' RD' : '+' + (c.finishT - leader.finishT).toFixed(1);
          else { const d = rankKey(leader) - rankKey(c); gap = d > track.L ? '+' + Math.floor(d / track.L) + ' RD' : '+' + (d / vAvg).toFixed(1); }
          return { pos: i + 1, code: c.code, css: c.css, gap, me: c === p, out: c.out, fl: sess.fl && sess.fl.car === c };
        });
        const lapNow = Math.max(1, Math.min(sess.laps || 999, p.lapIdx + 1));
        H.tower(rows, sess.laps ? 'RUNDE ' + lapNow + '/' + sess.laps : 'RUNDE ' + lapNow, sess.mode === 'ko' ? cars.filter((c) => !c.out).length + ' ÜBRIG' : p.pen ? '+' + p.pen + ' s' : '');
      }
      H.status(p.pos || 1, M.ai ? cars.length : 1, p.wear, p.damage, G.wet, sess.rain);
    }
  }

  // =================== Effekte ===================
  function effects(dt) {
    const duskOrNight = cfg.time !== 'day';
    for (const c of cars) {
      if (c.gone) continue;
      const dx = c.x - camera.position.x, dz = c.z - camera.position.z, d2 = dx * dx + dz * dz;
      c.rainOn = (G.wet > 0.25 || (sess && sess.rain > 0.2)) ? (tGame * 4) % 1 < 0.55 : cfg.time === 'night' && c.throttle < 0.2 && c.v > 10;
      c.drs = c.drsV;
      if (d2 > 160 * 160) continue;
      const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), rx = c.x - sn * 2.1, rz = c.z - cs * 2.1, sp = Math.abs(c.v);
      const vx = sn * c.v, vz = cs * c.v;
      if (G.wet > 0.2 && sp > 16 && Math.random() < dt * 28 * G.wet) fx.smoke(rx, c.y + 0.35, rz, vx * 0.3, 1.4, vz * 0.3, 0.8, 0.13 * G.wet + 0.05, 1.7, 0.9);
      if (sp > 66 && Math.random() < dt * (duskOrNight ? 5 : 2.2) * (sp - 66) / 20) fx.spark(c.x - sn * 1.2, c.y + 0.06, c.z - cs * 1.2, vx * 0.55, 0.6, vz * 0.55, 3);
      if (c.lockT > 0 && Math.random() < dt * 30) fx.smoke(c.x + sn * 1.8, c.y + 0.2, c.z + cs * 1.8, vx * 0.2, 0.4, vz * 0.2, 0.85, 0.22);
    }
    const p = player;
    if (p && p.isPlayer && state === 'run') {
      const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw), sp = p.speed || 0;
      for (let k = 0; k < 2; k++) {
        const sd = k ? -0.79 : 0.79, wx = p.x - sn * 1.8 + cs * sd, wz = p.z - cs * 1.8 - sn * sd;
        const mark = p.surf <= 1 ? Math.max(p.slide, p.brake > 0.9 && G.assist.abs < 0.5 && sp > 20 ? 0.5 : 0) : 0;
        fx.skid(k, wx, p.y, wz, cs, -sn, mark > 0.3 ? mark * 0.9 : 0);
        if (p.slide > 0.35 && p.surf <= 1 && Math.random() < dt * 40 * p.slide) fx.smoke(wx, p.y + 0.2, wz, p.vx * 0.25, 0.5, p.vz * 0.25, 0.86, 0.2 * p.slide);
        if (sp > 6 && p.surf === 2 && Math.random() < dt * 30) fx.dust(wx, p.y + 0.2, wz, p.vx, p.vz, 0.3, 0.36, 0.2, 0.3);
        if (sp > 4 && p.surf === 3 && Math.random() < dt * 45) fx.dust(wx, p.y + 0.2, wz, p.vx, p.vz, 0.72, 0.64, 0.46, 0.45);
      }
      if (p.surf === 1 || p.surf >= 2) cam.shake = Math.max(cam.shake, Math.min(0.25, sp * 0.004) * (p.surf === 1 ? 0.5 : 1));
    }
    // KI-Verbremser
    if (sess && sess.go) for (const c of cars) if (!c.isPlayer && !c.out && c.brake > 0.5 && c.v > 45 && c.lockT <= 0 && Math.random() < dt * 0.012 * (1.4 - c.rating)) c.lockT = 1.2;
  }

  // =================== Ideallinie ===================
  function updateLine() {
    const show = state === 'run' && sess.phase !== 'finish' && player && (cfg.line !== 'aus' || sess.mode === 'school');
    lineMesh.visible = !!show;
    if (!show) return;
    const pos = lineGeo.attributes.position.array, col = lineGeo.attributes.color.array, NS = pos.length / 6, n = track.n, u = Math.max(0, player.v);
    const full = cfg.line === 'voll' || sess.mode === 'school';
    for (let i = 0; i < NS; i++) {
      const s = player.s + 5 + i * 2.6, f = U.mod(s, track.L) / track.ds, i0 = Math.floor(f) % n;
      const d = track.at(track.ro, s); track.pos(s, d, P);
      const vp = pProf[i0], over = u - vp;
      let r, g, b, wdt = 0.34;
      if (over > 9) { r = 1; g = 0.08; b = 0.05; } else if (over > 1.5) { r = 1; g = 0.78; b = 0.05; } else { r = 0.1; g = 0.95; b = 0.35; }
      if (!full && vp > 78 && over < 1.5) wdt = 0;
      const nx = track.nx[i0], nz = track.nz[i0], o = i * 6, fade = Math.min(1, i / 4) * Math.min(1, (NS - i) / 20);
      pos[o] = P.x + nx * wdt; pos[o + 1] = P.y + 0.04; pos[o + 2] = P.z + nz * wdt; pos[o + 3] = P.x - nx * wdt; pos[o + 4] = P.y + 0.04; pos[o + 5] = P.z - nz * wdt;
      col[o] = col[o + 3] = r * fade; col[o + 1] = col[o + 4] = g * fade; col[o + 2] = col[o + 5] = b * fade;
    }
    lineGeo.attributes.position.needsUpdate = lineGeo.attributes.color.needsUpdate = true;
  }

  // =================== Kamera ===================
  const cam = { mode: cfg.cam | 0, yaw: 0, shake: 0, fov: 65, tv: -1, focus: 0, focusT: 0, vel: new THREE.Vector3(), prev: new THREE.Vector3(), tgt: new THREE.Vector3() };
  const qCar = new THREE.Quaternion(), qT = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ'), v3 = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  function onboard(c, lx, ly, lz, down, back) {
    eul.set(c.pitch, c.yaw, c.roll); qCar.setFromEuler(eul);
    v3.set(lx, ly, lz).applyQuaternion(qCar);
    camera.position.set(c.x + v3.x, c.y + v3.y, c.z + v3.z);
    camera.quaternion.copy(qCar);
    if (!back) camera.quaternion.multiply(qT.setFromAxisAngle(AY, Math.PI));
    camera.quaternion.multiply(qT.setFromAxisAngle(AX, -down));
  }
  function tvCam(c, dt) {
    const L = track.L, list = world.tvCams;
    const cost = (k) => { let d = list[k].s - c.s; d = U.mod(d + L / 2, L) - L / 2; return d >= 0 ? d : -d * 2.6; };
    let best = cam.tv, bc = cam.tv >= 0 ? cost(cam.tv) - 30 : 1e9;
    for (let k = 0; k < list.length; k++) { const cc = cost(k); if (cc < bc) { bc = cc; best = k; } }
    cam.tv = best;
    const t = list[best], dist = Math.hypot(t.x - c.x, t.z - c.z);
    camera.position.set(t.x, t.y, t.z);
    cam.tgt.lerp(v3.set(c.x, c.y + 0.6, c.z), cam.tgtInit ? 1 - Math.exp(-14 * dt) : 1); cam.tgtInit = true;
    camera.up.set(0, 1, 0); camera.lookAt(cam.tgt);
    return U.clamp((2 * Math.atan(8 / Math.max(6, dist)) * 180) / Math.PI, 9, 52);
  }
  function updateCamera(dt) {
    let fov = 65, c = player;
    camera.up.set(0, 1, 0);
    if (state === 'menu') {
      if (menuTab === 'driver' && showVis) {
        // schwenkt auf der Streckenseite um das eigene Auto
        const sp = showVis.pos, a = sp.base + Math.sin(tGame * 0.28) * 1.25;
        camera.position.set(sp.x + Math.sin(a) * 6.6, sp.y + 1.45 + Math.sin(tGame * 0.19) * 0.45, sp.z + Math.cos(a) * 6.6);
        camera.lookAt(sp.x, sp.y + 0.5, sp.z); fov = 40;
      } else if (cars.length) {
        cam.focusT -= dt;
        if (cam.focusT <= 0) { cam.focusT = 10; cam.focus = (cam.focus + 3) % cars.length; cam.tv = -1; cam.tgtInit = false; }
        fov = tvCam(cars[cam.focus], dt);
      }
    } else if (sess.phase === 'intro') {
      const k = U.smooth(0, 3.4, sess.phT), th = c.yaw + (1 - k) * 2.6, r = U.lerp(11, 6.2, k), h = U.lerp(3.4, 1.95, k);
      camera.position.set(c.x - Math.sin(th) * r, c.y + h, c.z - Math.cos(th) * r);
      camera.lookAt(c.x + Math.sin(c.yaw) * 3 * k, c.y + 0.8, c.z + Math.cos(c.yaw) * 3 * k);
      fov = 58; cam.yaw = c.yaw;
    } else {
      const m = cam.mode, back = inp.look && player.isPlayer, sp = Math.abs(c.v);
      const kf = U.smooth(15, 98, sp);
      if (m === 0 || m === 1) {
        cam.yaw += U.wrapPi(c.yaw - cam.yaw) * (1 - Math.exp(-(m ? 5 : 7.5) * dt));
        const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), dist = (m ? 9.6 : 6.1) + c.accS * 0.012, h = m ? 3.5 : 1.9, bk = back ? -1 : 1;
        camera.position.set(c.x - sy * dist * bk, c.y + h, c.z - cy * dist * bk);
        camera.lookAt(c.x + sy * 9 * bk, c.y + (m ? 0.6 : 0.85), c.z + cy * 9 * bk);
        fov = (m ? 60 : 64) + 15 * kf + (c.boost ? 4 : 0);
      } else if (m === 2) { onboard(c, 0, 1.13, -0.56, 0.085, back); fov = 76 + 8 * kf; }
      else if (m === 3) { onboard(c, 0, 0.765, 0.06, 0.05, back); fov = 72 + 8 * kf; }
      else if (m === 4) { onboard(c, 0, 0.44, 2.35, 0.02, back); fov = 84 + 8 * kf; }
      else if (m === 5) {
        cam.yaw += U.wrapPi(c.yaw - cam.yaw) * (1 - Math.exp(-3 * dt));
        const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), hh = world.tunnel && c.idx >= world.tunnel[0] && c.idx <= world.tunnel[1] ? 4.6 : 58;
        camera.position.set(c.x, c.y + hh, c.z); camera.up.set(sy, 0, cy); camera.lookAt(c.x + sy * 8, c.y, c.z + cy * 8); fov = hh < 10 ? 100 : 52;
      } else fov = tvCam(c, dt);
      if (cam.shake > 0.002) {
        camera.position.x += (Math.random() - 0.5) * cam.shake * 0.35; camera.position.y += (Math.random() - 0.5) * cam.shake * 0.3; camera.position.z += (Math.random() - 0.5) * cam.shake * 0.35;
        cam.shake *= Math.exp(-7 * dt);
      }
      const v = c.vis;
      if (v.swGroup) v.swGroup.visible = m === 3;
      if (v.helmet) v.helmet.visible = m !== 3;
    }
    cam.fov = U.damp(cam.fov, fov, 6, dt);
    if (Math.abs(camera.fov - cam.fov) > 0.02) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    cam.vel.copy(camera.position).sub(cam.prev).multiplyScalar(dt > 0 ? 1 / dt : 0); cam.prev.copy(camera.position);
    if (cam.vel.lengthSq() > 250 * 250) cam.vel.set(0, 0, 0);
  }

  // =================== Ton ===================
  const rivalList = [];
  function audio() {
    if (!A.ready) return;
    const p = player, own = state === 'run' && p && sess.phase !== 'finish';
    if (own) A.engine(p.rpm, pin.throttle, true, cam.mode >= 2 && cam.mode <= 4);
    else A.engine(0.3, 0, false);
    rivalList.length = 0;
    for (const c of cars) {
      if (c.gone || (own && c === p)) continue;
      const dx = c.x - camera.position.x, dz = c.z - camera.position.z, d = Math.hypot(dx, dz);
      if (d > 85) continue;
      const rel = ((Math.sin(c.yaw) * c.v - cam.vel.x) * dx + (Math.cos(c.yaw) * c.v - cam.vel.z) * dz) / (d || 1);
      v3.set(1, 0, 0).applyQuaternion(camera.quaternion);
      rivalList.push({ rpm: c.rpm, dist: d, pan: (dx * v3.x + dz * v3.z) / (d || 1), dop: U.clamp(1 - rel / 110, 0.72, 1.35) });
    }
    rivalList.sort((a, b) => a.dist - b.dist);
    A.rivals(rivalList);
    if (own) A.world(p.slide, p.speed || 0, p.surf === 1 && p.speed > 5, p.surf >= 2 && p.surf !== 4 && p.speed > 3, sess.rain);
    else A.world(0, 0, false, false, sess ? sess.rain : cfg.weather === 'rain' ? 0.7 : cfg.weather === 'storm' ? 1 : 0);
  }

  // =================== Schleife ===================
  let dispT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000; last = now;
    const dt = Math.min(0.05, Math.max(0.001, raw));
    // Auflösung anpassen, wenn es ruckelt (gedrosselte Hintergrund-Tabs zählen nicht)
    if (!paused && raw < 0.12) {
      perf.acc += raw; perf.n++; perf.cool -= raw;
      if (perf.n >= 90) {
        const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
        if (avg > 1 / 38 && perf.scale > 0.55 && perf.cool <= 0) { perf.scale = Math.max(0.55, perf.scale - 0.15); perf.cool = 4; resize(); }
        else if (avg < 1 / 56 && perf.scale < 1 && perf.cool <= 0) { perf.scale = Math.min(1, perf.scale + 0.1); perf.cool = 10; resize(); }
      }
    }
    if (!paused) tick(dt);
    renderer.render(scene, camera);
  }
  function tick(dt) {
    {
      tGame += dt;
      readInput(dt);
      if (state === 'menu') {
        S.planAI(cars, G, dt);
        for (const c of cars) S.stepAI(c, dt, G);
        S.separateAI(cars, G);
      } else updateSession(dt);
      for (const c of cars) if (!c.gone) F1.Car.update(c.vis, c, dt);
      if (state === 'run' && player) {
        if (player.isPlayer) player.vis.pivots[0].rotation.y = player.vis.pivots[1].rotation.y = pin.steer * 0.3;
        dispT -= dt;
        if (dispT <= 0 && cam.mode === 3) { dispT = 0.08; F1.Car.drawWheelDisplay(player.vis, { rpm: player.rpm, gear: player.reverse ? 'R' : player.gear, kmh: Math.round(Math.abs(player.v) * 3.6), ers: Math.round(player.battery * 100), drs: player.drsOn, pos: player.pos || 1 }); }
        ghost();
      }
      effects(dt);
      updateCamera(dt);
      updateLine();
      const f = state === 'run' && player ? player : cars[cam.focus] || { x: camera.position.x, y: 0, z: camera.position.z };
      world.update(dt, tGame, f, camera);
      fx.update(dt, camera, cam.vel, (renderer.domElement.height * 0.5) / Math.tan((camera.fov * Math.PI) / 360));
      audio();
      H.tick(dt);
    }
  }
  function ghost() {
    if (!ghostVis) return;
    const g = sess.ghost, p = player;
    if (!g || p.lapIdx < 0 || sess.phase !== 'race') { ghostVis.group.visible = false; return; }
    const lt = sess.raceT - p.lapStart, f = lt / 0.1, i = Math.floor(f), t = f - i, d = g.d, nS = d.length / 4;
    if (i + 1 >= nS) { ghostVis.group.visible = false; return; }
    const a = i * 4, b = a + 4;
    const gx = d[a] + (d[b] - d[a]) * t, gy = d[a + 1] + (d[b + 1] - d[a + 1]) * t, gz = d[a + 2] + (d[b + 2] - d[a + 2]) * t, gyaw = d[a + 3] + U.wrapPi(d[b + 3] - d[a + 3]) * t;
    ghostVis.group.visible = Math.hypot(gx - p.x, gz - p.z) > 4;
    F1.Car.update(ghostVis, { x: gx, y: gy, z: gz, yaw: gyaw, v: 60 }, 0.016);
  }

  // =================== Eingabe ===================
  const keys = {}, inp = { steer: 0, throttle: 0, brake: 0, boost: false, look: false }, touch = {};
  let touchDevice = false, padPrev = {};
  function readInput(dt) {
    let st = 0, th = 0, br = 0, bo = false, analog = false;
    if (keys.ArrowLeft || keys.KeyA || touch.tL) st += 1;
    if (keys.ArrowRight || keys.KeyD || touch.tR) st -= 1;
    if (keys.ArrowUp || keys.KeyW || touch.tGas) th = 1;
    if (keys.ArrowDown || keys.KeyS || touch.tBrk) br = 1;
    bo = !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || touch.tErs);
    inp.look = !!keys.KeyB;
    try {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (!gp || !gp.connected) continue;
        const ax = gp.axes[0] || 0, B = (i) => (gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0);
        if (Math.abs(ax) > 0.08) { st = -Math.sign(ax) * Math.pow(Math.abs(ax), 1.4); analog = true; }
        if (B(14)) st = 1; if (B(15)) st = -1;
        th = Math.max(th, B(7)); br = Math.max(br, B(6));
        if (B(0) || B(5)) bo = true; if (B(4)) inp.look = true;
        if (B(3) && !padPrev.y) nextCam(); if (B(9) && !padPrev.s) togglePause(); if (B(2) && !padPrev.x) resetPlayer();
        padPrev = { y: B(3), s: B(9), x: B(2) };
        break;
      }
    } catch (e) { /* kein Gamepad */ }
    const v = player ? Math.abs(player.v) : 0;
    if (analog) inp.steer = U.damp(inp.steer, st, 16, dt);
    else {
      const rate = st === 0 ? 5.5 : st * inp.steer < 0 ? 8 : U.lerp(3.6, 2.3, U.smooth(20, 90, v));
      inp.steer += U.clamp(st - inp.steer, -rate * dt, rate * dt);
    }
    inp.throttle += U.clamp(th - inp.throttle, -8 * dt, 4.5 * dt);
    inp.brake += U.clamp(br - inp.brake, -9 * dt, 7 * dt);
    inp.boost = bo;
  }
  function nextCam() { if (state !== 'run' || sess.phase === 'finish') return; cam.mode = (cam.mode + 1) % CAMS.length; cam.tv = -1; cam.tgtInit = false; cfg.cam = cam.mode; save(); H.banner('KAMERA: ' + CAMS[cam.mode], 'dark', 1.2); }
  function togglePause() {
    if (state !== 'run' || !$('results').classList.contains('hidden')) return;
    paused = !paused; A.pause(paused);
    $('pause').classList.toggle('hidden', !paused);
    if (paused) $('pauseSub').textContent = MODES[sess.mode].name + ' · ' + track.def.name;
    else last = performance.now();
  }
  function toggleSound() { A.setMuted(!A.isMuted()); $('bSound').textContent = A.isMuted() ? 'TON AUS' : 'TON AN'; }
  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter') e.target.blur(); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'KeyC') nextCam();
      else if (e.code === 'KeyM') toggleSound();
      else if (e.code === 'KeyR') resetPlayer();
      else if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      else if (e.code === 'Enter' && state === 'menu') pressStart();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'run' && !paused && $('results').classList.contains('hidden')) togglePause(); });
    touchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    for (const id of ['tL', 'tR', 'tGas', 'tBrk', 'tErs']) {
      const b = $(id);
      const on = (e) => { e.preventDefault(); touch[id] = true; b.classList.add('on'); A.init(); };
      const off = (e) => { e.preventDefault(); touch[id] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    }
    $('bCam').onclick = nextCam; $('bSound').onclick = toggleSound; $('bPause').onclick = togglePause;
    $('bResume').onclick = togglePause;
    $('bRestart').onclick = () => { paused = false; A.pause(false); $('pause').classList.add('hidden'); if (sess.mode === 'champ' && champ) { champ = newChamp(); } startSession(); };
    $('bQuit').onclick = toMenu; $('bMenu').onclick = toMenu; $('bNext').onclick = nextAfterResults; $('bStart').onclick = pressStart;
  }

  // =================== Menü ===================
  let rebuildT = 0;
  function rebuildSoon() { clearTimeout(rebuildT); rebuildT = setTimeout(() => { if (state === 'menu') setupAttract(); }, 140); }
  function seg(elm, key, opts, after) {
    elm.innerHTML = '';
    for (const [val, label] of opts) {
      const b = document.createElement('button'); b.textContent = label;
      if (String(cfg[key]) === String(val)) b.classList.add('sel');
      b.onclick = () => { cfg[key] = val; for (const c of elm.children) c.classList.toggle('sel', c === b); save(); if (after) after(val); refreshMenu(); };
      elm.appendChild(b);
    }
  }
  function optRow(parent, key, label, opts, after) {
    const row = document.createElement('div'); row.className = 'optRow'; row.dataset.key = key;
    const sp = document.createElement('span'); sp.textContent = label; const sg = document.createElement('div'); sg.className = 'seg';
    row.appendChild(sp); row.appendChild(sg); parent.appendChild(row); seg(sg, key, opts, after);
  }
  function buildSetup() {
    const r = $('optsRace'), a = $('optsAssist'), t = $('optsTech');
    r.innerHTML = a.innerHTML = t.innerHTML = '';
    optRow(r, 'laps', 'Runden', [[3, '3'], [5, '5'], [8, '8'], [12, '12']]);
    optRow(r, 'opp', 'Gegner', [[5, '5'], [9, '9'], [13, '13'], [19, '19']]);
    optRow(r, 'grid', 'Startplatz', [['front', 'Pole'], ['mid', 'Mitte'], ['back', 'Hinten']]);
    optRow(a, 'assist', 'ABS & Traktion', [['voll', 'Voll'], ['mittel', 'Mittel'], ['aus', 'Aus']]);
    optRow(a, 'line', 'Ideallinie', [['voll', 'Immer'], ['kurven', 'Kurven'], ['aus', 'Aus']]);
    optRow(a, 'autoBrake', 'Bremshilfe', [['an', 'An'], ['aus', 'Aus']]);
    optRow(a, 'steerHelp', 'Lenkhilfe', [['an', 'An'], ['aus', 'Aus']]);
    optRow(a, 'damage', 'Schäden', [['an', 'An'], ['aus', 'Aus']]);
    optRow(t, 'quality', 'Grafik', [['hoch', 'Hoch'], ['mittel', 'Mittel'], ['niedrig', 'Niedrig']], () => { perf.scale = 1; resize(); rebuildSoon(); });
  }
  function buildMenu() {
    for (const b of $('tabs').children) b.onclick = () => { menuTab = b.dataset.tab; for (const c of $('tabs').children) c.classList.toggle('sel', c === b); for (const pn of $('panes').children) pn.classList.toggle('sel', pn.dataset.pane === menuTab); if (menuTab === 'track') drawTrackCards(); };
    // Modi
    for (const id in MODES) {
      const m = MODES[id], b = document.createElement('button'); b.className = 'card'; b.dataset.id = id;
      b.innerHTML = '<i class="' + (m.ai ? '' : 'solo') + '">' + (m.ai ? 'RENNEN' : 'SOLO') + '</i><em>' + m.icon + '</em><b>' + m.name.toUpperCase() + '</b><small>' + m.desc + '</small>';
      b.onclick = () => { cfg.mode = id; save(); refreshMenu(); };
      $(m.ai ? 'modesAI' : 'modesSolo').appendChild(b);
    }
    seg($('segDiff'), 'diff', Object.keys(DIFFS).map((k) => [k, DIFFS[k].name]), (v) => { const D = DIFFS[v]; cfg.assist = D.assist; cfg.line = D.line; cfg.autoBrake = D.autoBrake; cfg.steerHelp = D.steerHelp; cfg.damage = D.damage; save(); buildSetup(); });
    // Strecken
    for (const d of F1.Tracks.DEFS) {
      const b = document.createElement('button'); b.className = 'card tcard'; b.dataset.id = d.id;
      b.innerHTML = '<canvas width="440" height="184"></canvas><b>' + d.name.toUpperCase() + '</b><small>' + d.tag + '</small><u></u>';
      b.onclick = () => { if (cfg.track === d.id) return; cfg.track = d.id; cfg.time = d.time; save(); seg($('segTime'), 'time', Object.keys(TIMES).map((k) => [k, TIMES[k]]), rebuildSoon); refreshMenu(); rebuildSoon(); };
      $('trackCards').appendChild(b);
    }
    seg($('segWeather'), 'weather', Object.keys(WX).map((k) => [k, WX[k]]), rebuildSoon);
    seg($('segTime'), 'time', Object.keys(TIMES).map((k) => [k, TIMES[k]]), rebuildSoon);
    // Fahrer
    const ni = $('nameIn'); ni.value = cfg.name || '';
    ni.oninput = () => { cfg.name = ni.value.slice(0, 14); save(); refreshMenu(); };
    for (const t of F1.TEAMS) {
      const b = document.createElement('button'); b.className = 'team'; b.dataset.id = t.id;
      b.innerHTML = '<u style="background:linear-gradient(90deg,' + F1.hex(t.c1) + ' 62%,' + F1.hex(t.c2) + ' 62%)"></u><span>' + t.name + '</span>';
      b.onclick = () => { cfg.team = t.id; save(); refreshMenu(); rebuildSoon(); };
      $('teams').appendChild(b);
    }
    for (const h of HELMETS) {
      const b = document.createElement('button'); b.style.background = F1.hex(h); b.dataset.h = h;
      b.onclick = () => { cfg.helmet = h; save(); refreshMenu(); rebuildSoon(); };
      $('helmets').appendChild(b);
    }
    buildSetup(); refreshMenu(); drawTrackCards();
  }
  function drawTrackCards() {
    for (const b of $('trackCards').children) {
      const tr = F1.Tracks.get(b.dataset.id), cv = b.querySelector('canvas'), g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      F1.Tracks.drawOutline(g, tr, F1.Tracks.fit(tr, cv.width, cv.height, 20), { width: 7, color: '#f3f5f8', glow: 'rgba(255,42,31,.35)', start: '#ff2a1f', sectors: true });
      const best = U.store.get('best.' + tr.id, null);
      b.querySelector('u').textContent = (tr.L / 1000).toFixed(2).replace('.', ',') + ' km · ' + tr.corners.length + ' Kurven' + (best ? ' · Bestzeit ' + U.fmtTime(best) : '');
    }
  }
  function refreshMenu() {
    const M = MODES[cfg.mode], D = DIFFS[cfg.diff], td = F1.Tracks.DEFS.find((d) => d.id === cfg.track), team = F1.TEAMS.find((t) => t.id === cfg.team);
    for (const id of ['modesAI', 'modesSolo']) for (const b of $(id).children) b.classList.toggle('sel', b.dataset.id === cfg.mode);
    for (const b of $('trackCards').children) b.classList.toggle('sel', b.dataset.id === cfg.track);
    for (const b of $('teams').children) b.classList.toggle('sel', b.dataset.id === cfg.team);
    for (const b of $('helmets').children) b.classList.toggle('sel', +b.dataset.h === cfg.helmet);
    $('diffNote').innerHTML = D.note;
    $('tabMode').textContent = M.name + ' · ' + D.name; $('tabTrack').textContent = td.name.split(' ').pop(); $('tabDriver').textContent = playerName(); $('tabSetup').textContent = cfg.assist === 'voll' ? 'Hilfen an' : cfg.assist === 'mittel' ? 'Hilfen mittel' : 'Hilfen aus';
    const lapsOn = cfg.mode === 'gp' || cfg.mode === 'champ', oppOn = cfg.mode === 'gp' || cfg.mode === 'champ' || cfg.mode === 'ko', gridOn = cfg.mode === 'gp' || cfg.mode === 'champ' || cfg.mode === 'ko';
    for (const row of document.querySelectorAll('.optRow')) {
      const k = row.dataset.key;
      row.classList.toggle('off', (k === 'laps' && !lapsOn) || (k === 'opp' && !oppOn) || (k === 'grid' && !gridOn));
    }
    let sum = '<b>' + M.name + '</b> · ' + td.name + ' · ' + WX[cfg.weather].replace(/^\S+\s/, '') + ', ' + TIMES[cfg.time] + ' · <b>' + D.name + '</b><br>' + U.esc(playerName()) + ' für ' + team.name;
    if (lapsOn) sum += ' · ' + cfg.laps + ' Runden'; if (oppOn) sum += ' · ' + (cfg.mode === 'ko' ? Math.min(11, cfg.opp) : cfg.opp) + ' Gegner';
    $('summary').innerHTML = sum;
    $('liveName').textContent = td.name; $('liveTag').textContent = td.tag;
    $('bStart').textContent = cfg.mode === 'champ' ? 'SAISON STARTEN ▶' : 'START ▶';
  }

  window.addEventListener('error', (e) => {
    let d = $('err'); if (!d) { d = document.createElement('div'); d.id = 'err'; $('app').appendChild(d); }
    d.textContent = 'Fehler: ' + (e.message || e) + (e.filename ? '\n' + e.filename.split('/').pop() + ':' + e.lineno : '');
  });
  F1.debug = () => ({ state, sess, cars, player, cfg, track, world, cam, G, perf, renderer, scene, camera, keys, inp, pin, tick, pressStart, toMenu, refreshMenu, setupAttract });
  if (window.THREE) init();
  else $('loading').innerHTML = '3D-Bibliothek konnte nicht geladen werden – bitte Internetverbindung prüfen.';
})();
