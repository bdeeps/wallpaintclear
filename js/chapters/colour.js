// Chapter 4: colour and sheen.
// Left: a painted panel and a plain tin under four dosing nozzles (a generic tinting machine, no
// brand). White light arrives as seven coloured rays; each comes back as strong as the film reflects
// that wavelength. Right: a slice of the film's surface under a gloss meter's 60° beam.
// Colour: K/S adds over the colourants (Kubelka–Munk), then CIE 1931 → sRGB (paint.js). The
// absorption shapes and tint strengths are smooth teaching curves, not measured products.
// Sheen: gloss at 60° from Fresnel reflection and surface roughness (paint.js). The usual bands at
// 60°: matt under 10 gloss units, eggshell 10 to 25, satin 25 to 45, semi-gloss 45 to 70, gloss over 70.
import { THREE } from '../kit.js';
import {
  TAU, rng, dots, puffs, board, panelBg, axes, title, line, wrap, beam, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, VIEW, TALLW, BW, BH, B1, B2, COL,
  TINTS, WL, tintSpectrum, spectrumRGB, gloss60, sheenName, roughness, CPVC, GLOSS_MAX,
} from '../paint.js';

const RAYS = [[430, 0x6a4cff], [470, 0x2f7bff], [510, 0x19d3a2], [550, 0x7be04a], [580, 0xffe14a], [610, 0xff9a3c], [650, 0xff4a3c]];
const IDS = ['yellow', 'red', 'blue', 'black'];
const dose = (s) => ({ yellow: s.yellow, red: s.red, blue: s.blue, black: s.black });
const PRESET = { Cream: [6, 0.5, 0, 0], Terracotta: [10, 22, 0, 0.6], 'Sky blue': [0, 0, 2.2, 0], 'Sage green': [14, 0, 2.6, 0.3], Grey: [0.6, 0, 0.3, 1.6], White: [0, 0, 0, 0] };

export default {
  id: 'colour',
  short: 'Colour and sheen',
  title: 'Colour and sheen: what the film does to light',
  subtitle: 'Pigments subtract colours from white light. Roughness decides between matt and gloss.',
  view: VIEW,
  learn: `<p>White paint sends every colour back. A <b>coloured pigment</b> works by taking some away. Yellow iron oxide absorbs blue and violet light and returns the rest, so you see yellow. Red iron oxide (the colour of geru and terracotta) absorbs everything up to orange. <b>Phthalocyanine blue</b> absorbs red and orange. <b>Carbon black</b> absorbs it all. Mixing pigments subtracts more: yellow plus blue leaves only green. This is the opposite of mixing coloured lights (see ${link('lightingclear', 'LightingClear')} and ${link('eyeclear', 'EyeClear')}).</p>
    <p><b>The tinting machine</b> at the paint shop uses this. The shop stocks a few white or clear <b>bases</b>. For your shade, the machine squirts measured doses of a dozen or so strong liquid <b>colourants</b> into a tin of base, and a shaker mixes it. A few millilitres in a litre is enough, because the white pigment scatters light past the colour grains again and again.</p>
    <p><b>Sheen</b> is about the surface, not the colour. A perfectly smooth film reflects like a mirror: a bright highlight, which is <b>gloss</b>. A rough one sends the reflection everywhere: <b>matt</b>. The roughness comes from the recipe. With plenty of binder (low <b>PVC</b>) the resin flows over the grains and sets smooth. With lots of powder, grains poke through the surface and break up the reflection.</p>
    <p>Each has its use. <b>Matt</b> hides bumps and patches in a wall, since no highlight gives them away, but its porous surface holds dirt. <b>Gloss</b> and satin films are tight and smooth, so they wash well, yet they show every dent. That is why ceilings are matt and doors are gloss.</p>
    <p class="tip"><b>Try it:</b> add yellow, then a little blue, and watch the returned rays change. Then slide the PVC from 15% to 70% and watch the mirror beam fan out.</p>`,
  terms: [
    { t: 'Subtractive colour', d: 'Colour made by removing parts of white light. Pigments and inks work this way.' },
    { t: 'Colourant', d: 'A strong liquid paste of one pigment that a tinting machine doses into a base paint.' },
    { t: 'Base', d: 'A white or clear paint made to be tinted. Deep colours use bases with little or no white pigment.' },
    { t: 'Iron oxide', d: 'Rust-family minerals that give the yellow, red and brown earth colours. Cheap, lightfast and safe.' },
    { t: 'Gloss unit', d: 'The gloss meter\'s scale: polished black glass reads 100. Wall paints run from about 2 (dead matt) to 85 (high gloss).' },
    { t: 'Sheen', d: 'How shiny a dried paint film looks: matt, eggshell, satin, semi-gloss or gloss.' },
  ],
  defaults: { yellow: 14, red: 0, blue: 2.6, black: 0, pvc: 40 },
  controls: [
    { key: 'yellow', type: 'range', label: 'Yellow iron oxide', min: 0, max: 40, step: 0.5, fmt: (v) => v.toFixed(1) + ' mL a litre' },
    { key: 'red', type: 'range', label: 'Red iron oxide', min: 0, max: 40, step: 0.5, fmt: (v) => v.toFixed(1) + ' mL a litre' },
    { key: 'blue', type: 'range', label: 'Phthalo blue', min: 0, max: 15, step: 0.1, fmt: (v) => v.toFixed(1) + ' mL a litre' },
    { key: 'black', type: 'range', label: 'Carbon black', min: 0, max: 8, step: 0.1, fmt: (v) => v.toFixed(1) + ' mL a litre' },
    { key: 'shade', type: 'buttons', label: 'Shades', items: Object.keys(PRESET).map((n) => ({ label: n, act: (s) => { [s.yellow, s.red, s.blue, s.black] = PRESET[n]; } })) },
    { key: 'pvc', type: 'range', label: 'Pigment volume concentration', min: 10, max: 85, step: 1, ends: ['resin rich', 'powder rich'], fmt: (v) => v.toFixed(0) + '%', hint: 'The critical PVC here is 55%.' },
  ],
  quiz: [
    { q: 'Why does a wall painted with yellow iron oxide look yellow?', options: ['The pigment makes yellow light', 'The pigment absorbs blue and violet light and returns the rest', 'Yellow light is heavier', 'The binder is yellow'], answer: 1, why: 'Pigments subtract. Yellow oxide soaks up the blue end of the spectrum, and the red and green light that returns looks yellow to the eye.' },
    { q: 'How does a paint shop make thousands of shades?', options: ['It stocks a tin of every shade', 'It dyes the wall afterwards', 'A machine doses small amounts of a few strong colourants into a base paint', 'It mixes coloured lights'], answer: 2, why: 'A dozen or so colourants and a few bases are enough. The recipe for each shade is a list of doses.' },
    { q: 'Which finish hides the bumps in an uneven wall best?', options: ['Matt, because it has no bright highlights to show them up', 'High gloss, because it is smooth', 'Satin, because it is in between', 'They are all the same'], answer: 0, why: 'A rough, matt surface scatters reflections in all directions. Gloss gives sharp highlights that reveal every dent, though it washes better.' },
  ],
  reel: [
    { ms: 5600, caption: 'Coloured pigments subtract light, so a shop\'s machine makes any shade by dosing a few millilitres of colourant into a white base.', set: { yellow: 0, red: 0, blue: 0, black: 0, pvc: 40 }, anim: { yellow: [0, 14], blue: [0, 2.6] }, view: TALLW, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(5);
    // ---------------- the painted panel and the tin
    const PX = -2.75, PW = 2.3, PH = 3.0, PY = 0.25;
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.16), panelMat); panel.position.set(PX, PY + PH / 2, -0.9); panel.castShadow = true; root.add(panel);
    const tinMat = new THREE.MeshStandardMaterial({ color: 0xb9bec8, metalness: 0.85, roughness: 0.35 });
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.95, 40, 1, true), tinMat); tin.material.side = THREE.DoubleSide; tin.position.set(-0.75, 0.48, 0.5); tin.castShadow = true; root.add(tin);
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), tinMat); base.rotation.x = -Math.PI / 2; base.position.set(-0.75, 0.01, 0.5); root.add(base);
    const paintTop = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); paintTop.rotation.x = -Math.PI / 2; paintTop.position.set(-0.75, 0.8, 0.5); root.add(paintTop);
    // the dosing head: four small canisters over the tin
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.6 })); head.position.set(-0.75, 2.45, 0.5); root.add(head);
    const post = beam([0.15, 0, 0.1], [0.15, 2.45, 0.1], 0.06, new THREE.MeshStandardMaterial({ color: 0x3a4250 })); root.add(post);
    const drops = IDS.map((id, i) => {
      const x = -1.26 + i * 0.34, c = new THREE.Color(TINTS[id].col);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 20), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); can.position.set(x, 2.76, 0.5); root.add(can);
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.16, 12), tinMat); noz.position.set(x, 2.32, 0.5); root.add(noz);
      const p = puffs(root, 14, 0.05, c.getHex(), rnd, true);
      return { id, x, p };
    });
    // white light in, coloured light out
    const A = [-0.2, 4.05, 2.6], Bq = [PX, PY + PH * 0.6, -0.8], Cq = [-3.2, 1.3, 3.0];
    const rays = RAYS.map(([wl, col], i) => {
      const off = (i - 3) * 0.085, m = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
      const a = beam([A[0], A[1] + off, A[2]], [Bq[0] + off * 1.2, Bq[1] + off * 2.4, Bq[2]], 0.022, m, 8); a.castShadow = false;
      const b = beam([Bq[0] + off * 1.2, Bq[1] + off * 2.4, Bq[2]], [Cq[0] + off * 2.2, Cq[1] + off * 2.6, Cq[2]], 0.03, m, 8); b.castShadow = false;
      root.add(a, b); return { wl, b };
    });
    const lIn = stage.label('white light in', [A[0] + 0.1, A[1] + 0.3, A[2]], root), lOut = stage.label('', [PX - 0.1, PY + PH + 0.28, -0.8], root, 'hot');
    const lTin = stage.label('colourants into a white base', [-0.75, 0.2, 1.4], root);
    // ---------------- the gloss slice
    const GX0 = 0.75, GX1 = 3.35, GY = 1.25, NPT = 120;
    const body = new THREE.Mesh(new THREE.BoxGeometry(GX1 - GX0, GY - 0.05, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); body.position.set((GX0 + GX1) / 2, (GY - 0.05) / 2 + 0.02, -0.2); root.add(body);
    const prof = Array.from({ length: NPT }, (_, i) => Math.sin(i * 1.9 + 1) * 0.5 + Math.sin(i * 0.73 + 2) * 0.35 + (rnd() - 0.5) * 0.9);
    const surfGeo = new THREE.BufferGeometry(); surfGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NPT * 2 * 3), 3));
    const idx = []; for (let i = 0; i < NPT - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); surfGeo.setIndex(idx);
    const surf = new THREE.Mesh(surfGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false })); surf.frustumCulled = false; root.add(surf);
    const bumps = dots(34, 0.055, 0xf4f6fa, 8, true); root.add(bumps); const BP = Array.from({ length: 34 }, () => [rnd(), rnd()]);
    const hit = [(GX0 + GX1) / 2, GY + 0.04, 0.22], s60 = Math.sin(Math.PI / 3), c60 = Math.cos(Math.PI / 3);
    const inRay = beam([hit[0] - 2.0 * s60, hit[1] + 2.0 * c60, hit[2]], hit, 0.035, new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false }), 8); root.add(inRay);
    const NF = 17, fan = Array.from({ length: NF }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, toneMapped: false })); m.position.set(...hit); root.add(m); return m; });
    const lG = stage.label('', [hit[0], GY + 2.6, 0.2], root, 'hot'), lG2 = stage.label('beam at 60°', [hit[0] - 1.55, GY + 1.25, 0.2], root), lG3 = stage.label('', [hit[0], 0.25, 0.6], root);

    let S = { ...s0 }, R = tintSpectrum(dose(S)), C = spectrumRGB(R), key = '';
    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Light the paint sends back', 'by wavelength');
      const { X, Y, y0 } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 70, xMin: 400, xMax: 700, yMin: 0, yMax: 1, xTicks: [400, 500, 600, 700], yTicks: [0, 0.5, 1], xFmt: (v) => v + ' nm', yFmt: (v) => v * 100 + '%' });
      const grad = g.createLinearGradient(X(400), 0, X(700), 0);
      [[0, '#5b3cff'], [0.2, '#2f7bff'], [0.36, '#19d3a2'], [0.5, '#7be04a'], [0.6, '#ffe14a'], [0.72, '#ff9a3c'], [1, '#ff2a2a']].forEach(([p, c]) => grad.addColorStop(p, c));
      g.fillStyle = grad; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(X(400), y0); WL.forEach((l, i) => g.lineTo(X(l), Y(R[i]))); g.lineTo(X(700), y0); g.closePath(); g.fill(); g.globalAlpha = 1;
      line(g, WL.map((l, i) => [l, R[i]]), X, Y, '#fff', 3);
      g.fillStyle = C.css; g.fillRect(70, h - 44, 120, 32); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.strokeRect(70, h - 44, 120, 32);
      g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('the colour your eye makes of it, in even white light', 204, h - 22);
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Shine against powder', 'gloss at 60°');
      const { X, Y, x0, x1 } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 60, xMin: 10, xMax: 85, yMin: 0, yMax: 90, xTicks: [10, 25, 40, 55, 70, 85], yTicks: [0, 10, 25, 45, 70, 90], xFmt: (v) => v + '%', yFmt: (v) => v + '' });
      [[70, 'gloss'], [45, 'semi-gloss'], [25, 'satin'], [10, 'eggshell'], [0, 'matt']].forEach(([v, n]) => { g.font = '14px sans-serif'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(n, x1 - g.measureText(n).width - 6, Y(v) - 5); });
      g.strokeStyle = COL.bad; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(CPVC * 100), Y(0)); g.lineTo(X(CPVC * 100), Y(90)); g.stroke(); g.setLineDash([]); g.fillStyle = COL.bad; g.font = '14px sans-serif'; g.fillText('critical PVC', X(CPVC * 100) + 6, Y(82));
      line(g, Array.from({ length: 76 }, (_, i) => [10 + i, gloss60((10 + i) / 100)]), X, Y, COL.gold, 5);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(S.pvc), Y(gloss60(S.pvc / 100)), 8, 0, TAU); g.fill();
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('pigment volume concentration of the dry film', x0, h - 14);
    }, B2);

    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lIn, lTin, lG2, lG3]); reelBoards([bA, bB], 0, stage, VIEW, 0, TALLW); phoneBoards(stage, [bA, bB], 0);
        const k = `${s.yellow}|${s.red}|${s.blue}|${s.black}|${s.pvc}`;
        if (k !== key) { key = k; R = tintSpectrum(dose(s)); C = spectrumRGB(R); bA.redraw(); bB.redraw(); }
        const g = gloss60(s.pvc / 100), gk = g / GLOSS_MAX;
        panelMat.color.setHex(C.hex); paintTop.material.color.setHex(C.hex); body.material.color.setHex(C.hex); surf.material.color.setHex(C.hex).multiplyScalar(0.8); body.material.color.multiplyScalar(0.8);
        drops.forEach((d) => d.p.step(dt, clamp(s[d.id] / (d.id === 'blue' ? 15 : d.id === 'black' ? 8 : 40), 0, 1) * 9 + (s[d.id] > 0 ? 1.2 : 0), () => [d.x, 2.22, 0.5], () => [0, -2.2, 0], 0.62));
        rays.forEach((r) => { const v = R[(r.wl - 400) / 10]; const w = Math.max(0.06, Math.pow(v, 1.2) * 1.6); r.b.scale.set(w, 1, w); });
        lOut.element.innerHTML = `<b>comes back</b>: ${(C.Y * 100).toFixed(0)}% of the light`;
        // gloss slice: a ribbon whose top edge is the rough surface (heights exaggerated)
        const amp = 0.02 + 0.55 * roughness(s.pvc / 100), a = surfGeo.attributes.position.array;
        for (let i = 0; i < NPT; i++) { const x = GX0 + ((GX1 - GX0) * i) / (NPT - 1), y = GY + prof[i] * amp; a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = 0.2; a[i * 6 + 3] = x; a[i * 6 + 4] = GY - 0.3; a[i * 6 + 5] = 0.2; }
        surfGeo.attributes.position.needsUpdate = true;
        const nb = Math.round(34 * clamp((s.pvc - 10) / 70, 0, 1));
        BP.forEach((p, i) => bumps.place(i, GX0 + 0.08 + p[0] * (GX1 - GX0 - 0.16), GY - 0.26 + p[1] * (0.22 + amp * 0.9), 0.24, i < nb ? 1 : 0.0001)); bumps.done();
        const spread = (2 + 78 * Math.pow(1 - gk, 0.8)) * (Math.PI / 180);
        fan.forEach((m, i) => { const u = (i - (NF - 1) / 2) / ((NF - 1) / 2), ang = clamp(Math.PI / 3 + u * spread, -1.45, 1.45), w = Math.exp(-u * u * 2.2); m.rotation.z = -ang; const len = 0.5 + 1.7 * (gk * w + (1 - gk) * 0.42 * Math.cos(ang) * 1.3); m.scale.set(1, Math.max(0.05, len), 1); m.material.opacity = clamp(0.25 + 0.75 * (gk * w + (1 - gk) * 0.35), 0, 1); });
        lG.element.innerHTML = `<b>${sheenName(g)}</b>: ${g.toFixed(g < 10 ? 1 : 0)} gloss units`;
        lG3.element.innerHTML = `the film's surface, in section`;
        void time;
      },
      readout: (s) => {
        const g = gloss60(s.pvc / 100), tot = s.yellow + s.red + s.blue + s.black, sg = roughness(s.pvc / 100);
        const band = (a, b) => { let v = 0, n = 0; WL.forEach((l, i) => { if (l >= a && l < b) { v += R[i]; n++; } }); return (v / n) * 100; };
        return `<div class="big"><span style="display:inline-block;width:.9em;height:.9em;border-radius:3px;background:${C.css};border:1px solid rgba(255,255,255,.5);vertical-align:-.08em"></span> ${sheenName(g)}</div>
          <div class="row"><span>Colourant dosed</span><b>${tot.toFixed(1)} mL a litre</b></div>
          <div class="row"><span>Blue / green / red light returned</span><b>${band(400, 490).toFixed(0)}% / ${band(500, 570).toFixed(0)}% / ${band(600, 701).toFixed(0)}%</b></div>
          <div class="row"><span>Brightness to the eye</span><b>${(C.Y * 100).toFixed(0)}%</b></div>
          <div class="row"><span>Gloss at 60°</span><b>${g.toFixed(g < 10 ? 1 : 0)} gloss units of 100</b></div>
          <div class="row"><span>Surface roughness</span><b>${(sg * 1000).toFixed(0)} nm</b></div>
          <div class="row"><span>In use</span><b>${s.pvc / 100 > CPVC ? 'hides flaws, marks easily' : g > 45 ? 'washes well, shows dents' : 'wipes clean, forgiving'}</b></div>
          ${isPhone() ? '' : '<small>Teaching curves for colourants and roughness. Real shades are measured.</small>'}`;
      },
    };
  },
};
void dots;
