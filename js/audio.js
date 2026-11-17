/* APEX GP – Ton: komplett synthetisch (WebAudio), keine Dateien */
(function () {
  'use strict';
  const F1 = window.F1, U = F1.U;
  let ctx = null, master = null, noiseBuf = null, muted = false;
  const A = (F1.Audio = { ready: false });
  const N = {};

  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; }
  function gain(v, dest) { const g = ctx.createGain(); g.gain.value = v; g.connect(dest || master); return g; }
  function filt(type, f, q, dest) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; b.connect(dest); return b; }
  function osc(type, f, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); o.start(); return o; }
  const set = (p, v, tc) => { p.setTargetAtTime(v, ctx.currentTime, tc || 0.04); };

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.75;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      // --- eigener Motor ---
      N.engGain = gain(0);
      N.engLP = filt('lowpass', 900, 0.8, N.engGain);
      const ws = ctx.createWaveShaper(), curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) { const x = (i / 255.5) - 1; curve[i] = Math.tanh(x * 2.6); }
      ws.curve = curve; ws.connect(N.engLP);
      const mix = gain(1, ws);
      N.o1 = osc('sawtooth', 80, gain(0.5, mix)); N.o2 = osc('sawtooth', 40, gain(0.38, mix)); N.o3 = osc('square', 20, gain(0.2, mix)); N.o4 = osc('triangle', 160, gain(0.22, mix));
      N.o2.detune.value = 9; N.o4.detune.value = -6;
      N.raspG = gain(0); N.raspBP = filt('bandpass', 1200, 1.2, N.raspG); noiseSrc().connect(N.raspBP);
      // --- Gegner (3 Stimmen) ---
      N.ai = [];
      for (let i = 0; i < 3; i++) {
        const g = gain(0), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        let dest = g; if (pan) { pan.connect(g); dest = pan; }
        const lp = filt('lowpass', 1700, 0.7, dest), o = osc('sawtooth', 100, lp), o2 = osc('sawtooth', 50, gain(0.6, lp));
        N.ai.push({ g, pan, o, o2 });
      }
      // --- Reifen, Wind, Untergrund, Regen ---
      N.sqG = gain(0); N.sqBP = filt('bandpass', 1150, 5, N.sqG); noiseSrc().connect(N.sqBP);
      N.windG = gain(0); N.windLP = filt('lowpass', 600, 0.5, N.windG); noiseSrc().connect(N.windLP);
      N.offG = gain(0); noiseSrc().connect(filt('lowpass', 260, 0.7, N.offG));
      N.kerbG = gain(0); N.kerbO = osc('square', 40, filt('lowpass', 300, 0.7, N.kerbG));
      N.rainG = gain(0); noiseSrc().connect(filt('highpass', 2600, 0.5, N.rainG));
      A.ready = true;
    } catch (e) { ctx = null; }
  };
  A.setMuted = function (m) { muted = m; if (master) set(master.gain, m ? 0 : 0.75, 0.05); };
  A.isMuted = () => muted;
  A.pause = function (p) { if (ctx) { if (p) ctx.suspend(); else ctx.resume(); } };

  /* rpm 0..1, thr 0..1, on: Motor hörbar */
  A.engine = function (rpm, thr, on, cockpit) {
    if (!A.ready) return;
    const f = 58 + rpm * 300;
    set(N.o1.frequency, f, 0.03); set(N.o2.frequency, f * 0.5, 0.03); set(N.o3.frequency, f * 0.25, 0.03); set(N.o4.frequency, f * 2, 0.03);
    set(N.engLP.frequency, 500 + rpm * 2600 + thr * 2200, 0.05);
    set(N.engGain.gain, on ? (0.07 + thr * 0.17 + rpm * 0.05) * (cockpit ? 1.15 : 1) : 0, 0.06);
    set(N.raspBP.frequency, 700 + rpm * 2600, 0.05); set(N.raspG.gain, on ? thr * rpm * 0.07 : 0, 0.05);
  };
  /* list: bis zu 3 Einträge {rpm, dist, pan, dop} */
  A.rivals = function (list) {
    if (!A.ready) return;
    for (let i = 0; i < 3; i++) {
      const v = N.ai[i], e = list[i];
      if (!e) { set(v.g.gain, 0, 0.1); continue; }
      const f = (58 + e.rpm * 300) * e.dop, k = U.clamp(1 - e.dist / 85, 0, 1);
      set(v.o.frequency, f, 0.05); set(v.o2.frequency, f * 0.5, 0.05); set(v.g.gain, k * k * 0.13, 0.08);
      if (v.pan) set(v.pan.pan, U.clamp(e.pan, -1, 1), 0.08);
    }
  };
  A.world = function (slide, speed, kerb, off, rain) {
    if (!A.ready) return;
    set(N.sqG.gain, slide * 0.16, 0.05); set(N.sqBP.frequency, 950 + slide * 500, 0.1);
    const s = U.clamp(speed / 95, 0, 1);
    set(N.windG.gain, s * s * 0.2, 0.1); set(N.windLP.frequency, 350 + s * 1500, 0.1);
    set(N.offG.gain, off ? 0.1 + s * 0.3 : 0, 0.06);
    set(N.kerbG.gain, kerb ? 0.16 : 0, 0.02); set(N.kerbO.frequency, U.clamp(speed * 0.85, 18, 70), 0.05);
    set(N.rainG.gain, rain * 0.07, 0.3);
  };
  A.silence = function () { if (!A.ready) return; A.engine(0.3, 0, false); A.rivals([]); A.world(0, 0, false, false, 0); };

  A.beep = function (f, dur, vol, type) {
    if (!A.ready) return;
    const g = ctx.createGain(), o = ctx.createOscillator(), t = ctx.currentTime;
    o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.setValueAtTime(vol || 0.2, t + dur - 0.03); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  };
  function burst(freq, type, dur, vol, q) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), b = ctx.createBiquadFilter(), t = ctx.currentTime;
    s.buffer = noiseBuf; s.loop = true; b.type = type; b.frequency.value = freq; if (q) b.Q.value = q;
    s.connect(b); b.connect(g); g.connect(master);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  A.thump = function (k) {
    if (!A.ready) return;
    k = U.clamp(k, 0.1, 1);
    burst(220, 'lowpass', 0.25 + k * 0.3, 0.5 * k); burst(2400, 'bandpass', 0.12, 0.2 * k, 1);
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.25); o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.5 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32);
  };
  A.shift = function () { if (A.ready) burst(900, 'bandpass', 0.05, 0.07, 2); };
  A.thunder = function () { if (A.ready) { burst(90, 'lowpass', 3.2, 0.9); burst(300, 'lowpass', 1.2, 0.35); } };
  A.cheer = function () {
    if (!A.ready) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(), b = ctx.createBiquadFilter(), t = ctx.currentTime;
    s.buffer = noiseBuf; s.loop = true; b.type = 'bandpass'; b.frequency.value = 1100; b.Q.value = 0.5; s.connect(b); b.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.8); g.gain.setValueAtTime(0.22, t + 3); g.gain.exponentialRampToValueAtTime(0.0008, t + 7);
    b.frequency.linearRampToValueAtTime(1500, t + 1.2); b.frequency.linearRampToValueAtTime(1000, t + 6);
    s.start(t); s.stop(t + 7.2);
  };
  A.firework = function () { if (A.ready) { burst(160, 'lowpass', 0.7, 0.4); burst(3000, 'highpass', 0.5, 0.06); } };
  A.radio = function () { A.beep(1250, 0.07, 0.09, 'square'); setTimeout(() => A.beep(1650, 0.07, 0.09, 'square'), 90); };
  A.chime = function (good) { if (good) { A.beep(880, 0.1, 0.14); setTimeout(() => A.beep(1320, 0.16, 0.14), 100); } else { A.beep(330, 0.22, 0.16, 'sawtooth'); } };
})();
