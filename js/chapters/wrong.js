// Chapter 6: what goes wrong on a wall, and what is in the tin.
// A slice through a wall: brick, plaster, then the coating, with the room on the right.
// Damp: water reaching the inner face must get out through the coating as vapour. The coating passes
//   δ_air × Δp / sd (paint.js; sd classes after EN 1062-1 / EN ISO 7783). What cannot pass is trapped
//   behind the film. The "water arriving" slider is an illustrative range, not a measurement.
// Growth: humidity at the wall surface from the room's air and the wall's temperature; mould and
//   algae need about 80% there for days (the design limit in ASHRAE Standard 160).
// Lead: India's Regulation of Lead Contents in Household and Decorative Paints Rules, 2016
//   (G.S.R. 1030(E), 1 November 2016, in force 1 November 2017): no more than 90 ppm of the dry
//   film, and the tin must say so. WHO: "There is no known safe blood lead concentration"
//   (fact sheet, Lead poisoning). 600 ppm was the US limit from 1978 to 2009; 5,000 ppm Canada's of 1976.
// Indian Standards: IS 15489 (plastic emulsion), IS 2932 and IS 133 (exterior and interior enamel),
//   IS 427 (dry distemper), IS 428 (washable distemper), IS 5410 (cement paint), all revised 2013.
import { THREE, approach } from '../kit.js';
import {
  TAU, rng, dots, puffs, board, panelBg, title, wrap, fitNarrow, reelBoards, phoneBoards, isPhone, clamp, link, TALL, BW, BH, B1, B2, COL,
  COATS, vapourFlow, sdClass, surfaceRH, dewPoint, LEAD_LIMIT,
} from '../paint.js';

const fmtPpm = (v) => (v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '% (' + Math.round(v).toLocaleString('en-IN') + ' ppm)' : v >= 100 ? Math.round(v).toLocaleString('en-IN') + ' ppm' : v.toFixed(v < 10 ? 1 : 0) + ' ppm');
const calc = (s) => { const cap = vapourFlow(COATS[s.coat].sd, s.T, s.RH), through = Math.min(s.water, cap), trapped = s.water - through, Tw = s.T - s.cold, srh = surfaceRH(s.T, s.RH, Tw); return { cap, through, trapped, Tw, srh, dew: dewPoint(s.T, s.RH) }; };
const VIEW6 = { pos: [3.4, 5.0, 11.6], target: [2.2, 4.2, 0] };

export default {
  id: 'wrong',
  short: 'Damp, lead and labels',
  title: 'What goes wrong, and what is in the tin',
  subtitle: 'Damp walls in the monsoon, salt bloom, blisters, chalking and algae. Then lead, solvents and the standards on the label.',
  view: VIEW6,
  learn: `<p>Most paint failures are really <b>water</b> failures. A brick wall soaks up rain and ground water and must let it out again. If the coating lets vapour through, the wall dries. If the coating is a tight skin and water keeps arriving behind it, the water collects there, the film loses its grip, and you get <b>blisters</b> and <b>peeling</b>. Paint does not cure damp. Find the leak first.</p>
    <p><b>Efflorescence</b> is the white fluffy bloom on monsoon walls. Water moving through brick and plaster dissolves salts. When it evaporates at the surface the salts are left as crystals. Under a tight film they grow behind it and push it off.</p>
    <p><b>Algae and mould</b> (the black and green streaks on outside walls) need a surface that stays damp, about 80% humidity at the wall for days. Paints carry a <b>biocide</b> to hold them off for some years. <b>Chalking</b> is sunlight at work: ultraviolet light breaks the binder at the surface, helped by titanium dioxide itself, and loose pigment rubs off as powder. Exterior paints use tougher binders for this reason. <b>Fading</b> is sunlight breaking weaker colour pigments.</p>
    <p><b>Lead.</b> Lead compounds were used for centuries as white and bright pigments and as driers. Lead is a poison that builds up in the body and harms children's developing brains most. The World Health Organization says there is no known safe level in blood. Since 1 November 2017, household and decorative paints in India may not hold more than <b>90 parts per million</b> of lead, and the tin must say so. Old enamel on doors, grilles, cots and toys can still be leaded: do not dry-sand or burn it off. Wet it first, keep children away and clean up the dust.</p>
    <p><b>VOCs.</b> The smell of fresh paint is <b>volatile organic compounds</b>: solvent, and the small amount of coalescing solvent in emulsions, evaporating (see ${link('perfumeclear', 'PerfumeClear')}). Solvent enamels give off far more than water-based paints. Keep windows open while painting and while it dries. Take leftover solvent paint to a hazardous-waste collection where one exists, and never pour paint down a drain.</p>
    <p><b>On the label.</b> The Bureau of Indian Standards has a standard for each kind: <b>IS 15489</b> for plastic emulsion, <b>IS 2932</b> and <b>IS 133</b> for enamels, <b>IS 427</b> and <b>IS 428</b> for distempers, <b>IS 5410</b> for cement paint.</p>
    <p class="tip"><b>Try it:</b> raise the water arriving at the wall, then step the coating from limewash to enamel and watch where the water goes. Then cool the wall and see when growth starts.</p>`,
  terms: [
    { t: 'Efflorescence', d: 'White salt crystals left on a wall when water carrying dissolved salts evaporates at the surface.' },
    { t: 'Breathable coating', d: 'One that lets water vapour pass through, so a damp wall can dry out.' },
    { t: 'Chalking', d: 'Powder forming on old paint outdoors as sunlight destroys the binder at the surface.' },
    { t: 'Biocide', d: 'A substance in paint that slows the growth of mould and algae on the film, and of bacteria in the tin.' },
    { t: 'Lead paint', d: 'Paint with lead compounds added as pigment or drier. Its dust and flakes poison, especially children.' },
    { t: 'VOC', d: 'Volatile organic compound: a carbon-based chemical that evaporates easily into room air, such as paint solvent.' },
  ],
  defaults: { coat: 'emulsion', water: 40, RH: 75, T: 30, cold: 2, salts: true, biocide: true, lead: 90 },
  controls: [
    { key: 'coat', type: 'seg', label: 'Coating on the wall', options: [{ v: 'lime', label: 'Limewash' }, { v: 'distemper', label: 'Distemper' }, { v: 'emulsion', label: 'Emulsion' }, { v: 'elastic', label: 'Waterproof' }, { v: 'enamel', label: 'Enamel' }] },
    { key: 'water', type: 'range', label: 'Water arriving inside the wall', min: 0, max: 400, step: 5, ends: ['dry wall', 'leak'], fmt: (v) => v.toFixed(0) + ' g/m² a day' },
    { key: 'RH', type: 'range', label: 'Room humidity', min: 30, max: 98, step: 1, ends: ['dry season', 'monsoon'], fmt: (v) => v.toFixed(0) + '%' },
    { key: 'T', type: 'range', label: 'Room temperature', min: 10, max: 40, step: 0.5, fmt: (v) => v.toFixed(1) + ' °C' },
    { key: 'cold', type: 'range', label: 'Wall surface colder than the room by', min: 0, max: 8, step: 0.5, fmt: (v) => v.toFixed(1) + ' °C', hint: 'A shaded, north-facing or rain-soaked wall runs cooler.' },
    { key: 'salts', type: 'toggle', label: 'Salts in the brick and plaster' },
    { key: 'biocide', type: 'toggle', label: 'Biocide in the paint film' },
    { key: 'lead', type: 'log', label: 'Label check: lead in a dry paint film', min: 1, max: 200000, ends: ['1 ppm', '20%'], fmt: (v) => fmtPpm(v) },
  ],
  quiz: [
    { q: 'Paint is blistering and peeling off a damp wall. What is the real cause?', options: ['The paint was the wrong colour', 'Water arriving behind a film that cannot let it out', 'Too much pigment', 'The room is too bright'], answer: 1, why: 'Trapped water breaks the film\'s grip on the wall. Repainting will not last until the source of the damp is fixed.' },
    { q: 'What is the white fluffy bloom that appears on walls in the monsoon?', options: ['Mould', 'Fresh paint coming through', 'Salts left behind when water from inside the wall evaporates at the surface', 'Titanium dioxide'], answer: 2, why: 'It is efflorescence: dissolved salts carried out by moving water and left as crystals when the water evaporates.' },
    { q: 'What is India\'s legal limit for lead in household and decorative paint?', options: ['90 parts per million', '1%', '10%', 'There is none'], answer: 0, why: 'Rules notified in 2016 and in force since 1 November 2017 cap lead at 90 ppm of the dry film. There is no known safe level of lead in blood.' },
  ],
  reel: [
    { ms: 5600, caption: 'Blisters and peeling are water trapped behind the film, so fix the damp first, and check the tin for lead: no more than 90 ppm.', set: { coat: 'emulsion', RH: 75, T: 30, cold: 2, salts: true, biocide: true, lead: 90 }, anim: { water: [10, 320] }, view: TALL, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(47), H = 3.5, D = 1.7, XB0 = -3.5, XP0 = -1.45, XC0 = -0.9, XC1 = -0.78;
    const bt = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, 256, 256); for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) { g.fillStyle = `rgb(${150 + (r * 37 + k * 11) % 20},${78 + (r * 13 + k * 7) % 14},56)`; g.fillRect(k * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.1, 1.9); return t; })();
    const mk = (x0, x1, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, H, D), mat); m.position.set((x0 + x1) / 2, H / 2, 0); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
    mk(XB0, XP0, new THREE.MeshStandardMaterial({ map: bt, roughness: 0.95 }));
    mk(XP0, XC0, new THREE.MeshStandardMaterial({ color: 0x8d9197, roughness: 0.95 }));
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.5 }), coat = mk(XC0, XC1, coatMat);
    const wet = new THREE.Mesh(new THREE.BoxGeometry(1, H * 0.96, D * 0.98), new THREE.MeshStandardMaterial({ color: 0x3b8cff, transparent: true, opacity: 0.75, roughness: 0.1 })); root.add(wet);
    const blisters = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28 + rnd() * 0.16, 20, 14), coatMat); m.userData = { y: 0.4 + (i / 7) * 2.8 + rnd() * 0.2, z: (rnd() - 0.5) * 1.2 }; root.add(m); return m; });
    const inWall = puffs(root, 90, 0.05, 0x58a6ff, rnd), out = puffs(root, 90, 0.05, 0xcfe6ff, rnd);
    const salt = dots(60, 0.075, 0xffffff, 6, true), algae = dots(60, 0.07, 0x3f8f3a, 6, true), dew = dots(40, 0.05, 0x8fd0ff, 8, true); root.add(salt, algae, dew);
    const SP = Array.from({ length: 60 }, () => [rnd() * H * 0.9 + 0.15, (rnd() - 0.5) * D * 0.9, rnd()]), AP = Array.from({ length: 60 }, () => [Math.pow(rnd(), 1.6) * H * 0.9 + 0.1, (rnd() - 0.5) * D * 0.9, rnd()]), DP = Array.from({ length: 40 }, () => [rnd() * H * 0.9 + 0.15, (rnd() - 0.5) * D * 0.9]);
    stage.label('brick', [(XB0 + XP0) / 2, H + 0.25, 0], root); const lPl = stage.label('plaster', [(XP0 + XC0) / 2, H + 0.25, 0], root);
    const lCoat = stage.label('', [XC1 + 1.7, H + 0.25, 0], root, 'hot'), lRoom = stage.label('', [1.5, 2.6, 0], root), lSt = stage.label('', [1.3, 0.9, 0], root);
    const lIn = stage.label('water in the wall →', [-2.5, 0.3, D / 2 + 0.1], root);

    let S = { ...s0 }, key = '', blis = 0, c = calc(S);
    const bA = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Can the wall breathe?', 'vapour each coating lets out, g/m² a day');
      const x0 = 190, x1 = w - 90, lo = 0, hi = 3.5, X = (v) => x0 + ((clamp(Math.log10(Math.max(v, 1)), lo, hi) - lo) / (hi - lo)) * (x1 - x0);
      Object.entries(COATS).forEach(([id, k], i) => {
        const y = 64 + i * 42, v = vapourFlow(k.sd, S.T, S.RH), on = id === S.coat, okk = v >= S.water;
        g.font = `${on ? 'bold ' : ''}16px sans-serif`; g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.7)'; g.fillText(k.name, 20, y + 21);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0, y + 4, x1 - x0, 24); g.fillStyle = okk ? COL.ok : COL.bad; g.globalAlpha = on ? 1 : 0.55; g.fillRect(x0, y + 4, Math.max(2, X(v) - x0), 24); g.globalAlpha = 1;
        g.fillStyle = '#fff'; g.font = '15px sans-serif'; g.fillText(v >= 10 ? v.toFixed(0) : v.toFixed(1), x1 + 8, y + 21);
      });
      const xw = X(S.water); g.strokeStyle = COL.water; g.lineWidth = 3; g.beginPath(); g.moveTo(xw, 58); g.lineTo(xw, 278); g.stroke();
      g.fillStyle = COL.water; g.font = 'bold 15px sans-serif'; g.fillText(`water arriving: ${S.water.toFixed(0)}`, Math.min(xw + 8, w - 190), 294);
      g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.72)'; wrap(g, 'Green: the coating lets out at least as much as arrives. Red: the rest is trapped behind the film. Log scale.', 20, 322, w - 40, 19);
    }, B1);
    const bB = board(root, BW, BH, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Lead: the label check', 'ppm of the dry film');
      const x0 = 30, x1 = w - 30, lo = 0, hi = 5.5, X = (v) => x0 + ((clamp(Math.log10(v), lo, hi) - lo) / (hi - lo)) * (x1 - x0), over = S.lead > LEAD_LIMIT;
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x0, 96, x1 - x0, 34); g.fillStyle = over ? COL.bad : COL.ok; g.fillRect(x0, 96, X(S.lead) - x0, 34);
      [[LEAD_LIMIT, '90: the limit in India'], [600, '600'], [10000, '1%'], [100000, '10%']].forEach(([v, n], i) => { g.fillStyle = '#fff'; g.fillRect(X(v) - 1.5, i ? 90 : 78, 3, i ? 46 : 62); g.font = `${i ? '' : 'bold '}15px sans-serif`; g.fillStyle = i ? 'rgba(255,255,255,.65)' : '#fff'; g.fillText(n, X(v) - (i ? g.measureText(n).width / 2 : 40), i ? 154 : 70); });
      g.font = 'bold 20px sans-serif'; g.fillStyle = COL.text; g.fillText(`This paint: ${fmtPpm(S.lead)}`, 30, 196);
      g.fillStyle = over ? COL.bad : COL.ok; g.fillText(over ? `${(S.lead / LEAD_LIMIT).toFixed(S.lead / LEAD_LIMIT >= 10 ? 0 : 1)} times the limit: it may not be sold as house paint` : 'Within the limit of 90 parts per million', 30, 226);
      g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.72)';
      wrap(g, 'India, 2016 Rules: household and decorative paint may hold no more than 90 ppm of lead, and the tin must say so. 600 ppm was the limit in the USA from 1978 to 2009. Paints with leaded pigments or driers can run to several per cent.', 30, 262, w - 60, 21);
    }, B2);

    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; c = calc(s);
        const narrow = fitNarrow(stage, [lPl, lIn, lRoom]); reelBoards([bA, bB], -0.4, stage, VIEW6); phoneBoards(stage, [bA, bB], 0);
        const k = `${s.coat}|${s.water}|${s.RH}|${s.T}|${s.lead.toFixed(1)}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
        coatMat.color.setHex(COATS[s.coat].col); coatMat.roughness = s.coat === 'enamel' ? 0.15 : s.coat === 'elastic' ? 0.35 : 0.8;
        blis = approach(blis, clamp(c.trapped / 120, 0, 1), 1.6, dt);
        const tw = 0.02 + 0.22 * blis; wet.visible = blis > 0.02; wet.scale.x = tw; wet.position.set(XC0 - tw / 2 + 0.01, H / 2, 0);
        blisters.forEach((m, i) => { const sc = Math.max(0.0001, blis * (0.6 + 0.4 * Math.sin(i * 2.3 + 1)) * (1 + 0.04 * Math.sin(time * 2 + i))); m.scale.set(sc * 0.75, sc, sc); m.position.set(XC1 - 0.03, m.userData.y, m.userData.z); });
        inWall.step(dt, clamp(s.water / 400, 0, 1) * 34, () => [XB0 + 0.1 + rnd() * 0.5, 0.15 + Math.pow(rnd(), 1.5) * (H - 0.3), D / 2 + 0.03], () => [0.75 + rnd() * 0.25, 0.04, 0], 3.1);
        out.step(dt, clamp(c.through / 250, 0, 1) * 34 + (c.through > 1 ? 1.5 : 0), () => [XC1 + 0.05, 0.2 + rnd() * (H - 0.4), (rnd() - 0.5) * D * 0.8], () => [0.55 + rnd() * 0.4, 0.15 + rnd() * 0.2, 0], 2.6);
        const nSalt = s.salts ? Math.round(60 * clamp(Math.max(c.through, c.trapped) / 180, 0, 1)) : 0, under = c.trapped > c.through;
        SP.forEach((p, i) => salt.place(i, (under ? XC0 - 0.02 : XC1 + 0.03) + (under ? 0 : p[2] * 0.08), p[0], under ? D / 2 + 0.02 : p[1], i < nSalt ? 0.7 + p[2] * 0.8 : 0.0001)); salt.done();
        const grow = c.srh >= 80 && !s.biocide ? clamp((c.srh - 80) / 18, 0.08, 1) : 0, nA = Math.round(60 * grow);
        AP.forEach((p, i) => algae.place(i, XC1 + 0.03, p[0], p[1], i < nA ? 0.7 + p[2] * 0.9 : 0.0001)); algae.done();
        const nD = c.srh >= 99.5 ? 40 : 0; DP.forEach((p, i) => dew.place(i, XC1 + 0.04, p[0] - ((time * 0.12 + i * 0.37) % 0.6), p[1], i < nD ? 1 : 0.0001)); dew.done();
        lCoat.element.innerHTML = `<b>${COATS[s.coat].name}</b>${narrow ? '' : ': ' + sdClass(COATS[s.coat].sd).split(': ')[1]}`;
        lRoom.element.innerHTML = `room: ${s.T.toFixed(0)} °C, ${s.RH.toFixed(0)}% humid`;
        lSt.element.innerHTML = c.trapped > 1 ? `<b>${c.trapped.toFixed(0)} g/m² a day trapped</b>: blisters, peeling` : s.water > 1 ? 'vapour passing into the room' : 'dry wall: nothing to let out';
      },
      readout: (s) => {
        const over = s.lead > LEAD_LIMIT, sd = COATS[s.coat].sd;
        const growth = c.srh >= 99.5 ? 'water condenses on the wall' : c.srh >= 80 ? (s.biocide ? 'held off by the biocide' : 'damp enough to grow') : 'too dry to grow';
        return `<div class="big" style="color:${c.trapped > 1 ? COL.bad : COL.ok}">${c.trapped > 1 ? 'Water trapped behind the film' : 'The wall can breathe'}</div>
          <div class="row"><span>${COATS[s.coat].name}</span><b>sd ${sd} m, class ${sdClass(sd).split(':')[0]}</b></div>
          <div class="row"><span>Water in / coating lets out</span><b>${s.water.toFixed(0)} / ${c.cap >= 10 ? c.cap.toFixed(0) : c.cap.toFixed(1)} g/m² a day</b></div>
          <div class="row"><span>Trapped behind the film</span><b>${c.trapped.toFixed(0)} g/m² a day</b></div>
          <div class="row"><span>Salts</span><b>${!s.salts || s.water < 1 ? 'none moving' : c.trapped > c.through ? 'crystals under the film' : 'white bloom on the surface'}</b></div>
          <div class="row"><span>Humidity at the wall face</span><b>${c.srh.toFixed(0)}%, dew point ${c.dew.toFixed(1)} °C</b></div>
          <div class="row"><span>Algae and mould</span><b style="color:${c.srh >= 80 ? (s.biocide && c.srh < 99.5 ? COL.heat : COL.bad) : COL.ok}">${growth}</b></div>
          <div class="row"><span>Lead</span><b style="color:${over ? COL.bad : COL.ok}">${fmtPpm(s.lead)}: ${over ? 'over' : 'within'} the limit</b></div>`;
      },
    };
  },
};
void TAU; void TALL;
