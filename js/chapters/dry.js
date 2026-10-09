// Chapter 2: how a coat of paint turns from liquid to solid. Three paints, three chemistries.
// The picture is a slice through the wet coat, magnified: the wall is the grey slab underneath, the
// room air is above. Emulsion: 100 µm wet, 38% solids, so 38 µm dry. Models and sources: paint.js.
// Emulsion paint tins usually ask for a wall above about 10 °C; that is the MFFT rule in practice.
import { THREE, smooth } from '../kit.js';
import {
  TAU, rng, dots, puffs, board, panelBg, axes, title, line, wrap, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, VIEW, TALL, BW, BH, B1, B2, COL,
  freshFilm, stepDry, dryCurves, evapRate, LIME, WET, VS,
} from '../paint.js';

const T_END = 60 * 86400, X0 = -3.7, X1 = 2.5, Y0 = 0.5, HFULL = 2.7;
const fmtT = (t) => (t >= 2 * 86400 ? `${(t / 86400).toFixed(t >= 10 * 86400 ? 0 : 1)} days` : t >= 5400 ? `${(t / 3600).toFixed(t >= 36000 ? 0 : 1)} hours` : `${Math.round(t / 60)} min`);
const fmtD = (t, never = 'over two months') => (t == null ? never : fmtT(t));
const KIND = { emulsion: 'Emulsion', enamel: 'Oil enamel', lime: 'Limewash' };
const TICKS = [60, 600, 3600, 6 * 3600, 86400, 7 * 86400, 30 * 86400];
const tickFmt = (t) => ({ 60: '1 min', 600: '10 min', 3600: '1 h', 21600: '6 h', 86400: '1 day', 604800: '1 wk', 2592000: '30 d' }[t] || '');
const env = (s) => ({ T: s.T, RH: s.RH, air: s.air, mfft: s.mfft, drier: s.drier });

export default {
  id: 'dry',
  short: 'How it dries',
  title: 'How paint dries: from liquid to film',
  subtitle: 'Water leaves, soft balls crowd, squash and fuse. Oil paint and limewash harden by taking a gas from the air.',
  view: VIEW,
  learn: `<p>An emulsion paint does not simply dry like a puddle. It goes through <b>three stages</b>.</p>
    <p><b>1. Water leaves.</b> It evaporates from the surface, fast in warm, dry, moving air and slowly in the monsoon (see ${link('perfumeclear', 'PerfumeClear', 'pyramid')} for evaporation). The latex balls are pushed closer until they touch.</p>
    <p><b>2. The balls squash.</b> As the last water is drawn out, the soft balls are pressed into a honeycomb with no gaps. This only works if the polymer is soft enough, which means the wall must be warmer than the paint's <b>minimum film-forming temperature</b> (MFFT). Below it the balls stay hard and round, and you are left with a cracked, powdery layer. That is why tins say not to paint a cold wall.</p>
    <p><b>3. The chains mingle.</b> Polymer chains wander across the old boundaries and tangle, and the honeycomb becomes one continuous film that locks the pigment in. This <b>coalescence</b> takes days to weeks. A wall is touch dry in under an hour but not washable for a week or two.</p>
    <p><b>Oil enamel</b> is different. Its solvent evaporates, and then <b>oxygen</b> from the air joins the oil molecules to one another with new bonds, a slow <b>oxidation</b> that metal driers speed up (see ${link('redoxclear', 'RedoxClear')}, ${link('bondclear', 'BondClear', 'covalent')} and, for catalysts, ${link('rateclear', 'RateClear', 'catalyst')}). The film even gains weight.</p>
    <p><b>Limewash</b> (chuna) is slaked lime in water. It hardens by <b>carbonation</b>: it takes carbon dioxide from the air and turns back into limestone. <b>Cement paint</b> sets by reacting with water, so it is kept damp. <b>Distemper</b> is chalk held by a little glue, and just dries.</p>
    <p class="tip"><b>Try it:</b> set the wall to 3 °C and watch the emulsion fail to form a film. Then pick limewash and slide the humidity from 30% to 65% to 95%.</p>`,
  terms: [
    { t: 'Coalescence', d: 'Separate polymer balls fusing into one continuous film as their chains mix across the boundaries.' },
    { t: 'MFFT', d: 'Minimum film-forming temperature: the coldest wall on which a latex paint can still fuse into a film.' },
    { t: 'Curing', d: 'Hardening by a chemical change, not only by drying. Enamel cures with oxygen, limewash with carbon dioxide.' },
    { t: 'Cross-link', d: 'A chemical bond that ties two long molecules together, turning a liquid into a solid network.' },
    { t: 'Carbonation', d: 'Slaked lime taking carbon dioxide from the air and becoming calcium carbonate, the mineral of limestone.' },
    { t: 'Drier', d: 'A metal compound added to oil paint in tiny amounts to speed up its reaction with oxygen.' },
  ],
  defaults: { kind: 'emulsion', T: 28, RH: 55, air: 1, mfft: 5, drier: true, fast: 1800 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Paint', options: [{ v: 'emulsion', label: 'Emulsion' }, { v: 'enamel', label: 'Oil enamel' }, { v: 'lime', label: 'Limewash' }] },
    { key: 'T', type: 'range', label: 'Wall and air temperature', min: 2, max: 45, step: 0.5, ends: ['2 °C', '45 °C'], fmt: (v) => v.toFixed(1) + ' °C' },
    { key: 'RH', type: 'range', label: 'Humidity of the air', min: 15, max: 98, step: 1, ends: ['desert dry', 'monsoon'], fmt: (v) => v.toFixed(0) + '%' },
    { key: 'air', type: 'seg', label: 'Air', options: [{ v: 1, label: 'Still room' }, { v: 3, label: 'Fan on' }] },
    { key: 'mfft', type: 'range', label: 'Emulsion: minimum film-forming temperature', min: 0, max: 20, step: 0.5, ends: ['soft binder', 'hard binder'], fmt: (v) => v.toFixed(1) + ' °C', hint: 'A harder binder gives a tougher film but needs a warmer wall.' },
    { key: 'drier', type: 'toggle', label: 'Enamel: metal drier added' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 120, label: '2 min a second' }, { v: 1800, label: '30 min a second' }, { v: 86400, label: '1 day a second' }] },
    { key: 'go', type: 'buttons', label: 'Your move', items: [{ label: 'Paint it again', act: (s, inst) => inst.reset(s) }] },
  ],
  onChange(s, key) { if (key === 'kind') s._reset = true; },
  quiz: [
    { q: 'What happens to the latex balls as an emulsion paint dries?', options: ['They dissolve in the water', 'They evaporate', 'They crowd together, squash into a honeycomb and fuse into one film', 'They sink into the wall'], answer: 2, why: 'Water leaves, the balls touch and deform, and then their polymer chains mix across the boundaries. The result is one continuous film.' },
    { q: 'Why should you not paint a very cold wall with emulsion?', options: ['The colour changes', 'Below the minimum film-forming temperature the balls are too hard to fuse, so the coat stays powdery', 'Cold water cannot evaporate at all', 'The paint freezes instantly'], answer: 1, why: 'The polymer must be soft enough to deform. Below the MFFT you get packed but separate balls: a weak, cracked layer.' },
    { q: 'How does an oil enamel harden?', options: ['Only by its solvent evaporating', 'By freezing', 'By taking carbon dioxide from the air', 'Oxygen from the air links its oil molecules together'], answer: 3, why: 'The solvent leaves first, then oxygen cross-links the oil or alkyd. Limewash is the one that takes carbon dioxide.' },
  ],
  reel: [
    { ms: 6000, caption: 'As emulsion paint dries, water leaves and millions of soft plastic balls crowd together.', set: { kind: 'emulsion', T: 28, RH: 55, air: 1, mfft: 5, fast: 260 }, act: (s, inst) => inst.reset(s), view: TALL, spin: 0 },
    { ms: 6000, caption: 'The balls squash into a honeycomb and fuse into one film: touch dry within the hour, fully hard in a week or two.', set: { kind: 'emulsion', T: 28, RH: 55, air: 1, mfft: 5, fast: 70000 }, act: (s, inst) => inst.reset(s, 2400), view: TALL, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(11), W = X1 - X0;
    // the wall, seen in section, and the air above
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, Y0, 1.3), new THREE.MeshStandardMaterial({ color: 0x8d9197, roughness: 0.95 })); wall.position.set((X0 + X1) / 2, Y0 / 2, 0); wall.receiveShadow = true; root.add(wall);
    const liquid = new THREE.Mesh(new THREE.BoxGeometry(W, 1, 0.9), new THREE.MeshStandardMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false })); liquid.renderOrder = 3; root.add(liquid);
    const film = new THREE.Mesh(new THREE.BoxGeometry(W, 1, 0.5), new THREE.MeshStandardMaterial({ color: 0xff9db8, transparent: true, opacity: 0, roughness: 0.35, depthWrite: false })); film.renderOrder = 4; root.add(film);
    // lattice: 4 rows of 18, a honeycomb when fully squashed
    const ROWS = 4, rH = (HFULL * VS) / (1.5 * (ROWS - 1) + 2), COLS = Math.round(W / (Math.sqrt(3) * rH)), dx = W / COLS, P = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) P.push({ xl: X0 + dx * (i + 0.25 + (j % 2) * 0.5), ul: (rH + 1.5 * rH * j) / (HFULL * VS), xs: X0 + 0.2 + ((P.length * 0.618034) % 1) * (W - 0.4), us: 0.06 + ((P.length * 0.754878) % 1) * 0.88, zs: (rnd() - 0.5) * 0.5, ph: rnd() * TAU, th: rnd(), col: i });
    const N = P.length, o = new THREE.Object3D();
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(dx / 2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, transparent: true }), N);
    const cells = new THREE.InstancedMesh(new THREE.CylinderGeometry(dx / Math.sqrt(3), dx / Math.sqrt(3), 0.42, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, transparent: true }), N);
    [balls, cells].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m); });
    const cA = new THREE.Color(), cB = new THREE.Color();
    // pigment grains ride in front and end up locked in the film
    const pig = dots(16, 0.1, 0xffffff, 8, true); root.add(pig);
    const PG = Array.from({ length: 16 }, () => ({ xs: X0 + 0.3 + rnd() * (W - 0.6), us: 0.1 + rnd() * 0.8, ul: 0.15 + rnd() * 0.7, ph: rnd() * TAU }));
    // cross-links for the enamel, drawn top first
    const pairs = [];
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) { const d = Math.hypot(P[a].xl - P[b].xl, (P[a].ul - P[b].ul) * HFULL * 0.5); if (d < dx * 1.25) pairs.push([a, b]); }
    pairs.sort((p, q) => (P[q[0]].ul + P[q[1]].ul) - (P[p[0]].ul + P[p[1]].ul));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs.length * 6), 3));
    const links = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffe08a })); links.frustumCulled = false; root.add(links);
    const up = puffs(root, 110, 0.055, 0x9fd0ff, rnd), down = puffs(root, 70, 0.06, 0xffffff, rnd), cGas = new THREE.Color();
    const lTop = stage.label('', [(X0 + X1) / 2, Y0 + HFULL + 0.8, 0], root, 'hot');
    const lWall = stage.label('wall', [X0 + 0.5, Y0 * 0.45, 0.7], root), lAir = stage.label('room air', [X1 - 0.5, Y0 + HFULL + 0.3, 0], root);
    const lGas = stage.label('', [X0 + 1.1, Y0 + HFULL + 0.3, 0], root);

    let S = { ...s0 }, f = freshFilm(S.kind), cur = null, sweep = null, ckey = '', key = '', hold = 0;
    const reset = (s, t0 = 0) => { if (s) S = s; f = freshFilm(S.kind); if (t0) stepDry(f, t0, env(S)); up.clear(); down.clear(); hold = 0; };
    const stageName = () => {
      if (f.kind === 'emulsion') return f.w > f.wPack ? '1: water leaving, balls crowding' : f.D < 0.9 ? (S.T <= S.mfft && f.w < f.wPack * 0.3 ? 'stuck: too cold to fuse' : '2: balls squashing into a honeycomb') : f.H < 0.9 ? '3: chains mingling, film gaining strength' : 'cured: one continuous film';
      if (f.kind === 'enamel') return f.w / f.w0 > 0.3 ? 'solvent evaporating' : f.H < 0.6 ? 'oxygen cross-linking the oil' : f.H < 0.95 ? 'hardening through' : 'cured: a hard cross-linked film';
      return f.w / f.w0 > 0.1 ? 'water drying off' : f.H < 0.95 ? 'taking carbon dioxide from the air' : 'carbonated: back to limestone';
    };

    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, `${KIND[S.kind]}: one coat`, 'on a log clock');
      const { X, Y, y0, y1 } = axes(g, w, h, { x0: 62, y1: 66, y0: h - 44, xMin: 60, xMax: T_END, xLog: true, yMin: 0, yMax: 1, xTicks: TICKS, yTicks: [0, 0.5, 1], xFmt: tickFmt, yFmt: (v) => v * 100 + '%' });
      if (!cur) return;
      const L = S.kind === 'emulsion' ? [['water left', COL.water, cur.w], ['balls fused', COL.pink, cur.D], ['strength', COL.gold, cur.H]] : S.kind === 'enamel' ? [['solvent left', COL.water, cur.w], ['cross-linked', COL.gold, cur.H]] : [['water left', COL.water, cur.w], ['turned to limestone', COL.gold, cur.H]];
      L.forEach(([, c, a]) => line(g, cur.t.map((t, i) => [t, a[i]]), X, Y, c, 4));
      g.font = 'bold 15px sans-serif'; let lx = 70; L.forEach(([n, c]) => { g.fillStyle = c; g.fillText(n, lx, 58); lx += g.measureText(n).width + 18; });
      const tx = clamp(f.t, 60, T_END); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(tx), y1); g.lineTo(X(tx), y0); g.stroke();
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      if (!sweep) return;
      const en = S.kind === 'enamel';
      title(g, en ? 'Hard dry against temperature' : S.kind === 'lime' ? 'Fully carbonated against humidity' : 'Touch dry against humidity', en ? '' : `at ${S.T.toFixed(0)} °C`);
      const xs = sweep.map((p) => p[0]), top = Math.max(...sweep.map((p) => p[1] || 0)) * 1.15 || 1;
      const hrs = top > 72 * 3600, U = hrs ? 86400 : 3600, yMax = Math.max(1, Math.ceil(top / U));
      const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 84, xMin: xs[0], xMax: xs[xs.length - 1], yMin: 0, yMax, xTicks: en ? [5, 15, 25, 35, 45] : [20, 40, 60, 80, 98], yTicks: [0, yMax / 2, yMax], xFmt: (v) => v + (en ? ' °C' : '%'), yFmt: (v) => +v.toFixed(1) + (hrs ? ' d' : ' h') });
      line(g, sweep.filter((p) => p[1] != null).map((p) => [p[0], p[1] / U]), X, Y, COL.gold, 4);
      const v = en ? S.T : S.RH, now = en ? cur.recoat : S.kind === 'lime' ? cur.hard : cur.touch;
      if (now != null && now / U <= yMax) { g.fillStyle = '#fff'; g.beginPath(); g.arc(X(clamp(v, xs[0], xs[xs.length - 1])), Y(now / U), 8, 0, TAU); g.fill(); }
      g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)';
      wrap(g, en ? 'Oxidation is a chemical reaction, so warmth speeds it and humidity hardly matters.' : S.kind === 'lime' ? 'Carbon dioxide must dissolve in a film of water in the pores: too dry or too wet, and it crawls.' : 'Water can only leave into air that has room for it. Near 100% humidity the coat stays wet for hours.', 24, h - 30, w - 48, 19);
    }, B2);

    return {
      reset,
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lWall, lAir, lGas]); reelBoards([bA, bB], -0.4, stage, VIEW); phoneBoards(stage, [bA, bB], 0);
        if (s._reset) { s._reset = false; reset(s); }
        if (f.kind !== s.kind) reset(s);
        const ck = `${s.kind}|${s.T}|${s.RH}|${s.air}|${s.mfft}|${s.drier}`;
        if (ck !== ckey) {
          ckey = ck; cur = dryCurves(s.kind, env(s), T_END); key = '';
          const pts = s.kind === 'enamel' ? [5, 10, 15, 20, 25, 30, 35, 40, 45] : [20, 30, 40, 50, 60, 70, 80, 88, 94, 98];
          sweep = pts.map((v) => { const c = dryCurves(s.kind, s.kind === 'enamel' ? { ...env(s), T: v } : { ...env(s), RH: v }, T_END); return [v, s.kind === 'enamel' ? c.recoat : s.kind === 'lime' ? c.hard : c.touch]; });
        }
        const done = f.t >= T_END || (cur.hard != null && f.t > cur.hard * 1.6);
        if (!done) stepDry(f, dt * s.fast, env(s)); else { hold += dt; if (hold > 3 && !document.body.classList.contains('gb-reel')) reset(s); }

        // ---------- geometry
        const wetH = f.kind === 'lime' ? 1.25 + 0.75 * (f.w / f.w0) : (HFULL * (f.solids + f.w)) / (f.kind === 'enamel' ? 80 : WET);
        const p1 = f.kind === 'emulsion' ? smooth(clamp((f.w0 - f.w) / (f.w0 - f.wPack), 0, 1)) : 1;
        const top = Y0 + wetH;
        liquid.scale.y = Math.max(0.01, wetH); liquid.position.set((X0 + X1) / 2, Y0 + wetH / 2, 0);
        liquid.material.color.set(f.kind === 'enamel' ? 0xe0a030 : 0x6fb6ff);
        liquid.material.opacity = f.kind === 'enamel' ? 0.42 : f.kind === 'lime' ? 0.28 * clamp(f.w / f.w0, 0, 1) : 0.3 * clamp(f.w / f.wPack, 0, 1) + 0.02;
        const emul = f.kind === 'emulsion', lime = f.kind === 'lime', D = f.D, crack = emul && s.T <= s.mfft ? clamp(1 - f.w / (f.wPack * 0.5), 0, 1) : 0;
        film.visible = emul; film.scale.y = Math.max(0.01, wetH); film.position.set((X0 + X1) / 2, Y0 + wetH / 2, 0.02); film.material.opacity = emul ? 0.92 * smooth(f.H) : 0;
        balls.material.opacity = emul ? 1 - 0.9 * smooth(clamp((D - 0.55) / 0.45, 0, 1)) : 1;
        cells.material.opacity = emul ? smooth(clamp((D - 0.35) / 0.5, 0, 1)) : 1;
        cells.visible = emul ? D > 0.3 : lime;
        const yS = wetH / (HFULL * VS);
        for (let i = 0; i < N; i++) {
          const p = P[i], jig = (1 - p1) * 0.07;
          const x = p.xs + (p.xl - p.xs) * p1 + jig * Math.sin(time * 2.1 + p.ph) + crack * 0.07 * (Math.floor(p.col / 3) % 2 ? 1 : -1);
          const y = Y0 + (emul ? (p.us + (p.ul - p.us) * p1) * wetH : p.ul * wetH) + jig * Math.cos(time * 1.7 + p.ph * 2);
          const conv = lime && 1 - p.ul * 0.8 - p.th * 0.2 < f.H * 1.02;      // limewash turns from the top down
          o.position.set(x, y, emul ? p.zs * (1 - p1) : 0); o.rotation.set(0, 0, 0);
          const sb = emul ? 1 + 0.16 * D : lime ? (conv ? 0.0001 : 0.92) : 0.5;
          o.scale.set(sb, emul ? sb * Math.min(1, 0.55 + 0.45 * yS * (1 + 0.6 * (1 - D))) : sb, emul ? 1 - 0.4 * D : sb); o.updateMatrix(); balls.setMatrixAt(i, o.matrix);
          cA.set(emul ? 0xff9db8 : lime ? 0xb9bcc0 : 0xf2b632); if (emul) cA.offsetHSL(0, 0, (p.th - 0.5) * 0.1); balls.setColorAt(i, cA);
          o.rotation.set(0, 0, Math.PI / 6); const sc = emul ? 0.9 + 0.1 * smooth(D) : conv ? 0.95 : 0.0001; o.scale.set(sc, sc * (emul ? Math.min(1.25, yS) : 1), 1); o.position.z = -0.02; o.updateMatrix(); cells.setMatrixAt(i, o.matrix);
          cB.set(emul ? 0xff9db8 : 0xffffff); cB.offsetHSL(0, 0, (p.th - 0.5) * (emul ? 0.12 * (1 - f.H) : 0.08)); cells.setColorAt(i, cB);
        }
        [balls, cells].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
        PG.forEach((q, i) => pig.place(i, q.xs + (1 - p1) * 0.06 * Math.sin(time * 1.5 + q.ph), Y0 + (q.us + (q.ul - q.us) * p1) * wetH, 0.36, lime ? 0.0001 : 1)); pig.done();
        // enamel cross-links
        links.visible = f.kind === 'enamel';
        if (links.visible) {
          const a = lg.attributes.position.array;
          pairs.forEach(([i, j], k) => { a[k * 6] = P[i].xl; a[k * 6 + 1] = Y0 + P[i].ul * wetH; a[k * 6 + 2] = 0.1; a[k * 6 + 3] = P[j].xl; a[k * 6 + 4] = Y0 + P[j].ul * wetH; a[k * 6 + 5] = 0.1; });
          lg.attributes.position.needsUpdate = true; lg.setDrawRange(0, Math.round(pairs.length * f.H) * 2);
        }
        // what leaves and what arrives
        const out = f.kind === 'lime' ? f.rate + (f.H < 1 ? 0.004 : 0) : f.rate, ref = evapRate(28, 55, 1);
        up.step(dt, done ? 0 : clamp(out / ref, 0, 3) * 26, () => [X0 + rnd() * W, top, (rnd() - 0.5) * 0.6], () => [(rnd() - 0.5) * 0.3, 0.45 + rnd() * 0.5, 0], 2.4);
        const gasIn = f.kind === 'emulsion' || done ? 0 : f.kind === 'enamel' ? 14 * (1 - f.H) * clamp(1 - f.w / f.w0, 0, 1) : 14 * (f.H < 1 ? clamp((f.co2 || 0) / 2e-4, 0.1, 1.2) : 0);
        down.step(dt, gasIn, () => [X0 + rnd() * W, top + 1.2 + rnd() * 0.3, (rnd() - 0.5) * 0.6], () => [(rnd() - 0.5) * 0.15, -0.5 - rnd() * 0.25, 0], 2.4, () => cGas.set(f.kind === 'lime' ? 0xaab4c0 : 0xff6b5a));
        lTop.position.y = top + 0.85; lGas.position.y = lAir.position.y = top + 0.32; lTop.element.innerHTML = `<b>${fmtT(Math.max(60, f.t))}</b>: ${stageName()}`;
        lGas.element.innerHTML = f.kind === 'enamel' ? 'oxygen in ↓' : f.kind === 'lime' ? 'CO₂ in ↓, water out ↑' : 'water vapour out ↑';
        const k = `${Math.round(Math.log(Math.max(f.t, 1)) * 40)}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: (s) => {
        if (!cur) return '';
        const head = `<div class="big">${fmtT(Math.max(60, f.t))} after painting</div><div class="row"><span>Stage</span><b>${stageName()}</b></div>`;
        const note = isPhone() ? '' : '<small>A teaching model of one coat. Real times vary with product, wall and thickness.</small>';
        if (s.kind === 'emulsion') {
          const ok = s.T > s.mfft;
          return `${head}
            <div class="row"><span>Water left</span><b>${((f.w / f.w0) * 100).toFixed(f.w / f.w0 < 0.1 ? 1 : 0)}%, leaving at ${(f.rate * 3600).toFixed(f.rate * 3600 < 10 ? 1 : 0)} g/m² an hour</b></div>
            <div class="row"><span>Touch dry</span><b>${fmtD(cur.touch)}</b></div>
            <div class="row"><span>Ready for the next coat</span><b>${fmtD(cur.recoat)}</b></div>
            <div class="row"><span>Full strength (washable)</span><b>${ok ? fmtD(cur.hard) : 'never'}</b></div>
            <div class="row"><span>Wall against MFFT</span><b style="color:${ok ? COL.ok : COL.bad}">${ok ? `${(s.T - s.mfft).toFixed(1)} °C above: it can fuse` : 'too cold: only powder'}</b></div>${note}`;
        }
        if (s.kind === 'enamel') return `${head}
            <div class="row"><span>Solvent left</span><b>${((f.w / f.w0) * 100).toFixed(0)}%</b></div>
            <div class="row"><span>Oil cross-linked by oxygen</span><b>${(f.H * 100).toFixed(0)}%</b></div>
            <div class="row"><span>Touch dry</span><b>${fmtD(cur.touch)}</b></div>
            <div class="row"><span>Hard dry</span><b>${fmtD(cur.recoat)}</b></div>
            <div class="row"><span>Fully cured</span><b>${fmtD(cur.hard)}</b></div>
            <div class="row"><span>Drier</span><b>${s.drier ? 'added: a catalyst' : 'none: eight times slower'}</b></div>${note}`;
        return `${head}
            <div class="row"><span>Lime turned to limestone</span><b>${(f.H * 100).toFixed(0)}%</b></div>
            <div class="row"><span>CO₂ taken from the air so far</span><b>${(f.H * LIME.co2PerM2).toFixed(1)} of ${LIME.co2PerM2.toFixed(0)} g per m²</b></div>
            <div class="row"><span>Dry to the touch</span><b>${fmtD(cur.touch)}</b></div>
            <div class="row"><span>Carbonated right through</span><b>${fmtD(cur.hard)}</b></div>
            <div class="row"><span>Reaction</span><b>Ca(OH)₂ + CO₂ → CaCO₃ + H₂O</b></div>${note}`;
      },
    };
  },
};
