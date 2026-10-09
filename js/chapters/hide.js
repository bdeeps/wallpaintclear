// Chapter 3: why white paint hides. A slice through a dry film lying on a black and white hiding
// chart (the trade's test card). Photons enter from above and take a random walk between pigment
// grains. Scale: 2.2 scene units = 150 µm of film.
// Two sums run side by side and agree to within a per cent:
//  - Kubelka and Munk's two-flux sum (kmR in paint.js) gives reflectance over black and over white;
//  - a Monte Carlo count of photons: free paths drawn from exp(−L/ℓ) with ℓ = 3/(4·S), isotropic
//    scattering, absorption K/2 per unit path, diffuse light in, a ground that reflects 0% or 80%.
//    (S = ¾ of the transport scattering coefficient: Mudgett & Richards, Appl. Opt. 10, 1971.)
// Contrast ratio = reflectance over black / over white; 0.98 counts as full hiding (ASTM D2805).
import { THREE } from '../kit.js';
import {
  TAU, rng, dots, board, panelBg, axes, title, line, wrap, dashH, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, VIEW, TALL, BW, BH, B1, B2, COL,
  PIG, filmOptics, kmR, contrastRatio, hidingThickness, sizeF, contrast, R_WHITE, N_BINDER, CPVC,
} from '../paint.js';

const X0 = -3.7, X1 = 2.5, MID = (X0 + X1) / 2, Y0 = 0.5, U = 2.2 / 150, NPH = 44;
const grey = (R) => { const v = Math.round(255 * Math.pow(clamp(R, 0, 1), 1 / 2.2)); return (v << 16) | (v << 8) | v; };
const opt = (s, wet = s.wet) => filmOptics({ pig: s.pig, tio2: s.tio2 / 100, chalk: s.chalk / 100, d: s.d, wet });

export default {
  id: 'hide',
  short: 'Why white hides',
  title: 'Why white hides: light lost in a maze',
  subtitle: 'Paint covers by scattering light, not by blocking it. Follow photons through the film.',
  view: VIEW,
  learn: `<p>A coat of white paint is thinner than a hair, yet it hides a black wall. It does this by <b>scattering</b>, not by soaking light up.</p>
    <p>Every time light crosses from binder into a pigment grain it bends and bounces (see ${link('snellclear', 'SnellClear')}). The bigger the jump in <b>refractive index</b>, the stronger the bounce. Binder is about 1.5. <b>Titanium dioxide</b> (rutile) is about 2.7, the highest of any common white pigment, so each grain is a powerful scatterer. A photon that enters the film is knocked about from grain to grain, in a <b>random walk</b>, and most often stumbles back out of the top before it ever reaches the wall. Light coming back from every depth, in every colour: that is white. Fog hides a village the same way (${link('fogclear', 'FogClear')}).</p>
    <p><b>Chalk</b> has an index of about 1.6, almost the same as the binder. Wrapped in binder it nearly disappears, like glass in water. So chalk is a filler, not a hiding pigment.</p>
    <p><b>Size matters too.</b> A grain scatters best when it is about half the wavelength of light: 0.2 to 0.3 µm. Smaller grains are too small for the wave to notice. Bigger ones waste their insides.</p>
    <p>There is one more trick, <b>dry hiding</b>. Pack in so much powder that the binder cannot fill the gaps, and tiny pockets of <b>air</b> are left. Air against chalk is a big index jump, so a cheap chalky paint or a distemper looks thin and grey while wet, then turns white as it dries. A rich paint does the reverse: it looks its best wet and loses a little on drying.</p>
    <p class="tip"><b>Try it:</b> thin the film until the black tile shows, then swap rutile for chalk. Now push chalk past 55% and flip <b>Wet</b> on and off to see dry hiding appear.</p>`,
  terms: [
    { t: 'Scattering', d: 'Light being knocked into new directions by small particles, without being absorbed.' },
    { t: 'Refractive index', d: 'How much a material slows light. Light bounces where the index changes, and more for a bigger change.' },
    { t: 'Hiding power', d: 'How well a coat stops the surface underneath from showing through.' },
    { t: 'Contrast ratio', d: 'Reflectance of a coat over black divided by its reflectance over white. 0.98 or more counts as full hiding.' },
    { t: 'Kubelka–Munk theory', d: 'A simple 1931 sum for light going down and up inside a paint film, using one scattering and one absorption number.' },
    { t: 'Critical PVC', d: 'The pigment loading above which there is too little binder to fill the gaps, so air pockets remain.' },
  ],
  defaults: { thick: 40, pig: 'rutile', tio2: 18, chalk: 20, d: 0.25, wet: false },
  controls: [
    { key: 'thick', type: 'range', label: 'Dry film thickness', min: 5, max: 150, step: 1, ends: ['5 µm', '150 µm'], fmt: (v) => v.toFixed(0) + ' µm', hint: 'One coat is about 30 to 40 µm.' },
    { key: 'pig', type: 'seg', label: 'White pigment', options: [{ v: 'rutile', label: 'Rutile' }, { v: 'anatase', label: 'Anatase' }, { v: 'zinc', label: 'Zinc white' }, { v: 'lead', label: 'White lead' }, { v: 'chalk', label: 'Chalk' }], fmt: (v) => 'index ' + PIG[v].n },
    { key: 'tio2', type: 'range', label: 'White pigment in the dry film', min: 0, max: 30, step: 1, ends: ['none', '30%'], fmt: (v) => v.toFixed(0) + '% by volume' },
    { key: 'chalk', type: 'range', label: 'Chalk extender in the dry film', min: 0, max: 70, step: 1, ends: ['none', '70%'], fmt: (v) => v.toFixed(0) + '% by volume', hint: 'Past about 55% in all, air pockets appear.' },
    { key: 'd', type: 'log', label: 'Pigment grain size', min: 0.03, max: 3, ends: ['0.03 µm', '3 µm'], fmt: (v) => v.toFixed(2) + ' µm' },
    { key: 'wet', type: 'toggle', label: 'Wet (just applied)' },
  ],
  quiz: [
    { q: 'How does white paint hide a dark wall?', options: ['Its pigment absorbs all the light', 'Its pigment grains scatter light back out before it reaches the wall', 'It is too thick for light to enter', 'It glows by itself'], answer: 1, why: 'White pigment absorbs almost nothing. It scatters light again and again until most of it comes back out of the top of the film.' },
    { q: 'Why is titanium dioxide a far better hiding pigment than chalk?', options: ['It is whiter as a powder', 'It is cheaper', 'Its refractive index (about 2.7) is far from the binder\'s (1.5); chalk\'s (1.6) is almost the same', 'Its grains are much bigger'], answer: 2, why: 'Scattering needs a jump in refractive index. Chalk in binder is like glass in water: nearly invisible.' },
    { q: 'A cheap, chalky paint looks grey and thin while wet but white when dry. Why?', options: ['The water is grey', 'It reacts with air', 'The chalk grows', 'Drying leaves air pockets, and air against chalk scatters light strongly'], answer: 3, why: 'This is dry hiding. Above the critical PVC there is not enough binder to fill the gaps. Water in the gaps scatters little, air scatters a lot.' },
  ],
  reel: [
    { ms: 5600, caption: 'White paint hides by scattering: photons bounce from grain to grain and stumble back out before they reach the wall.', set: { thick: 60, pig: 'rutile', tio2: 18, chalk: 20, d: 0.25, wet: false, _b: 0 }, anim: { thick: [8, 110] }, view: TALL, spin: 0 },
    { ms: 5600, caption: 'Titanium dioxide bends light far more than the binder around it, while chalk hardly does, so chalk alone lets the black show through.', set: { thick: 45, tio2: 18, chalk: 20, d: 0.25, wet: false, pig: 'rutile', _b: 1 }, anim: { pig: ['rutile', 'chalk'] }, view: TALL, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(23), W = X1 - X0;
    // the hiding chart: black half, white half
    const mkTile = (x0, x1, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, Y0, 1.6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 })); m.position.set((x0 + x1) / 2, Y0 / 2, 0); m.receiveShadow = true; root.add(m); };
    mkTile(X0, MID, 0x0b0b0d); mkTile(MID, X1, grey(R_WHITE));
    const film = new THREE.Mesh(new THREE.BoxGeometry(W, 1, 1.5), new THREE.MeshStandardMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.2, roughness: 0.2, depthWrite: false })); film.renderOrder = 3; root.add(film);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 1, 1.5)), new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.6 })); root.add(edge);
    // what the eye sees from the room: two swatches floating above the film
    const sw = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.08, 0.08, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); m.position.x = i ? (MID + X1) / 2 : (X0 + MID) / 2; m.rotation.x = 0.55; root.add(m); return m; });
    const lSee = stage.label('', [MID, 0, 0.3], root, 'hot'), lK = stage.label('over black', [(X0 + MID) / 2, 0.2, 0.9], root), lW = stage.label('over white', [(MID + X1) / 2, 0.2, 0.9], root);
    const lFilm = stage.label('', [X1 - 0.2, 0, 0.8], root);
    // pigment grains and extender lumps, fixed places as fractions of the film
    const NG = 170, NC = 40;
    const grains = dots(NG, 0.05, 0xffffff, 8, true), lumps = dots(NC, 0.17, 0xc9b48a, 8, true), voids = dots(50, 0.06, 0x10141c, 6, false); root.add(grains, lumps, voids);
    const GP = Array.from({ length: NG }, () => [rnd(), rnd(), (rnd() - 0.5) * 1.2]), CP = Array.from({ length: NC }, () => [rnd(), rnd(), (rnd() - 0.5) * 1.0]), VP = Array.from({ length: 50 }, () => [rnd(), rnd(), 0.5 + rnd() * 0.25]);
    const ph = dots(NPH, 0.075, 0xffe37a, 8, false); root.add(ph);
    const Q = Array.from({ length: NPH }, (_, i) => ({ side: i % 2, state: 0, x: 0, y: 0, z: 0, d: [0, -1, 0], L: 0, wait: rnd() * 2 }));
    const iso = () => { const mu = 2 * rnd() - 1, a = rnd() * TAU, r = Math.sqrt(1 - mu * mu); return [r * Math.cos(a), mu, r * Math.sin(a)]; };
    const lamb = (sgn) => { const mu = Math.sqrt(rnd()), a = rnd() * TAU, r = Math.sqrt(1 - mu * mu); return [r * Math.cos(a), sgn * mu, r * Math.sin(a)]; };
    const cY = new THREE.Color(0xffe37a), cDead = new THREE.Color(0xff5d5d);

    let S = { ...s0 }, O = opt(S), key = '', tally = [[0, 0], [0, 0]];   // [side][back, total]
    const half = (W / 2 - 0.1) / U;      // half-width of one tile in µm
    const launch = (q) => { q.state = 1; q.x = (rnd() * 2 - 1) * half; q.z = (rnd() - 0.5) * 50; q.y = S.thick + 30; q.d = [0, -1, 0]; q.L = 30; q.in = false; };
    // one whole photon, traced at once, for the tally
    const trace = (side) => {
      const l = 0.75 / Math.max(O.S, 1e-5), ka = O.K / 2, X = S.thick, Rg = side ? R_WHITE : 0; let y = X, mu = -Math.sqrt(rnd());
      for (let n = 0; n < 6000; n++) {
        const L = -l * Math.log(1 - rnd() + 1e-12), ny = y + mu * L;
        if (ny >= X) return 1;
        if (ny <= 0) { if (rnd() > Math.exp((-ka * y) / -mu)) return 0; if (rnd() < Rg) { y = 0; mu = Math.sqrt(rnd()); continue; } return 0; }
        if (rnd() > Math.exp(-ka * L)) return 0;
        y = ny; mu = 2 * rnd() - 1;
      }
      return 0;
    };

    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'How well it hides', 'contrast ratio against thickness');
      const { X, Y, x0, x1 } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 58, xMin: 0, xMax: 150, yMin: 0, yMax: 1, xTicks: [0, 35, 70, 105, 150], yTicks: [0, 0.5, 1], xFmt: (v) => v + ' µm', yFmt: (v) => v.toFixed(1) });
      dashH(g, x0, x1, Y(0.98), 'full hiding: 0.98');
      const curve = (o) => Array.from({ length: 76 }, (_, i) => [i * 2, i ? contrastRatio(o.S, o.K, i * 2) : 0]);
      line(g, curve(opt(S, !S.wet)), X, Y, 'rgba(255,255,255,.45)', 3, [7, 5]); line(g, curve(O), X, Y, COL.gold, 5);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(S.thick), Y(contrastRatio(O.S, O.K, S.thick)), 8, 0, TAU); g.fill();
      [35, 70, 105].forEach((v, i) => { g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '14px sans-serif'; g.fillText(`${i + 1} coat${i ? 's' : ''}`, X(v) - 20, Y(0) - 8); });
      g.font = 'bold 15px sans-serif'; g.fillStyle = COL.gold; g.fillText(S.wet ? 'wet' : 'dry', 80, h - 14); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(`dashed: the same coat ${S.wet ? 'dry' : 'wet'}`, 130, h - 14);
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'What makes a grain scatter', '');
      const { X, Y } = axes(g, w, 216, { x0: 62, x1: 300, y1: 62, y0: 176, xMin: 0.03, xMax: 3, xLog: true, yMin: 0, yMax: 1, xTicks: [0.03, 0.25, 3], yTicks: [0, 1], xFmt: (v) => v + ' µm', yFmt: (v) => (v ? 'best' : '0') });
      line(g, Array.from({ length: 60 }, (_, i) => { const d = 0.03 * Math.pow(100, i / 59); return [d, sizeF(d)]; }), X, Y, COL.pink, 4);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(S.d), Y(sizeF(S.d)), 7, 0, TAU); g.fill();
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('grain size: best near 0.25 µm,', 62, 232); g.fillText('half the wavelength of light', 62, 252);
      g.font = 'bold 16px sans-serif'; g.fillStyle = COL.text; g.fillText('index jump against the binder', 340, 66);
      const rows = [['rutile', COL.gold], ['anatase', COL.gold], ['zinc', '#b9c4d3'], ['lead', '#b9c4d3'], ['chalk', '#c9b48a']], mx = contrast(2.73, N_BINDER);
      rows.forEach(([id, c], i) => { const y = 82 + i * 34, v = contrast(PIG[id].n, O.nMed), on = id === S.pig; g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.7)'; g.font = `${on ? 'bold ' : ''}15px sans-serif`; g.fillText(`${PIG[id].short} ${PIG[id].n}`, 340, y + 18); g.fillStyle = c; g.fillRect(480, y + 5, Math.max(2, Math.min(1.15, v / mx) * 110), 16); });
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)';
      wrap(g, `Around the grains now: index ${O.nMed.toFixed(2)}${S.wet ? ' (water and binder)' : O.por > 0.01 ? ' (binder and air pockets)' : ' (binder)'}. Scattering goes as ((m² − 1)/(m² + 2))², with m the ratio of the two indices.`, 24, 290, w - 48, 20);
    }, B2);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; O = opt(s);
        fitNarrow(stage, [lK, lW, lFilm]); reelBoards([bA, bB], 0, stage, VIEW, s._b || 0); phoneBoards(stage, [bA, bB], 0);
        const k = `${s.thick}|${s.pig}|${s.tio2}|${s.chalk}|${s.d.toFixed(3)}|${s.wet}`;
        if (k !== key) { key = k; tally = [[0, 0], [0, 0]]; bA.redraw(); bB.redraw(); }
        const H = s.thick * U, top = Y0 + H;
        film.scale.y = H; film.position.set(MID, Y0 + H / 2, 0); edge.scale.y = H; edge.position.copy(film.position);
        film.material.color.set(s.wet ? 0xa9cdf2 : 0xdfe8f2); film.material.opacity = s.wet ? 0.3 : 0.16;
        const Rk = kmR(O.S, O.K, s.thick, 0), Rw = kmR(O.S, O.K, s.thick, R_WHITE);
        sw[0].material.color.setHex(grey(Rk)); sw[1].material.color.setHex(grey(Rw)); sw.forEach((m) => { m.position.y = top + 0.8; });
        lSee.position.y = top + 1.32; lSee.element.innerHTML = `<b>what you see</b>: contrast ratio ${(Rk / Rw).toFixed(2)}`;
        lFilm.position.y = top + 0.3; lFilm.element.innerHTML = `${s.wet ? 'wet' : 'dry'} film, ${s.thick.toFixed(0)} µm`;
        // grains
        const ng = Math.round(NG * clamp(s.tio2 / 30, 0, 1)), gs = clamp(0.45 + 0.9 * Math.log10(s.d / 0.03), 0.4, 2.4), nc = Math.round(NC * clamp(s.chalk / 70, 0, 1)), nv = s.wet ? 0 : Math.round(50 * clamp(O.por / 0.3, 0, 1));
        const isChalk = s.pig === 'chalk';
        grains.material.color.set(isChalk ? 0xc9b48a : s.pig === 'rutile' || s.pig === 'anatase' ? 0xffffff : 0xcfd6df);
        GP.forEach((p, i) => grains.place(i, X0 + 0.08 + p[0] * (W - 0.16), Y0 + 0.04 + p[1] * Math.max(0.01, H - 0.08), p[2], i < ng ? gs : 0.0001)); grains.done();
        CP.forEach((p, i) => lumps.place(i, X0 + 0.2 + p[0] * (W - 0.4), Y0 + 0.12 + p[1] * Math.max(0.01, H - 0.24), p[2], i < nc && H > 0.3 ? 1 : i < nc ? H / 0.3 : 0.0001)); lumps.done();
        VP.forEach((p, i) => voids.place(i, X0 + 0.1 + p[0] * (W - 0.2), Y0 + 0.05 + p[1] * Math.max(0.01, H - 0.1), p[2], i < nv ? 1 : 0.0001)); voids.done();
        // the tally: whole photons, a batch every frame
        for (let n = 0; n < 24; n++) { const side = n & 1; tally[side][0] += trace(side); tally[side][1]++; }
        // the photons you can watch
        const l = 0.75 / Math.max(O.S, 1e-5), speed = 150, ka = O.K / 2;
        Q.forEach((q, i) => {
          if (q.state === 0) { q.wait -= dt; if (q.wait <= 0) launch(q); }
          let go = speed * dt, guard = 0;
          while (q.state === 1 && go > 1e-6 && guard++ < 60) {
            const stp = Math.min(go, q.L); q.x += q.d[0] * stp; q.y += q.d[1] * stp; q.z += q.d[2] * stp; q.L -= stp; go -= stp;
            if (Math.abs(q.x) > half) { q.x = Math.sign(q.x) * (2 * half - Math.abs(q.x)); q.d[0] *= -1; }
            if (Math.abs(q.z) > 30) { q.z = Math.sign(q.z) * (60 - Math.abs(q.z)); q.d[2] *= -1; }
            if (!q.in && q.y <= s.thick) { q.in = true; q.d = lamb(-1); q.L = -l * Math.log(1 - rnd() + 1e-12); }
            else if (q.in && q.y >= s.thick) { q.state = 2; q.wait = 0.7; q.dead = false; }
            else if (q.in && q.y <= 0) { q.y = 0; if (rnd() < (q.side ? R_WHITE : 0)) { q.d = lamb(1); q.L = -l * Math.log(1 - rnd() + 1e-12); } else { q.state = 3; q.wait = 0.45; } }
            else if (q.in && q.L <= 1e-6) { if (rnd() > Math.exp(-ka * l)) { q.state = 3; q.wait = 0.3; } else { q.d = iso(); q.L = -l * Math.log(1 - rnd() + 1e-12); } }
          }
          if (q.state === 2) { q.y += speed * 0.8 * dt * Math.max(0.3, q.d[1]); q.x += q.d[0] * speed * 0.5 * dt; q.wait -= dt; if (q.wait <= 0) { q.state = 0; q.wait = rnd() * 0.5; } }
          if (q.state === 3) { q.wait -= dt; if (q.wait <= 0) { q.state = 0; q.wait = rnd() * 0.5; } }
          const cx = (q.side ? (MID + X1) / 2 : (X0 + MID) / 2) + q.x * U;
          ph.place(i, cx, Y0 + q.y * U, clamp(q.z * U, -0.7, 0.7), q.state === 0 ? 0.0001 : q.state === 3 ? 1.5 * clamp(q.wait / 0.45, 0.1, 1) : 1);
          ph.tint(i, q.state === 3 ? cDead : cY);
        });
        ph.done();
      },
      readout: (s) => {
        const Rk = kmR(O.S, O.K, s.thick, 0), Rw = kmR(O.S, O.K, s.thick, R_WHITE), cr = Rk / Rw, hx = hidingThickness(O.S, O.K);
        const pct = (a) => (a[1] ? ((a[0] / a[1]) * 100).toFixed(0) + '%' : '…');
        return `<div class="big" style="color:${cr >= 0.98 ? COL.ok : cr > 0.9 ? COL.heat : COL.bad}">${cr >= 0.98 ? 'Hides completely' : cr > 0.9 ? 'The black shows faintly' : 'The black shows through'}</div>
          <div class="row"><span>Contrast ratio</span><b>${cr.toFixed(3)} (full hiding: 0.98)</b></div>
          <div class="row"><span>Light back, over black / white</span><b>${(Rk * 100).toFixed(0)}% / ${(Rw * 100).toFixed(0)}%</b></div>
          <div class="row"><span>Photons counted back</span><b>${pct(tally[0])} / ${pct(tally[1])}</b></div>
          <div class="row"><span>A photon is scattered every</span><b>${O.S > 1e-4 ? (0.75 / O.S < 100 ? (0.75 / O.S).toFixed(1) : (0.75 / O.S).toFixed(0)) + ' µm' : 'hardly ever'}</b></div>
          <div class="row"><span>Thickness for full hiding</span><b>${hx ? `${hx.toFixed(0)} µm: ${Math.ceil(hx / 35)} coat${Math.ceil(hx / 35) > 1 ? 's' : ''}` : 'never, at any thickness'}</b></div>
          <div class="row"><span>Powder in the dry film (PVC)</span><b>${(O.pvc * 100).toFixed(0)}%${O.pvc > CPVC ? `, ${(O.por * 100).toFixed(0)}% air pockets` : ''}</b></div>
          ${isPhone() ? '' : '<small>Kubelka–Munk sum, checked by counting photons. Green light, 550 nm.</small>'}`;
      },
    };
  },
};
