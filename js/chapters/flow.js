// Chapter 5: brush, roller and sticking. Two scenes.
//  "Flow": a wet band of paint on a wall. The ridges are brush marks (drawn far taller than life);
//   the bottom edge sags. Both are computed in paint.js: Orchard's levelling equation and the
//   gravity flow of a film, with a viscosity that rebuilds after the brush has gone (thixotropy).
//   Shear rates met by paint (Wicks et al., "Organic Coatings"; Patton, "Paint Flow and Pigment
//   Dispersion"): settling 0.001 to 0.1 per second, sagging and levelling 0.01 to 1, stirring and
//   pouring 10 to 100, brushing and rolling 1,000 to 10,000.
//  "Room": litres for a room. Spreading rate (m² per litre, per coat) = 10 × volume solids % ÷ dry
//   film thickness in µm; 15% is added for what stays in the roller and tray. One door (0.9 × 2.1 m)
//   and one window (1.2 × 1.2 m) are left out. Walls 3.0 m high.
import { THREE, smooth } from '../kit.js';
import {
  TAU, rng, board, panelBg, axes, title, line, wrap, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, VIEW, TALL, BW, BH, B1, B2, COL,
  cross, flowRun, etaAfter, stokes, spreadRate, OPEN,
} from '../paint.js';

const L_MARK = 1.5, HEIGHT = 3.0, OPENINGS = 0.9 * 2.1 + 1.2 * 1.2, LOSS = 0.15;
const fmtEta = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' Pa·s';
const room = (s) => { const walls = 2 * (s.len + s.wid) * HEIGHT, area = Math.max(0, walls - OPENINGS), sr = spreadRate(s.solids, s.dft), prac = sr * (1 - LOSS), litres = (area * s.coats) / prac; return { walls, area, sr, prac, litres }; };

export default {
  id: 'flow',
  short: 'Brush and roller',
  title: 'Brush, roller and sticking',
  subtitle: 'Paint is built to be thick in the tin, thin under the brush and thick again on the wall. Then: how many litres for a room.',
  view: VIEW,
  learn: `<p>Paint has to do three things that pull against each other. In the tin it must be <b>thick</b>, so the heavy pigment does not sink. Under the brush or roller it must be <b>thin</b>, so it spreads without effort. On the wall it must turn thick again quickly, so it does not <b>sag</b> and run, but not so quickly that the <b>brush marks</b> are frozen in before they can flatten.</p>
    <p>The answer is a liquid whose thickness depends on how fast you shear it. Paint is <b>shear-thinning</b>: stir or brush it hard and it thins hundreds of times over; leave it alone and it thickens (buttermilk and ketchup do the same: see ${link('buttermilkclear', 'ButtermilkClear', 'sour')}). It is also <b>thixotropic</b>: after the brush passes, the thickness takes a few seconds to come back. Those seconds are when surface tension pulls the ridges flat, which painters call <b>levelling</b>. Thickeners in the recipe set all of this.</p>
    <p><b>Why paint sticks.</b> A wall is rough and porous at a tiny scale. Wet paint flows into the pores and its binder grips there as it sets, like a key in a lock. So the wall must be <b>clean, dry and sound</b>. Dust, grease, damp or loose old paint leave nothing to grip. <b>Putty</b> fills the dents. <b>Primer</b> soaks in, glues the dusty surface together and evens out its thirst, so the topcoat is not sucked dry in patches.</p>
    <p><b>How much paint?</b> Only the solids stay on the wall. A litre with 38% solids, spread to a dry film 30 µm thick, covers about 12.7 m². Count the wall area, the number of coats and a little waste.</p>
    <p class="tip"><b>Try it:</b> lower the thickener until the band runs down the wall. Then raise it and shorten the recovery time until the brush marks freeze. Find the setting that does neither.</p>`,
  terms: [
    { t: 'Viscosity', d: 'A liquid\'s resistance to flowing. Water is about 0.001 Pa·s, honey about 10.' },
    { t: 'Shear-thinning', d: 'Getting thinner the faster it is stirred, brushed or sprayed.' },
    { t: 'Thixotropy', d: 'Taking time to thicken again after being sheared.' },
    { t: 'Levelling', d: 'Brush marks and roller stipple flattening out under surface tension before the paint sets.' },
    { t: 'Sagging', d: 'Wet paint sliding down a wall under its own weight, leaving runs and curtains.' },
    { t: 'Spreading rate', d: 'The area one litre covers in one coat, in square metres per litre.' },
  ],
  defaults: { show: 'flow', eta0: 80, rec: 3, wetf: 75, len: 4, wid: 3, coats: 2, solids: 38, dft: 30 },
  controls: [
    { key: 'show', type: 'seg', label: 'Scene', options: [{ v: 'flow', label: 'Flow on the wall' }, { v: 'room', label: 'Litres for a room' }] },
    { key: 'eta0', type: 'log', label: 'Thickener: viscosity at rest', min: 1, max: 1000, ends: ['thin', 'thick'], fmt: (v) => fmtEta(v) },
    { key: 'rec', type: 'log', label: 'Time to thicken again after the brush', min: 0.1, max: 60, ends: ['instant', 'slow'], fmt: (v) => (v < 10 ? v.toFixed(1) : v.toFixed(0)) + ' s' },
    { key: 'wetf', type: 'range', label: 'Wet film thickness', min: 40, max: 200, step: 5, ends: ['thin coat', 'heavy coat'], fmt: (v) => v.toFixed(0) + ' µm' },
    { key: 'len', type: 'range', label: 'Room length', min: 2.5, max: 7, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
    { key: 'wid', type: 'range', label: 'Room width', min: 2.5, max: 6, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
    { key: 'coats', type: 'seg', label: 'Coats', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] },
    { key: 'solids', type: 'range', label: 'Volume solids of the paint', min: 20, max: 50, step: 1, ends: ['watery', 'rich'], fmt: (v) => v.toFixed(0) + '%' },
    { key: 'dft', type: 'range', label: 'Dry film thickness per coat', min: 20, max: 50, step: 1, fmt: (v) => v.toFixed(0) + ' µm' },
  ],
  quiz: [
    { q: 'What does "shear-thinning" mean for paint?', options: ['It gets thinner as it dries', 'It gets thinner the faster it is brushed or stirred, and thickens again at rest', 'It gets thinner when cold', 'It can only be applied thinly'], answer: 1, why: 'Thick in the tin so pigment stays up, thin under the brush so it spreads, thick again on the wall so it does not run.' },
    { q: 'A paint thickens again the instant the brush leaves it. What goes wrong?', options: ['It runs down the wall', 'It never dries', 'The brush marks are frozen in before they can level', 'The colour fades'], answer: 2, why: 'Levelling needs a few seconds of low viscosity for surface tension to flatten the ridges. Thicken too fast and the marks stay.' },
    { q: 'A litre of paint has 40% volume solids and you want a dry film 40 µm thick. About how much wall does it cover in one coat?', options: ['1 m²', '10 m²', '40 m²', '100 m²'], answer: 1, why: 'Spreading rate = 10 × solids % ÷ thickness in µm = 10 × 40 ÷ 40 = 10 m² per litre, before waste.' },
  ],
  reel: [
    { ms: 5400, caption: 'Paint is thick in the tin, thin under the brush, then thick again on the wall, with a few seconds between for brush marks to level.', set: { show: 'flow', eta0: 80, rec: 3, wetf: 75 }, act: (s, inst) => inst.restart(), view: TALL, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(31);
    const gFlow = new THREE.Group(), gRoom = new THREE.Group(); root.add(gFlow, gRoom);
    // ---------------- flow: a wall and a wet band of paint
    const WX = -0.6, WW = 5.4, WH = 3.7;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(WW, WH, 0.25), new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.95 })); wall.position.set(WX, WH / 2, -0.4); wall.receiveShadow = true; gFlow.add(wall);
    const BWd = 4.4, BHt = 2.3, NX = 88, NY = 26, BY = 3.45;
    const geo = new THREE.PlaneGeometry(BWd, BHt, NX, NY), pos = geo.attributes.position, baseXY = Float32Array.from(pos.array);
    const band = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1c5f96, roughness: 0.3, metalness: 0, side: THREE.DoubleSide })); band.position.set(WX, BY - BHt / 2, -0.22); band.castShadow = true; gFlow.add(band);
    const drip = Array.from({ length: NX + 1 }, (_, i) => 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(i * 0.41 + 1.3) * Math.sin(i * 0.13 + 0.4), 2) + 0.15 * rnd());
    // a plain brush that sweeps down at the start of each run
    const brush = new THREE.Group(); gFlow.add(brush);
    const bristle = new THREE.Mesh(new THREE.BoxGeometry(BWd * 0.98, 0.42, 0.16), new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.9 })); bristle.position.y = 0.21;
    const ferrule = new THREE.Mesh(new THREE.BoxGeometry(BWd, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xb9bec8, metalness: 0.9, roughness: 0.3 })); ferrule.position.y = 0.52;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.16), new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: 0.6 })); handle.position.y = 1.1;
    brush.add(bristle, ferrule, handle);
    const lClock = stage.label('', [WX, WH + 0.3, 0], gFlow, 'hot'), lMark = stage.label('', [WX + 1.0, BY - 0.5, 0.2], gFlow), lSag = stage.label('', [WX - 1.2, BY - BHt - 0.75, 0.2], gFlow);
    // ---------------- room
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8fc0dc, roughness: 0.8, side: THREE.DoubleSide }), floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), floorMat), wB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat), wL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat), wR = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.7 })), win = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.1, emissive: 0x335577 }));
    gRoom.add(floor, wB, wL, wR, door, win);
    const tinG = new THREE.CylinderGeometry(0.16, 0.16, 0.34, 20), tinM = new THREE.MeshStandardMaterial({ color: 0xc7ccd4, metalness: 0.8, roughness: 0.35 });
    const tins = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(tinG, tinM); m.castShadow = true; gRoom.add(m); return m; });
    const lRoom = stage.label('', [-0.6, 3.9, 0], gRoom, 'hot'), lTins = stage.label('', [-0.6, 0.75, 2.6], gRoom);

    let S = { ...s0 }, run = flowRun(S.eta0, S.rec, S.wetf, L_MARK), key = '', clock = 0, tSim = 0;
    const at = (arr, t) => { const T = run.t; let i = 1; while (i < T.length - 1 && T[i] < t) i++; const k = clamp((t - T[i - 1]) / Math.max(1e-9, T[i] - T[i - 1]), 0, 1); return arr[i - 1] + (arr[i] - arr[i - 1]) * k; };
    const verdict = () => (run.sagMm > 1.5 && run.left > 0.1 ? 'Runs and still shows marks' : run.sagMm > 1.5 ? 'Runs and sags' : run.left > 0.1 ? 'Brush marks stay' : 'Levels smooth and stays put');

    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Thinner the harder you push it', 'viscosity against shear rate');
      const { X, Y, y0, y1 } = axes(g, w, h, { x0: 100, y1: 62, y0: h - 62, xMin: 1e-3, xMax: 1e5, xLog: true, yMin: 0.01, yMax: 2000, yLog: true, xTicks: [1e-3, 0.1, 10, 1000, 1e5], yTicks: [0.01, 1, 100], xFmt: (v) => (v >= 1 ? v.toLocaleString('en-IN') : String(v)) + '/s', yFmt: (v) => v + ' Pa·s' });
      [[1e-3, 0.1, 'in the tin', COL.latent], [0.1, 1, 'sag, level', COL.ok], [10, 100, 'stir, pour', COL.water], [1000, 1e4, 'brush, roll', COL.heat]].forEach(([a, b, n, c]) => { g.globalAlpha = 0.16; g.fillStyle = c; g.fillRect(X(a), y1, X(b) - X(a), y0 - y1); g.globalAlpha = 1; g.font = '14px sans-serif'; g.fillStyle = c; g.fillText(n, X(a) + 4, y1 + 16); });
      line(g, Array.from({ length: 81 }, (_, i) => { const r = Math.pow(10, -3 + i * 0.1); return [r, cross(S.eta0, r)]; }), X, Y, COL.gold, 5);
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(`from ${fmtEta(cross(S.eta0, 0.001))} at rest to ${fmtEta(cross(S.eta0, 5000))} under the brush`, 100, h - 14);
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      if (S.show === 'room') {
        const r = room(S); title(g, 'The sum for this room', '');
        const rows = [['Four walls', `2 × (${S.len.toFixed(1)} + ${S.wid.toFixed(1)}) × ${HEIGHT.toFixed(1)} = ${r.walls.toFixed(1)} m²`], ['Less a door and a window', `− ${OPENINGS.toFixed(1)} = ${r.area.toFixed(1)} m²`], ['One litre covers, in theory', `10 × ${S.solids} ÷ ${S.dft} = ${r.sr.toFixed(1)} m²`], ['After 15% waste', `${r.prac.toFixed(1)} m² a litre`], [`${S.coats} coat${S.coats > 1 ? 's' : ''}`, `${r.area.toFixed(1)} × ${S.coats} ÷ ${r.prac.toFixed(1)} = ${r.litres.toFixed(1)} L`]];
        rows.forEach(([a, b], i) => { const y = 78 + i * 44; g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(a, 24, y); g.font = 'bold 19px sans-serif'; g.fillStyle = i === 4 ? COL.gold : COL.text; g.fillText(b, 290, y); });
        g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; wrap(g, 'Only the solids stay on the wall. A richer paint, or a thinner coat, goes further. Rough or thirsty walls take more.', 24, 310, w - 48, 21);
        return;
      }
      title(g, 'Ten minutes on the wall', 'before the film sets');
      const mx = Math.max(2, Math.ceil(run.sagMm));
      const { X, Y, y0, y1, x1 } = axes(g, w, h, { x0: 70, x1: w - 70, y1: 66, y0: h - 60, xMin: 0, xMax: OPEN, yMin: 0, yMax: 1, xTicks: [0, 120, 300, 600], yTicks: [0, 0.5, 1], xFmt: (v) => (v < 60 ? v + ' s' : v / 60 + ' min'), yFmt: (v) => v * 100 + '%' });
      line(g, run.t.map((t, i) => [t, run.a[i]]), X, Y, COL.pink, 4); line(g, run.t.map((t, i) => [t, Math.min(1, run.sag[i] / mx)]), X, Y, COL.water, 4);
      g.font = '15px sans-serif'; g.fillStyle = COL.water; [0, mx / 2, mx].forEach((v) => g.fillText(v + ' mm', x1 + 8, Y(v / mx) + 5));
      g.font = 'bold 15px sans-serif'; g.fillStyle = COL.pink; g.fillText('brush marks left (left scale)', 78, 58); g.fillStyle = COL.water; g.fillText('sag (right scale)', 330, 58);
      const tx = clamp(tSim, 0, OPEN); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(tx), y1); g.lineTo(X(tx), y0); g.stroke();
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(`Verdict: ${verdict().toLowerCase()}.`, 70, h - 14);
    }, B2);

    return {
      restart() { clock = 0; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lMark, lSag, lTins]); reelBoards([bA, bB], -0.4, stage, VIEW); phoneBoards(stage, [bA, bB], s.show === 'room' ? 1 : 0);
        const k = `${s.show}|${s.eta0.toFixed(2)}|${s.rec.toFixed(2)}|${s.wetf}|${s.len}|${s.wid}|${s.coats}|${s.solids}|${s.dft}`;
        if (k !== key) { key = k; run = flowRun(s.eta0, s.rec, s.wetf, L_MARK); bA.redraw(); bB.redraw(); }
        gFlow.visible = s.show === 'flow'; gRoom.visible = s.show === 'room';
        [lClock, lMark, lSag].forEach((l) => { l.visible = gFlow.visible && !(narrow && l !== lClock); }); lRoom.visible = gRoom.visible; lTins.visible = gRoom.visible && !narrow;
        if (gFlow.visible) {
          // one run: brush down (1 s), then ten minutes squeezed into 8 s, then a pause
          clock += dt; const cyc = clock % 12, stroke = clamp(cyc / 1.0, 0, 1), u = clamp((cyc - 1.0) / 8, 0, 1);
          const prev = tSim; tSim = OPEN * Math.pow(u, 2.2);
          const a = cyc < 1 ? 1 : at(run.a, tSim), sag = cyc < 1 ? 0 : at(run.sag, tSim);
          const yFront = BHt / 2 - stroke * BHt, sagU = clamp(sag * 0.16, 0, 1.25), thick = 0.03 + 0.0006 * s.wetf;
          for (let i = 0, n = pos.count; i < n; i++) {
            const x = baseXY[i * 3], y0 = baseXY[i * 3 + 1], ix = i % (NX + 1), painted = y0 >= yFront - 1e-6;
            const v = (BHt / 2 - y0) / BHt;                                    // 0 at the top, 1 at the bottom edge
            const ridge = Math.sin((x / BWd) * TAU * 22) * 0.5 + 0.3 * Math.sin((x / BWd) * TAU * 47 + 1);
            pos.setX(i, x); pos.setY(i, painted ? y0 - sagU * drip[ix] * Math.pow(v, 3) : yFront);
            pos.setZ(i, painted ? thick + 0.075 * a * ridge + 0.05 * sagU * Math.pow(v, 6) * drip[ix] : 0);
          }
          pos.needsUpdate = true; geo.computeVertexNormals();
          brush.visible = cyc < 1.35; brush.position.set(WX, BY - stroke * BHt - 0.02 + (cyc > 1 ? (cyc - 1) * 0.4 : 0), -0.05 + (cyc > 1 ? (cyc - 1) * 2.2 : 0)); brush.rotation.x = 0.35;
          lClock.element.innerHTML = cyc < 1 ? '<b>brushing</b>: thin under the bristles' : `<b>${tSim < 60 ? tSim.toFixed(0) + ' s' : (tSim / 60).toFixed(1) + ' min'}</b> after the brush: ${fmtEta(etaAfter(s.eta0, s.rec, tSim))}`;
          lMark.element.innerHTML = `brush marks: ${(a * 100).toFixed(a < 0.1 ? 1 : 0)}% left`; lSag.element.innerHTML = `sag: ${sag.toFixed(sag < 10 ? 1 : 0)} mm`;
          if (Math.round(prev / 6) !== Math.round(tSim / 6)) bB.redraw();
        } else {
          const sc = 0.85, L = s.len * sc, Wd = s.wid * sc, Hh = HEIGHT * sc, cx = -0.6, cz = -0.3;
          floor.scale.set(L, 1, Wd); floor.position.set(cx, 0.04, cz);
          wB.scale.set(L, Hh, 1); wB.position.set(cx, Hh / 2, cz - Wd / 2);
          wL.scale.set(Wd, Hh, 1); wL.rotation.y = Math.PI / 2; wL.position.set(cx - L / 2, Hh / 2, cz);
          wR.scale.set(Wd, Hh, 1); wR.rotation.y = -Math.PI / 2; wR.position.set(cx + L / 2, Hh / 2, cz);
          door.scale.set(0.9 * sc, 2.1 * sc, 1); door.position.set(cx - L / 4, 1.05 * sc + 0.04, cz - Wd / 2 + 0.01);
          win.scale.set(1.2 * sc, 1.2 * sc, 1); win.position.set(cx + L / 4, 1.6 * sc, cz - Wd / 2 + 0.01);
          const r = room(s), n = Math.min(40, Math.ceil(r.litres));
          tins.forEach((m, i) => { m.visible = i < n; const row = Math.floor(i / 10), col = i % 10; m.position.set(cx - 1.7 + col * 0.38, 0.25 + 0.0, cz + Wd / 2 + 0.45 + row * 0.38); });
          lRoom.position.set(cx, Hh + 0.45, cz - Wd / 2); lRoom.element.innerHTML = `<b>${r.area.toFixed(1)} m²</b> of wall, ${s.coats} coat${s.coats > 1 ? 's' : ''}: <b>${r.litres.toFixed(1)} litres</b>`;
          lTins.position.set(cx, 0.75, cz + Wd / 2 + 0.6); lTins.element.innerHTML = `${Math.ceil(r.litres)} one-litre tins`;
        }
        void smooth;
      },
      readout: (s) => {
        if (s.show === 'room') {
          const r = room(s);
          return `<div class="big">${r.litres.toFixed(1)} litres</div>
            <div class="row"><span>Room</span><b>${s.len.toFixed(1)} × ${s.wid.toFixed(1)} × ${HEIGHT.toFixed(1)} m</b></div>
            <div class="row"><span>Wall to paint</span><b>${r.area.toFixed(1)} m²</b></div>
            <div class="row"><span>Spreading rate, in theory</span><b>${r.sr.toFixed(1)} m² a litre</b></div>
            <div class="row"><span>With 15% waste</span><b>${r.prac.toFixed(1)} m² a litre</b></div>
            <div class="row"><span>Each coat</span><b>${s.dft} µm dry, ${(s.dft / (s.solids / 100)).toFixed(0)} µm wet</b></div>
            <div class="row"><span>Solids left on the walls</span><b>${((r.area * s.coats * s.dft) / 1000).toFixed(2)} litres</b></div>
            ${isPhone() ? '' : '<small>Walls only; one door and one window left out.</small>'}`;
        }
        const rest = cross(s.eta0, 0.001), br = cross(s.eta0, 5000), vSink = stokes(1.5e-6, 2700, rest) * 86400 * 30 * 1000, vWater = stokes(1.5e-6, 2700, 0.001) * 3600 * 1000;
        return `<div class="big">${verdict()}</div>
          <div class="row"><span>Viscosity at rest</span><b>${fmtEta(rest)}</b></div>
          <div class="row"><span>Under the brush</span><b>${fmtEta(br)}: ${(rest / br).toFixed(0)}× thinner</b></div>
          <div class="row"><span>Brush marks left after 10 min</span><b style="color:${run.left > 0.1 ? COL.bad : COL.ok}">${(run.left * 100).toFixed(run.left < 0.1 ? 1 : 0)}%</b></div>
          <div class="row"><span>Sag down the wall</span><b style="color:${run.sagMm > 1.5 ? COL.bad : COL.ok}">${run.sagMm.toFixed(run.sagMm < 10 ? 1 : 0)} mm</b></div>
          <div class="row"><span>A chalk grain sinks in the tin</span><b>${vSink < 0.1 ? vSink.toFixed(3) : vSink.toFixed(1)} mm a month</b></div>
          <div class="row"><span>The same grain in plain water</span><b>${vWater.toFixed(0)} mm an hour</b></div>
          ${isPhone() ? '' : '<small>Brush marks 1.5 mm apart, grain 3 µm, brushing at 5,000 per second.</small>'}`;
      },
    };
  },
};
