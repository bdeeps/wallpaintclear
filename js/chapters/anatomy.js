// Chapter 1: what is in the tin, and what is on the wall.
// Left: one drop of paint magnified about 20,000 times, so a 0.25 µm pigment grain is the size of a
// pea. Right: the wall cut away into its layers (not to scale: the real thicknesses are on the board).
// Recipes are generic, by volume of the wet paint, typical of each kind and of no product:
//   they follow the usual textbook ranges (Lambourne & Strivens, "Paint and Surface Coatings";
//   Wicks et al., "Organic Coatings"): gloss enamels at a pigment volume concentration (PVC) of
//   15 to 25%, sheen emulsions 30 to 45%, matt emulsions 60 to 80%, distempers higher still.
// Sizes: latex spheres 0.1 to 0.5 µm, pigmentary TiO2 0.2 to 0.3 µm, extenders 1 to 20 µm.
// Wall: cement plaster about 12 mm on inside walls (IS 1661), putty 1 to 1.5 mm in two coats,
// primer and each topcoat 25 to 40 µm dry.
import { THREE, M, smooth } from '../kit.js';
import { TAU, rng, dots, board, panelBg, title, wrap, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, VIEW, TALLW, BW, BH, B1, B2, COL } from '../paint.js';

export const RECIPES = {
  sheen: { name: 'Sheen emulsion', carrier: 'water', water: 50, binder: 28, tio2: 10, ext: 6, add: 6, latex: true },
  matt: { name: 'Matt emulsion', carrier: 'water', water: 52, binder: 10, tio2: 5, ext: 29, add: 4, latex: true },
  distemper: { name: 'Distemper', carrier: 'water', water: 55, binder: 5, tio2: 1, ext: 36, add: 3, latex: false },
  enamel: { name: 'Oil enamel', carrier: 'solvent', water: 45, binder: 40, tio2: 12, ext: 1, add: 2, latex: false },
};
export const pvcOf = (r) => (r.tio2 + r.ext) / (r.tio2 + r.ext + r.binder);
const PARTS = [
  { id: 'binder', n: 'binder', col: '#ff9db8' }, { id: 'tio2', n: 'titanium dioxide', col: '#ffffff' },
  { id: 'ext', n: 'extender', col: '#c9b48a' }, { id: 'add', n: 'additives', col: '#5ce1a9' }, { id: 'water', n: 'carrier', col: '#6fb6ff' },
];
const LAYERS = [
  { n: 'Brick or block', th: 'about 230 mm', job: 'The wall itself. Porous: it drinks water and passes it on.', col: 0x9a4f38, w: 3.4, h: 4.0 },
  { n: 'Cement plaster', th: 'about 12 mm', job: 'Makes the wall flat. Must cure and dry before any paint.', col: 0x8d9197, w: 3.1, h: 3.5 },
  { n: 'Putty', th: '1 to 1.5 mm', job: 'Fills pinholes and dents so the film lies smooth.', col: 0xf2f0ea, w: 2.75, h: 3.0 },
  { n: 'Primer', th: 'about 30 µm', job: 'Soaks in, binds the dusty surface, evens out the suction.', col: 0xdfe6ee, w: 2.4, h: 2.5 },
  { n: 'Topcoat 1', th: 'about 35 µm', job: 'Colour and hiding.', col: 0x7fb7d6, w: 2.05, h: 2.0 },
  { n: 'Topcoat 2', th: 'about 35 µm', job: 'Finishes the hiding and takes the wear.', col: 0x5ea3c9, w: 1.7, h: 1.5 },
];

export default {
  id: 'anatomy',
  short: 'Inside the tin',
  title: 'What is in paint, and what is on the wall',
  subtitle: 'A drop of paint 20,000 times bigger, and a wall pulled apart into its layers.',
  view: { pos: [3.6, 5.0, 11.6], target: [2.2, 4.2, 0] },
  learn: `<p>Paint is a liquid that turns into a solid skin. It has four kinds of ingredient.</p>
    <p><b>Pigment</b> is the powder that you see. The white one is <b>titanium dioxide</b>, in grains about a quarter of a micrometre across: it gives paint its whiteness and its power to hide what is underneath. Cheap, chunky powders called <b>extenders</b> (chalk, talc, china clay) bulk the paint out.</p>
    <p><b>Binder</b> is the glue that becomes the film. In an emulsion paint it is millions of tiny soft plastic balls, called <b>latex</b>, each 0.1 to 0.5 µm wide, floating in water. In an oil enamel it is a sticky resin dissolved in solvent.</p>
    <p>The <b>carrier</b> (water or solvent) only makes the paint spreadable. It leaves. <b>Additives</b>, a few per cent in all, do the fine work: thickeners, dispersants that keep grains apart, defoamer, and a preservative so the tin does not rot.</p>
    <p>One number sums a recipe up: the <b>pigment volume concentration</b> (PVC), the share of the dry film that is powder and not binder. Low PVC gives a tough, shiny film. High PVC gives a cheap, matt, chalky one.</p>
    <p>On the wall, paint is only the top of a stack: <b>plaster</b>, <b>putty</b>, <b>primer</b> and two <b>topcoats</b>. All the paint together is about a tenth of a millimetre thick, about the same as a sheet of paper.</p>
    <p class="tip"><b>Try it:</b> slide <b>Sort the drop</b> to pull the ingredients apart, then switch from sheen emulsion to distemper and watch the binder almost vanish while the chalk takes over.</p>`,
  terms: [
    { t: 'Pigment', d: 'Fine solid powder that gives paint its colour and hiding power. It does not dissolve.' },
    { t: 'Binder', d: 'The part that forms the film and glues the pigment to the wall: acrylic latex, alkyd resin, oil, lime or glue.' },
    { t: 'Latex', d: 'Tiny balls of polymer floating in water. In paint they are 0.1 to 0.5 micrometres wide.' },
    { t: 'Extender', d: 'A cheap mineral powder such as chalk, talc or china clay that fills out the paint.' },
    { t: 'PVC', d: 'Pigment volume concentration: the pigment and extender as a share of the dry film by volume.' },
    { t: 'Primer', d: 'A thin first coat that soaks into the wall and gives the topcoat something sound to grip.' },
  ],
  defaults: { kind: 'sheen', sort: 0, explode: 0.55 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Which paint', options: [{ v: 'sheen', label: 'Sheen' }, { v: 'matt', label: 'Matt' }, { v: 'distemper', label: 'Distemper' }, { v: 'enamel', label: 'Enamel' }] },
    { key: 'sort', type: 'range', label: 'Sort the drop', min: 0, max: 1, step: 0.01, ends: ['mixed', 'sorted'], fmt: (v) => (v * 100).toFixed(0) + '%' },
    { key: 'explode', type: 'range', label: 'Pull the wall apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => (v * 100).toFixed(0) + '%' },
  ],
  quiz: [
    { q: 'What turns into the solid film when an emulsion paint dries?', options: ['The water', 'The tiny polymer balls of the binder', 'The titanium dioxide', 'The thickener'], answer: 1, why: 'The latex balls of binder pack together and fuse into one skin. The water only carries them to the wall and then leaves.' },
    { q: 'A paint has a very high PVC. What does that tell you?', options: ['It is mostly powder with little binder: matt and cheap, but weak', 'It is very glossy', 'It has no pigment', 'It contains lead'], answer: 0, why: 'PVC is the share of the dry film that is pigment and extender. High PVC means little binder to hold it, so the film is matt, porous and easier to rub off.' },
    { q: 'What is the primer for?', options: ['To add colour', 'To make the wall smell nice', 'To soak in, bind the dusty surface and give the topcoat an even grip', 'To make the paint dry slower'], answer: 2, why: 'Fresh plaster and putty are dusty and thirsty. Primer seals and binds them so the topcoat does not sink in patchily or peel.' },
  ],
  reel: [
    { ms: 5200, caption: 'Wall paint is a liquid that becomes a solid skin: pigment, binder, water and a few per cent of additives.', set: { kind: 'sheen', sort: 0, explode: 0.2, _b: 0 }, anim: { sort: [0, 1] }, view: TALLW, spin: 0 },
    { ms: 5200, caption: 'On the wall it is the top of a stack: plaster, putty, primer and two coats, together as thin as a sheet of paper.', set: { kind: 'sheen', sort: 1, _b: 1 }, anim: { explode: [0, 1] }, view: TALLW, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(7);
    // ---------------- the drop: a glass ball with the ingredients afloat in it (sizes are relative only)
    const C = [-2.15, 2.1, 0], R = 1.7;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0x8ec8ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, clearcoat: 1 }));
    ball.position.set(...C); ball.renderOrder = 5; root.add(ball);
    const inBall = (r) => { for (;;) { const p = [(rnd() * 2 - 1) * r, (rnd() * 2 - 1) * r, (rnd() * 2 - 1) * r]; if (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] < r * r) return p; } };
    const HOME = { binder: [-0.8, 0.72, 0.2], tio2: [0.78, 0.76, 0.2], ext: [0.0, -0.65, 0.2], add: [-0.05, 0.12, 0.8] };
    const mk = (n, r, seg, lit) => { const d = dots(n, r, 0xffffff, seg, lit); d.position.set(...C); root.add(d); return d; };
    const sets = {
      binder: { mesh: mk(90, 0.13, 12, true), n: 90, col: new THREE.Color(0xff9db8), spread: 0.62 },
      tio2: { mesh: mk(40, 0.085, 6, true), n: 40, col: new THREE.Color(0xffffff), spread: 0.42 },
      add: { mesh: mk(26, 0.045, 6, false), n: 26, col: new THREE.Color(0x5ce1a9), spread: 0.3 },
    };
    for (const id in sets) { const S = sets[id]; S.P = Array.from({ length: S.n }, () => ({ a: inBall(R * 0.86), b: inBall(S.spread).map((v, i) => v + HOME[id][i]), ph: rnd() * TAU })); for (let i = 0; i < S.n; i++) S.mesh.tint(i, S.col); }
    // extender: flat plates, each its own mesh so that they can tumble
    const extMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.8 });
    const ext = Array.from({ length: 16 }, () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3 + rnd() * 0.16, 0.3 + rnd() * 0.16, 0.07, 6), extMat);
      m.userData = { a: inBall(R * 0.74), b: inBall(0.5).map((v, i) => v + HOME.ext[i]), rot: [rnd() * TAU, rnd() * TAU, rnd() * TAU] };
      m.rotation.set(...m.userData.rot); root.add(m); return m;
    });
    const lDrop = stage.label('<b>one drop</b>, magnified 20,000×', [C[0] + 0.3, C[1] + R + 0.3, 0], root);
    const lB = stage.label('', [C[0] - 0.9, C[1] + 1.35, 0.6], root), lT = stage.label('titanium dioxide: 0.25 µm', [C[0] + 1.0, C[1] + 0.3, 0.6], root, 'hot');
    const lE = stage.label('extender: 1 to 20 µm', [C[0] + 0.1, C[1] - 1.35, 0.6], root), lA = stage.label('additives', [C[0] - 0.9, C[1] - 0.25, 1.2], root);

    // ---------------- the wall, cut away. Layers stack towards the viewer (+z).
    const wall = new THREE.Group(); wall.position.set(0.05, 0, -0.9); wall.scale.setScalar(0.86); root.add(wall);
    const TH = [0.5, 0.26, 0.12, 0.05, 0.05, 0.05];
    let z = 0;
    const slabs = LAYERS.map((L, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(L.w, L.h, TH[i]), new THREE.MeshStandardMaterial({ color: L.col, roughness: i < 2 ? 0.95 : 0.6 }));
      m.position.set(L.w / 2, L.h / 2 + 0.02, z + TH[i] / 2); z += TH[i]; m.castShadow = true; m.receiveShadow = true; wall.add(m);
      m.userData.z0 = m.position.z;
      const lab = stage.label(`${L.n}`, [L.w / 2 - 0.55, L.h / 2 - 0.22, TH[i] / 2 + 0.02], m);
      return { m, lab };
    });
    // brick courses drawn on the back layer
    const bt = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, 256, 256); for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) { g.fillStyle = `rgb(${150 + (r * 37 + k * 11) % 20},${78 + (r * 13 + k * 7) % 14},56)`; g.fillRect(k * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.9); return t; })();
    slabs[0].m.material.map = bt; slabs[0].m.material.color.set(0xffffff);

    let S = { ...s0 }, key = '';
    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); const r = RECIPES[S.kind]; title(g, `In the tin: ${r.name.toLowerCase()}`, 'by volume');
      let x = 24; const W = w - 48;
      PARTS.forEach((p) => { const v = r[p.id], pw = (v / 100) * W; g.fillStyle = p.col; g.fillRect(x, 62, pw - 2, 46); if (pw > 44) { g.fillStyle = '#10131a'; g.font = 'bold 18px sans-serif'; g.fillText(v + '%', x + 8, 92); } x += pw; });
      g.font = '18px sans-serif'; let y = 142;
      PARTS.forEach((p, i) => { const cx = 24 + (i % 2) * 300, cy = y + Math.floor(i / 2) * 30; g.fillStyle = p.col; g.fillRect(cx, cy - 14, 16, 16); g.fillStyle = COL.text; g.fillText(`${p.id === 'water' ? r.carrier : p.id === 'binder' ? (r.latex ? 'binder (latex balls)' : S.kind === 'enamel' ? 'binder (alkyd resin)' : 'binder (glue)') : p.n} ${r[p.id]}%`, cx + 24, cy); });
      const pvc = pvcOf(r) * 100;
      g.font = 'bold 22px sans-serif'; g.fillStyle = COL.gold; g.fillText(`PVC of the dry film: ${pvc.toFixed(0)}%`, 24, 262);
      g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.72)';
      wrap(g, pvc < 30 ? 'Plenty of binder round every grain: a tough, glossy, washable film.' : pvc < 50 ? 'Enough binder to wrap the pigment: a soft sheen that wipes clean.' : pvc < 82 ? 'More powder than the binder can wrap: matt, porous, cheaper per litre.' : 'Nearly all chalk, held by a little glue: it rubs off on your hand.', 24, 292, w - 48, 22);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '14px sans-serif'; g.fillText('Generic recipes, typical of each kind. Real products vary.', 24, h - 14);
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'On the wall, from the outside in', 'real thickness');
      g.font = '17px sans-serif';
      [...LAYERS].reverse().forEach((L, i) => {
        const y = 70 + i * 47; g.fillStyle = '#' + new THREE.Color(L.col).getHexString(); g.fillRect(22, y - 16, 20, 20);
        g.font = 'bold 18px sans-serif'; g.fillStyle = COL.text; g.fillText(L.n, 52, y); g.fillStyle = COL.gold; g.fillText(L.th, 215, y);
        g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(L.job, 52, y + 20);
      });
    }, B2);

    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        const narrow = fitNarrow(stage, [lA, lE, lT, lB, ...slabs.slice(0, 3).map((x) => x.lab)]);
        reelBoards([bA, bB], 0, stage, VIEW, s._b || 0, TALLW); phoneBoards(stage, [bA, bB], 0);
        const r = RECIPES[s.kind], k = smooth(clamp(s.sort, 0, 1));
        const share = { binder: r.latex ? r.binder / 28 : 0, tio2: r.tio2 / 12, add: r.add / 6 };
        for (const id in sets) {
          const Sx = sets[id], show = Math.round(Sx.n * clamp(share[id], 0, 1));
          for (let i = 0; i < Sx.n; i++) {
            const p = Sx.P[i], j = 0.05 * (1 - k * 0.6);
            Sx.mesh.place(i, lerp3(p.a[0], p.b[0], k) + j * Math.sin(time * 1.7 + p.ph), lerp3(p.a[1], p.b[1], k) + j * Math.cos(time * 1.3 + p.ph * 2), lerp3(p.a[2], p.b[2], k) + j * Math.sin(time * 1.1 + p.ph * 3), i < show ? 1 : 0.0001);
          }
          Sx.mesh.done();
        }
        const nExt = Math.round(ext.length * clamp(r.ext / 36, 0, 1));
        ext.forEach((m, i) => { const u = m.userData; m.visible = i < Math.max(nExt, r.ext > 0 ? 1 : 0); m.position.set(C[0] + lerp3(u.a[0], u.b[0], k), C[1] + lerp3(u.a[1], u.b[1], k), C[2] + lerp3(u.a[2], u.b[2], k)); m.rotation.x = u.rot[0] + time * 0.12 * (1 - k); m.rotation.z = u.rot[2] + time * 0.09 * (1 - k); });
        ball.material.color.set(s.kind === 'enamel' ? 0xe9b44c : 0x8ec8ff); ball.material.opacity = s.kind === 'enamel' ? 0.3 : 0.16;
        lB.element.innerHTML = r.latex ? 'latex balls: 0.1 to 0.5 µm' : s.kind === 'enamel' ? 'binder: resin dissolved in the solvent' : 'binder: a little glue in the water';
        const show = k > 0.6 && !narrow; lB.visible = show || (!r.latex && !narrow); lT.visible = show; lE.visible = show && r.ext > 3; lA.visible = show;
        lDrop.element.innerHTML = `<b>one drop of ${r.name.toLowerCase()}</b>, magnified 20,000×`;
        const e = smooth(clamp(s.explode, 0, 1));
        slabs.forEach((x, i) => { x.m.position.z = x.m.userData.z0 + i * 0.52 * e; x.lab.visible = (e > 0.25 || i === 5) && !(narrow && i < 3); });
        const kk = s.kind; if (kk !== key) { key = kk; bA.redraw(); }
      },
      readout: (s) => {
        const r = RECIPES[s.kind], pvc = pvcOf(r) * 100, vs = r.binder + r.tio2 + r.ext;
        return `<div class="big">${r.name}</div>
          <div class="row"><span>Carrier</span><b>${r.carrier}, ${r.water}% of the tin</b></div>
          <div class="row"><span>Solids left on the wall</span><b>${vs}% by volume</b></div>
          <div class="row"><span>Pigment volume concentration</span><b>${pvc.toFixed(0)}%</b></div>
          <div class="row"><span>Binder</span><b>${r.latex ? 'latex balls in water' : s.kind === 'enamel' ? 'alkyd resin in solvent' : 'glue in water'}</b></div>
          <div class="row"><span>Whole paint system on the wall</span><b>about 0.1 mm</b></div>
          ${isPhone() ? '' : '<small>Generic recipes by volume. The drop is magnified about 20,000 times; the wall layers are not to scale.</small>'}`;
      },
    };
  },
};
const lerp3 = (a, b, k) => a + (b - a) * k;
void M; void link;
