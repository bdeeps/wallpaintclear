// Shared parts for WallPaintClear: how a film of paint dries, hides, colours, flows and fails,
// plus colours, chart boards and small 3D pieces that several chapters reuse.
// Scenes are built in "scene units": +x to the right, +y up. Scale differs by chapter and is noted there.
// Every model here is a teaching model: real equations with round, stated constants.
import { THREE, M, box, beam, sphere, arrow, clamp, lerp } from './kit.js';

// ---------------------------------------------------------------- constants
export const TAU = Math.PI * 2;
export const R_GAS = 8.314;       // J/(mol·K)
export const K0 = 273.15;
export const G = 9.81;

// ---------------------------------------------------------------- water in air
// Saturation pressure of water, Antoine equation: log10 P(mmHg) = 8.07131 − 1730.63 / (233.426 + T °C),
// good from 1 to 100 °C (the same fit PerfumeClear uses). Returns pascals.
export const psatW = (T) => 133.322 * Math.pow(10, 8.07131 - 1730.63 / (233.426 + T));
// Mass of water vapour in saturated air, kg/m³ (ideal gas, M = 18.015 g/mol).
export const rhoVsat = (T) => (psatW(T) * 0.018015) / (R_GAS * (T + K0));
// Mass-transfer coefficient at a wall, m/s. Still room air carries heat away from a wall at about
// 4 W/(m²·K) (natural convection); by the Lewis relation h_m = h_c / (ρ·c_p) = 4 / (1.2 × 1005)
// = 0.0033 m/s. A ceiling fan or a breeze at 1 to 2 m/s gives about three times that.
export const H_M = 0.0033;
// Water leaving a wet surface, in micrometres of liquid water per second.
export const evapRate = (T, RH, air = 1) => (H_M * air * rhoVsat(T) * (1 - clamp(RH, 0, 100) / 100) / 1000) * 1e6;

// ---------------------------------------------------------------- how a film dries
// EMULSION. A wet coat WET µm thick holds VS (volume solids) of spheres and pigment; the rest is water.
//  Stage 1: water evaporates at the steady rate above until the particles touch (random close packing,
//           solids fraction 0.64).
//  Stage 2: the last water leaves more slowly through the tightening film (rate ∝ (water left)²), and
//           the soft polymer spheres are squeezed into a honeycomb, but only if the wall is warmer
//           than the minimum film-forming temperature (MFFT).
//  Stage 3: polymer chains wander across the old boundaries. Strength grows as the square root of
//           time (chain interdiffusion) and is full after about two weeks at 25 °C. It slows in the
//           cold with an apparent activation energy of 100 kJ/mol, a round teaching value (real
//           polymers near their glass transition are steeper).
// Sources for the three stages: Keddie, "Film formation of latex", Mater. Sci. Eng. R 21 (1997);
// Steward, Hearn & Wilkinson, Adv. Colloid Interface Sci. 86 (2000).
export const WET = 100, VS = 0.38, PACK = 0.64;
const HEAL_25 = 14 * 86400, EA_HEAL = 100e3, T_DEFORM = 900;
const arr = (Ea, T, Tref = 25) => Math.exp((-Ea / R_GAS) * (1 / (T + K0) - 1 / (Tref + K0)));
// ENAMEL (oil or alkyd in solvent). The solvent (mineral turpentine) evaporates, then oxygen from the
// air cross-links the oil. Solvent rate: 0.012 µm/s at 25 °C in still air, rising with temperature
// (heat of vaporisation about 45 kJ/mol). Oxidation: first order, time constant 8 h at 27 °C with a
// metal drier and eight times longer without one, activation energy 60 kJ/mol. Teaching constants,
// set so that the coat is touch dry in a few hours and hard overnight, as enamel tins say.
const ENAMEL_WET = 80, ENAMEL_VS = 0.5, TAU_OX = 8 * 3600;
// LIMEWASH. Ca(OH)2 + CO2 → CaCO3 + H2O. A 60 µm coat that is half pores holds
// 2240 kg/m³ × 0.5 × 60 µm = 67 g of slaked lime per m², which needs 67 × 44.01/74.09 = 40 g of CO2.
// Air at 420 ppm holds 0.00042 × 44.01/24.5 = 0.00075 kg of CO2 per m³, so still air can deliver at
// most H_M × 0.00075 = 2.5 mg/(m²·s): four and a half hours' worth at the very least. Real carbonation
// is many times slower (the model allows it 8% of that supply at best) because the gas must dissolve in a film of pore water: fastest at middling
// humidity, slow in bone-dry air (no water film) and in saturated air (pores flooded).
export const LIME = { thick: 60, limePerM2: 2240 * 0.5 * 60e-6 * 1000, co2PerM2: 2240 * 0.5 * 60e-6 * 1000 * 44.01 / 74.09, co2Air: 0.00042 * 44.01 / 24.5 };
export const limeEff = (RH) => 0.08 * Math.exp(-Math.pow((RH - 65) / 22, 2)) + 0.006;

export function freshFilm(kind) {
  if (kind === 'enamel') return { kind, t: 0, w0: ENAMEL_WET * (1 - ENAMEL_VS), w: ENAMEL_WET * (1 - ENAMEL_VS), solids: ENAMEL_WET * ENAMEL_VS, D: 0, H: 0, rate: 0 };
  if (kind === 'lime') return { kind, t: 0, w0: 45, w: 45, solids: LIME.thick, D: 0, H: 0, rate: 0 };
  const solids = WET * VS;
  return { kind: 'emulsion', t: 0, w0: WET - solids, w: WET - solids, solids, wPack: solids * (1 / PACK - 1), Dk: 0, D: 0, H2: 0, H: 0, rate: 0 };
}
// e: { T (°C, wall and air), RH (%), air (1 still … 3 fan), mfft (°C), drier (bool) }
export function stepDry(f, dt, e) {
  let left = Math.max(0, dt);
  while (left > 1e-9) {
    const h = Math.min(left, Math.max(2, f.t * 0.03));
    if (f.kind === 'emulsion') {
      const E = evapRate(e.T, e.RH, e.air);
      if (f.w > f.wPack) { f.rate = E; f.w = Math.max(f.wPack, f.w - E * h); }
      else { const k = (E / (f.wPack * f.wPack)) * h; f.rate = E * Math.pow(f.w / f.wPack, 2); f.w = f.w / (1 + k * f.w); }
      if (f.w <= f.wPack * 1.0001) {
        if (e.T > e.mfft) f.Dk = Math.min(1, f.Dk + (h / T_DEFORM) * clamp((e.T - e.mfft) / 8, 0.05, 1));
        f.D = Math.min(f.Dk, 1 - f.w / f.wPack);
        f.H2 = Math.min(1, f.H2 + (h * f.D * f.D * arr(EA_HEAL, e.T)) / HEAL_25);
        f.H = Math.sqrt(f.H2) * f.D;
      }
    } else if (f.kind === 'enamel') {
      const E = 0.012 * (e.air || 1) * arr(45e3, e.T);
      const knee = 0.3 * f.w0;
      if (f.w > knee) { f.rate = E; f.w = Math.max(knee, f.w - E * h); }
      else { const k = (E / (knee * knee)) * h; f.rate = E * Math.pow(f.w / knee, 2); f.w = f.w / (1 + k * f.w); }
      const tau = (TAU_OX * (e.drier ? 1 : 8)) / arr(60e3, e.T, 27);
      const open = clamp(1 - f.w / f.w0, 0, 1);       // oxygen gets in as the solvent gets out
      f.H = 1 - (1 - f.H) * Math.exp((-h * open) / tau);
      f.D = f.H;
    } else {
      const E = evapRate(e.T, e.RH, e.air);
      f.rate = E * clamp(f.w / 10, 0, 1); f.w = Math.max(0, f.w - f.rate * h);
      const supply = H_M * (e.air || 1) * LIME.co2Air * 1000;                 // g of CO2 per m² per second, at most
      f.co2 = supply * limeEff(e.RH);
      f.H = Math.min(1, f.H + (f.co2 * h) / LIME.co2PerM2);
      f.D = f.H;
    }
    left -= h; f.t += h;
  }
  return f;
}
// The whole story at once on a log clock from one minute to tMax: water left, shape and strength.
export function dryCurves(kind, e, tMax = 60 * 86400) {
  const f = freshFilm(kind), o = { t: [], w: [], D: [], H: [], touch: null, recoat: null, hard: null, f };
  let t = 60;
  while (t <= tMax * 1.0001) {
    stepDry(f, t - f.t, e);
    const w = f.w / f.w0;
    o.t.push(t); o.w.push(w); o.D.push(f.D); o.H.push(f.H);
    if (kind === 'emulsion') {
      if (o.touch == null && w < 0.08) o.touch = t;
      if (o.recoat == null && w < 0.012) o.recoat = t;
      if (o.hard == null && f.H > 0.9) o.hard = t;
    } else if (kind === 'enamel') {
      if (o.touch == null && w < 0.1 && f.H > 0.12) o.touch = t;
      if (o.recoat == null && f.H > 0.6) o.recoat = t;
      if (o.hard == null && f.H > 0.95) o.hard = t;
    } else {
      if (o.touch == null && w < 0.08) o.touch = t;
      if (o.recoat == null && f.H > 0.25) o.recoat = t;
      if (o.hard == null && f.H > 0.95) o.hard = t;
    }
    t *= 1.06;
  }
  o.film = kind !== 'emulsion' ? 1 : f.D;     // how much of a true film formed (0 = loose powder)
  return o;
}

// ---------------------------------------------------------------- why white hides
// Refractive indices at about 550 nm. Rutile and anatase: the figures the pigment industry uses
// (rutile averages about 2.7 over its two crystal directions; Wikipedia's infobox gives 2.609 for one
// of them). Zinc oxide 2.01. White lead 1.94 to 2.09. Calcite (chalk) averages about 1.59, china clay
// 1.56, talc 1.58. Acrylic binder about 1.5, water 1.333, air 1.0.
export const PIG = {
  rutile: { n: 2.73, name: 'titanium dioxide (rutile)', short: 'rutile TiO₂' },
  anatase: { n: 2.55, name: 'titanium dioxide (anatase)', short: 'anatase TiO₂' },
  zinc: { n: 2.01, name: 'zinc white', short: 'zinc white' },
  lead: { n: 2.0, name: 'white lead (old and poisonous)', short: 'white lead' },
  chalk: { n: 1.59, name: 'chalk only', short: 'chalk' },
};
export const N_BINDER = 1.5, N_WATER = 1.333, N_CHALK = 1.59, CPVC = 0.55, LAMBDA = 0.55;
// How strongly a small particle of relative index m scatters: ((m² − 1)/(m² + 2))², the factor in
// Rayleigh's law. Rutile in binder: 0.19. Chalk in binder: 0.0016, over a hundred times weaker.
export const contrast = (np, nm) => { const m2 = (np / nm) * (np / nm); return Math.pow((m2 - 1) / (m2 + 2), 2); };
// Scattering per unit volume of pigment against particle size d (µm). Below the best size it falls as
// d³ (Rayleigh); above it as 1/d (big lumps waste their insides). The peak is put at 0.45 of the
// wavelength: 0.25 µm for green light, as pigment makers find. A smooth stand-in for Mie theory.
export const sizeF = (d, lam = LAMBDA) => { const x = d / (0.45 * lam); return (4 * x * x * x) / (1 + 3 * Math.pow(x, 4)); };
// Crowding: packed particles share their scattering, so each one does less (after Stieg's
// PVC^(1/3) rule). S_REF is set so that 18% rutile by volume gives S = 0.2 per µm, which is what
// makes a good white hide at about 60 µm dry.
const crowd = (phi) => Math.max(0.15, 1 - 0.9 * Math.cbrt(phi));
const S_REF = 0.2 / (0.18 * (1 - 0.9 * Math.cbrt(0.18)) * contrast(2.73, 1.5));
export const K_FILM = 0.0006;   // absorption per µm of a clean white film (gives R∞ of about 0.93)
// The film: p = { pig, tio2 (volume fraction of the dry solids), chalk (same), d (µm), wet }.
export function filmOptics(p) {
  const pvc = clamp(p.tio2 + p.chalk, 0, 0.95);
  // above the critical PVC there is not enough binder to fill the gaps: air pockets remain
  const voids = Math.max(0, (pvc * (1 - CPVC)) / CPVC - (1 - pvc)), por = voids / (1 + voids);
  const nFill = p.wet ? N_WATER : 1.0;
  const share = por / Math.max(1e-6, por + (1 - pvc) / (1 + voids));       // how much of the gap space is not binder
  let nMed = N_BINDER * (1 - share) + nFill * share;
  if (p.wet) nMed = 0.45 * nMed + 0.55 * N_WATER;                           // a wet coat is more than half water
  const np = PIG[p.pig].n, conc = p.wet ? VS : 1 - por;
  const f1 = p.tio2 * conc, f2 = p.chalk * conc;
  const sPig = S_REF * contrast(np, nMed) * sizeF(p.d) * f1 * crowd(f1);
  const sChalk = S_REF * contrast(N_CHALK, nMed) * sizeF(3) * f2;           // extender lumps are about 3 µm
  const sVoid = S_REF * contrast(nFill, 1.6) * sizeF(0.5) * por * (p.wet ? 0.5 : 1);
  return { pvc, por, nMed, S: sPig + sChalk + sVoid, sPig, sChalk, sVoid, K: K_FILM, m: np / nMed };
}
// Kubelka and Munk (1931), in Kubelka's 1948 form: reflectance of a layer of thickness X with
// scattering S and absorption K (both per unit thickness) over a ground of reflectance Rg.
export function kmR(S, K, X, Rg) {
  if (S * X < 1e-9) return Rg;
  const a = 1 + K / S, b = Math.sqrt(Math.max(1e-12, a * a - 1)), z = b * S * X;
  const coth = z > 30 ? 1 : (Math.exp(2 * z) + 1) / (Math.exp(2 * z) - 1);
  return (1 - Rg * (a - b * coth)) / (a - Rg + b * coth);
}
export const R_WHITE = 0.8, R_BLACK = 0.0;   // the black and white hiding chart (ASTM D2805: white 80%, black ≤ 1%)
export const contrastRatio = (S, K, X) => kmR(S, K, X, R_BLACK) / kmR(S, K, X, R_WHITE);
// Dry thickness (µm) at which the contrast ratio reaches 0.98, the trade's "full hiding".
export function hidingThickness(S, K) {
  if (contrastRatio(S, K, 5000) < 0.98) return null;
  let lo = 0.1, hi = 5000;
  for (let i = 0; i < 40; i++) { const mid = Math.sqrt(lo * hi); if (contrastRatio(S, K, mid) < 0.98) lo = mid; else hi = mid; }
  return hi;
}

// ---------------------------------------------------------------- colour
// CIE 1931 colour-matching functions, the analytic fit of Wyman, Sloan and Shirley (JCGT 2013).
const gl = (l, mu, s1, s2) => Math.exp(-0.5 * Math.pow((l - mu) / (l < mu ? s1 : s2), 2));
export const cmf = (l) => [
  1.056 * gl(l, 599.8, 37.9, 31.0) + 0.362 * gl(l, 442.0, 16.0, 26.7) - 0.065 * gl(l, 501.1, 20.4, 26.2),
  0.821 * gl(l, 568.8, 46.9, 40.5) + 0.286 * gl(l, 530.9, 16.3, 31.1),
  1.217 * gl(l, 437.0, 11.8, 36.0) + 0.681 * gl(l, 459.0, 26.0, 13.8)];
export const WL = []; for (let l = 400; l <= 700; l += 10) WL.push(l);
const WHITE = WL.reduce((a, l) => { const c = cmf(l); return [a[0] + c[0], a[1] + c[1], a[2] + c[2]]; }, [0, 0, 0]);
const sig = (x) => 1 / (1 + Math.exp(-x));
// Colourants: how strongly each absorbs across the spectrum (0 to 1, smooth teaching shapes drawn
// from published reflectance curves), and how much K/S one mL in a litre of white base adds.
// Phthalocyanine blue and carbon black are far stronger tinters than the iron oxides.
export const TINTS = {
  yellow: { name: 'yellow iron oxide', col: '#d9a521', str: 0.02, k: (l) => 0.04 + 0.96 * sig((492 - l) / 14) },
  red: { name: 'red iron oxide', col: '#a8402a', str: 0.05, k: (l) => 0.1 + 0.9 * sig((588 - l) / 14) },
  blue: { name: 'phthalo blue', col: '#1f4fb8', str: 0.12, k: (l) => 0.03 + 0.97 * sig((l - 572) / 18) + 0.12 * sig((425 - l) / 12) },
  black: { name: 'carbon black', col: '#555', str: 0.16, k: () => 1 },
};
// Reflectance of a thick tinted film at each wavelength: K/S adds up over the colourants, and
// R∞ = 1 + K/S − √((K/S)² + 2·K/S) (Kubelka and Munk).
export function tintSpectrum(dose) {
  return WL.map((l) => { let ks = 0.003; for (const id in TINTS) ks += (dose[id] || 0) * TINTS[id].str * TINTS[id].k(l); return 1 + ks - Math.sqrt(ks * ks + 2 * ks); });
}
// Spectrum → sRGB under even white light, scaled so a perfect white is (1, 1, 1).
export function spectrumRGB(R) {
  let X = 0, Y = 0, Z = 0;
  WL.forEach((l, i) => { const c = cmf(l); X += R[i] * c[0]; Y += R[i] * c[1]; Z += R[i] * c[2]; });
  X = (X / WHITE[0]) * 0.9505; Y /= WHITE[1]; Z = (Z / WHITE[2]) * 1.089;
  const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const rgb = lin.map((v) => { v = clamp(v, 0, 1); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; });
  return { rgb, Y, css: `rgb(${rgb.map((v) => Math.round(v * 255)).join(',')})`, hex: (Math.round(rgb[0] * 255) << 16) | (Math.round(rgb[1] * 255) << 8) | Math.round(rgb[2] * 255) };
}
// ---------------------------------------------------------------- sheen
// Mirror-like reflection off a film of index 1.5 at 60°, against the gloss meter's black glass
// standard (n = 1.567, defined as 100 gloss units). Fresnel's equations give 8.9% against 10.0%.
function fresnel(n, deg) { const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180), q = Math.sqrt(n * n - s * s); return 0.5 * (Math.pow((c - q) / (c + q), 2) + Math.pow((n * n * c - q) / (n * n * c + q), 2)); }
export const GLOSS_MAX = (100 * fresnel(1.5, 60)) / fresnel(1.567, 60);
// Roughness (rms height, µm) rises as pigment crowds the surface: smooth resin at low PVC, pigment
// poking through near the critical PVC. A teaching curve through the usual bands.
export const roughness = (pvc) => 0.02 + 0.2 * Math.pow(clamp(pvc / CPVC, 0, 1.6), 2);
// A rough surface keeps exp(−(4π·σ·cos θ / λ)²) of its mirror reflection (Bennett and Porteus 1961).
export const gloss60 = (pvc) => GLOSS_MAX * Math.exp(-Math.pow((4 * Math.PI * roughness(pvc) * 0.5) / LAMBDA, 2));
export const sheenName = (g) => (g < 5 ? 'dead matt' : g < 10 ? 'matt' : g < 25 ? 'eggshell (soft sheen)' : g < 45 ? 'satin' : g < 70 ? 'semi-gloss' : 'gloss');

// ---------------------------------------------------------------- flow
// Viscosity against shear rate, Cross model: η = η∞ + (η0 − η∞) / (1 + (λ·γ̇)^m).
// η0 is what the thickener sets at rest; η∞ = 0.08 Pa·s is the thin limit under the brush.
export const ETA_INF = 0.08;
export const cross = (eta0, rate) => ETA_INF + (eta0 - ETA_INF) / (1 + Math.pow(Math.sqrt(eta0) * 0.6 * rate, 0.75));
// After the brush passes, structure rebuilds over a recovery time (thixotropy). Viscosity climbs
// from its brushed value to its resting value on a log scale.
export const etaAfter = (eta0, tRec, t) => { const lo = cross(eta0, 5000), s = 1 - Math.exp(-t / tRec); return Math.exp(Math.log(lo) * (1 - s) + Math.log(eta0) * s); };
export const RHO_PAINT = 1350, GAMMA = 0.032;   // kg/m³ and N/m, typical of a water-based wall paint
// Brush marks of wavelength L (m) in a wet film h (m) sink as exp(−t/τ) with
// τ = 3·η·L⁴ / (16·π⁴·γ·h³) (Orchard 1962). A wet film on a wall slides down at ρ·g·h² / (2·η) at its
// surface. Both run until the film sets (OPEN seconds, when enough water has left).
export const OPEN = 600;
export function flowRun(eta0, tRec, hMicron, Lmm, n = 120) {
  const h = hMicron * 1e-6, L = Lmm * 1e-3, out = { t: [], a: [], sag: [], eta: [] };
  let lnA = 0, sag = 0, t = 0;
  for (let i = 0; i <= n; i++) {
    const t1 = OPEN * Math.pow(i / n, 2.2), steps = 12;
    for (let k = 0; k < steps; k++) {
      const dt = (t1 - t) / steps, eta = etaAfter(eta0, tRec, t + dt / 2);
      lnA -= dt / ((3 * eta * Math.pow(L, 4)) / (16 * Math.pow(Math.PI, 4) * GAMMA * h * h * h));
      sag += ((RHO_PAINT * G * h * h) / (2 * eta)) * dt;
      t += dt;
    }
    t = t1;
    out.t.push(t1); out.a.push(Math.exp(Math.max(-30, lnA))); out.sag.push(sag * 1000); out.eta.push(etaAfter(eta0, tRec, t1));
  }
  out.left = out.a[n]; out.sagMm = out.sag[n];
  return out;
}
// A particle of radius r (m) and density ρp sinking in the tin (Stokes): v = 2·Δρ·g·r² / (9·η).
export const stokes = (r, rhoP, eta, rhoL = 1000) => (2 * (rhoP - rhoL) * G * r * r) / (9 * eta);
// Spreading rate, m² per litre per coat: 10 × volume solids (%) / dry film thickness (µm).
export const spreadRate = (vsPct, dft) => (10 * vsPct) / dft;

// ---------------------------------------------------------------- damp
// Water vapour through a coating. A coating is rated by sd, the thickness of still air (m) that
// would hold vapour back as much (EN ISO 7783). Flow = δ_air × Δp / sd, with δ_air = 1.95 × 10⁻¹⁰
// kg/(m·s·Pa) for still air near room temperature. Returns grams per m² per day.
export const DELTA_AIR = 1.95e-10;
export const vapourFlow = (sd, T, RH) => ((DELTA_AIR * psatW(T) * (1 - RH / 100)) / sd) * 1000 * 86400;
// Coatings and a typical sd for one finished system. Classes of EN 1062-1: V1 high permeability
// (sd under 0.14 m), V2 medium (0.14 to 1.4 m), V3 low (over 1.4 m). Values are typical of each
// kind of coating, not of any product.
export const COATS = {
  lime: { name: 'limewash', sd: 0.02, col: 0xf3efe2 },
  distemper: { name: 'distemper', sd: 0.04, col: 0xe9e2cf },
  emulsion: { name: 'acrylic emulsion', sd: 0.3, col: 0xdfe9f2 },
  elastic: { name: 'waterproof coating', sd: 1.2, col: 0xcfd8e2 },
  enamel: { name: 'oil enamel', sd: 3, col: 0xf5f0d8 },
};
export const sdClass = (sd) => (sd < 0.14 ? 'V1: breathes freely' : sd <= 1.4 ? 'V2: breathes a little' : 'V3: nearly sealed');
// Humidity right at a wall that is colder than the room air: the same vapour, a lower saturation
// pressure. Mould and algae need about 80% at the surface for days on end (the design limit used
// in building-physics standards such as ASHRAE 160).
export const surfaceRH = (Troom, RH, Twall) => clamp((RH * psatW(Troom)) / psatW(Twall), 0, 100);
export const dewPoint = (T, RH) => { const a = Math.log10((psatW(T) * RH) / 100 / 133.322); return 1730.63 / (8.07131 - a) - 233.426; };
export const LEAD_LIMIT = 90;   // ppm of the dry film: India's 2016 Rules, the WHO/UNEP model law, and the USA since 2009

// ---------------------------------------------------------------- colours and formats
export const COL = { hot: '#ff7a59', cold: '#6fb6ff', heat: '#ffb547', water: '#6fb6ff', steam: '#dfe8f5', oil: '#ff8fb1', gold: '#f2c14e', ok: '#5ce1a9', latent: '#c49bff', text: '#e8eef8', bad: '#ff5d5d', pink: '#f59ee6', copper: '#c7773f' };
export const hex = (c) => new THREE.Color(c).getHex();
export const fmtT = (t) => (t >= 86400 ? `${(t / 86400).toFixed(1)} days` : t >= 3600 ? `${Math.floor(t / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')} min` : t >= 60 ? `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s` : `${Math.round(t)} s`);
export const fmtDur = (t) => (t == null ? 'over a day' : t >= 5400 ? `${(t / 3600).toFixed(t >= 36000 ? 0 : 1)} hours` : t >= 90 ? `${Math.round(t / 60)} min` : `${Math.round(t)} s`);
export function fmtP(Pa) { return Pa >= 1000 ? (Pa / 1000).toFixed(Pa >= 10000 ? 1 : 2) + ' kPa' : Pa >= 1 ? Pa.toFixed(Pa >= 100 ? 0 : 1) + ' Pa' : Pa > 0 ? Pa.toPrecision(2) + ' Pa' : '0 Pa'; }
export function fmtBig(n) { if (!(n > 0)) return '0'; const e = Math.floor(Math.log10(n)), m = n / Math.pow(10, e); return `${m.toFixed(1)} × 10${String(e).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? '⁻').join('')}`; }
export const fmtMg = (mg) => (mg >= 10 ? mg.toFixed(0) + ' mg' : mg >= 0.1 ? mg.toFixed(1) + ' mg' : (mg * 1000).toFixed(mg >= 0.01 ? 0 : 1) + ' µg');

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', xLog = false, yLog = false }) {
  const fx = xLog ? Math.log : (v) => v, fy = yLog ? Math.log : (v) => v;
  const X = (x) => x0 + ((fx(x) - fx(xMin)) / (fx(xMax) - fx(xMin))) * (x1 - x0);
  const Y = (y) => y0 - ((fy(y) - fy(yMin)) / (fy(yMax) - fy(yMin))) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function legend(g, items, x = 24, y = 50, font = 18) {
  g.font = `bold ${font}px sans-serif`;
  for (const [n, c] of items) { g.fillStyle = c; g.fillRect(x, y, 16, 16); g.fillStyle = COL.text; g.fillText(n, x + 22, y + 15); x += 36 + g.measureText(n).width; }
}
export function dashH(g, X0, X1, y, text = '', col = 'rgba(255,255,255,.5)') {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(text, X1 - g.measureText(text).width - 4, y - 8); }
}
// Horizontal bars with labels: rows [{ label, value, color, text }].
export function bars(g, rows, { x = 20, y = 64, w = 600, rowH = 52, labelW = 230, unit = (v) => v, max = null, font = 19 } = {}) {
  const mx = max ?? Math.max(1e-12, ...rows.map((r) => Math.abs(r.value))) * 1.15, span = w - labelW - 20;
  rows.forEach((r, i) => {
    const yy = y + i * rowH, L = clamp(Math.abs(r.value) / mx, 0, 1) * span;
    g.font = `bold ${font}px sans-serif`; g.fillStyle = r.lcol || r.color; g.fillText(r.label, x, yy + rowH * 0.5);
    g.globalAlpha = 0.9; g.fillStyle = r.color; g.fillRect(x + labelW, yy + 6, Math.max(2, L), rowH - 16); g.globalAlpha = 1;
    g.font = `${font - 1}px sans-serif`; g.fillStyle = '#fff'; const t = r.text ?? unit(r.value), tw = g.measureText(t).width;
    const inside = x + labelW + L + 8 + tw > w; if (inside) g.fillStyle = r.dark ? '#111' : '#fff';
    g.fillText(t, inside ? x + labelW + L - tw - 8 : x + labelW + L + 8, yy + rowH * 0.5 + 1);
  });
}
export function wrap(g, text, x, y, maxW, lh) {
  let ln = '';
  for (const wd of text.split(' ')) { if (g.measureText(ln + wd).width > maxW && ln) { g.fillText(ln.trim(), x, y); y += lh; ln = ''; } ln += wd + ' '; }
  if (ln.trim()) { g.fillText(ln.trim(), x, y); y += lh; }
  return y;
}
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------------------------------------------------------------- statistics
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- 3D pieces
// Dots, one instanced mesh, each with its own colour. lit = true gives shaded balls.
export function dots(n, r, color = 0xffffff, seg = 8, lit = false) {
  const mat = lit ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }) : new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) { mesh.setColorAt(i, col); o.position.set(0, -99, 0); o.scale.setScalar(0.0001); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, c) => mesh.setColorAt(i, c);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// Little puffs that drift from a source: step(dt, rate, at, vel, life, tint).
export function puffs(parent, n, r, color, rnd, lit = false) {
  const d = dots(n, r, color, 8, lit); parent.add(d);
  const P = Array.from({ length: n }, () => ({ life: 0, max: 1, p: [0, -99, 0], v: [0, 0, 0] }));
  let acc = 0;
  return {
    mesh: d, P,
    step(dt, rate, at, vel, life = 1.2, tint = null, drag = 0) {
      acc += rate * dt;
      for (let i = 0; i < n; i++) {
        const q = P[i];
        if (q.life <= 0 && acc >= 1) { acc -= 1; q.life = q.max = life * (0.75 + 0.5 * rnd()); q.p = at(); q.v = vel(q.p); if (tint) d.tint(i, tint()); }
        if (q.life > 0) { q.life -= dt; const k = drag ? Math.exp(-drag * dt) : 1; q.v[0] *= k; q.v[1] *= k; q.v[2] *= k; q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; }
        const k = q.life / q.max;
        d.place(i, q.p[0], q.p[1], q.p[2], q.life > 0 ? 0.35 + 0.65 * Math.sin(Math.PI * clamp(k, 0, 1)) : 0.0001);
      }
      if (acc > 20) acc = 20;
      d.done();
    },
    clear() { P.forEach((q) => { q.life = 0; }); acc = 0; },
  };
}
// Dots streaming along a path (a list of points). step(dt, speed, share, tintOf):
// share (0 to 1) is how many of the dots show; tintOf(i) picks each dot's colour.
export function stream(parent, n, r, pts, { jitter = 0.07, seed = 3, color = 0xffffff } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
  const d = dots(n, r, color); parent.add(d);
  const rnd = rng(seed), P = Array.from({ length: n }, () => ({ u: rnd(), o: [(rnd() - 0.5) * 2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2], s: 0.7 + 0.6 * rnd() }));
  const v = new THREE.Vector3();
  return {
    mesh: d, curve,
    step(dt, speed = 0.2, share = 1, tintOf = null) {
      const show = Math.round(n * clamp(share, 0, 1));
      P.forEach((p, i) => {
        p.u += dt * speed * p.s; if (p.u > 1) p.u -= 1;
        curve.getPoint(p.u, v);
        const fade = Math.min(1, p.u * 12, (1 - p.u) * 12);
        d.place(i, v.x + p.o[0] * jitter, v.y + p.o[1] * jitter, v.z + p.o[2] * jitter, i < show ? fade : 0.0001);
        if (tintOf) d.tint(i, tintOf(i));
      });
      d.done();
    },
  };
}
// A shape turned on a lathe around the vertical (Y) axis from [radius, y] pairs. phi limits the sweep
// so a vessel can be cut open towards the viewer (+z is towards the camera; the default cut faces it).
export function latheY(profile, mat, { seg = 56, cut = 0 } = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg, cut ? Math.PI * cut : 0, cut ? TAU - TAU * cut : TAU);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// A wall with thickness: outer profile up, inner profile back down.
export function shell(profile, th, mat, opts) {
  const inner = profile.slice().reverse().map(([r, y]) => [Math.max(0, r - th), y]);
  return latheY([...profile, ...inner], mat, opts);
}
// A ring of flickering flames. set(level 0..1), step(dt).
export function flames(parent, n, R, y, { color = 0xff9a3c, h = 0.5, r = 0.09, line = 0 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  const fs = [];
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat); f.geometry.translate(0, h / 2, 0);
    if (line) f.position.set(-line / 2 + (line * (i + 0.5)) / n, y, R * (i % 2 ? 1 : -1) * 0.5);
    else { const a = (i / n) * TAU; f.position.set(Math.cos(a) * R, y, Math.sin(a) * R); }
    g.add(f); fs.push(f);
  }
  let tt = 0, lvl = 1;
  return { g, set(v) { lvl = v; }, step(dt) { tt += dt; fs.forEach((f, i) => { f.visible = lvl > 0.02; f.scale.set(1, (0.35 + 1.1 * lvl) * (0.8 + 0.35 * Math.sin(tt * 19 + i * 1.9)), 1); }); } };
}
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function flowArrow(color, r = 0.05, head = 0.28) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.05) a.visible = false;
  };
  return a;
}
export function edgesOf(mesh, color = 0x9fb4c8, opacity = 0.7) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
  return e;
}
// The shared camera and board layout. The readout covers the upper left of the stage, so models stay
// low on the left and the two chart boards stack on the right.
export const VIEW = { pos: [2.2, 5.0, 11.6], target: [2.2, 4.2, 0] };
// Square and 16:9 recordings have no readout to dodge, so they frame the model and boards centrally.
export const REEL_VIEW = { pos: [1.9, 3.9, 12.4], target: [1.9, 3.4, 0] };
// The portrait reel: one chart board above the model, both as large as the frame allows.
// TALL suits a model about six units wide; TALLW one that uses the full seven.
export const TALL = { pos: [-0.6, 4.3, 6.2], target: [-0.6, 4.3, 0], by: 6.8 };
export const TALLW = { pos: [-0.25, 4.5, 6.9], target: [-0.25, 4.5, 0], by: 7.0 };
export const BW = 4.6, BH = 2.65, B1 = [6.1, 5.9, 0], B2 = [6.1, 2.9, 0];
// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.19 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// True while the Glassbox studio records the reel: scenes then choose their own camera views.
export const inReel = () => document.body.classList.contains('gb-reel');
// Chart boards sit to the right of the model on screen. In a tall (portrait) reel only the scene's
// main board is kept, above the model. Square and 16:9 recordings keep the side-by-side view.
export function reelBoards(boards, x = 0, stage = null, view = null, primary = 0, tall = TALL) {
  const r = inReel(), wide = r && stage && stage.camera.aspect > 0.9;
  boards.forEach((b, i) => {
    if (!b.home) b.home = b.mesh.position.clone();
    b.hide = r && !wide && i !== primary;
    if (r && !wide) { b.mesh.position.set(tall.target[0], tall.by, 0); b.mesh.scale.setScalar(1.38); }
    else { b.mesh.position.copy(b.home); b.mesh.scale.setScalar(1); }
  });
  if (wide && view) { stage.controls.autoRotate = false; if (stage.home?.pos !== REEL_VIEW.pos) stage.setView(REEL_VIEW.pos, REEL_VIEW.target, 0.01); }
  void x;
}
// On a phone the readout covers the top of the stage, so only one board is kept, low on the right.
export function phoneBoards(stage, boards, primary = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  boards.forEach((b, i) => { b.mesh.visible = !b.hide && (!narrow || i === primary); if (narrow && i === primary) b.mesh.position.set(6.15, 2.25, 0); });
}
export const isPhone = () => window.innerWidth < 560;
export const link = (slug, name, hash = '') => `<a href="https://glassbox.how/${slug}/${hash ? '#' + hash : ''}">${name}</a>`;
export { clamp, lerp, beam, box, sphere, M };
