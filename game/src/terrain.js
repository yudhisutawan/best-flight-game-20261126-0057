// Kestrel Valley terrain. One job: the heightfield, the river, the runway
// flattening, and the fixed props (trees, huts, clouds) that sit on it.
import { WORLD } from './config.js';
import { fbm, mulberry32, noise2 } from './random.js';

export function riverX(z) {
  return 55 * Math.sin(z * 0.0035 + 1.2);
}

/** Ground height in metres at world (x, z). */
export function heightAt(x, z) {
  const ax = Math.abs(x);
  const valley = Math.max(0, ax - WORLD.valleyHalfWidth);
  const mountain = Math.pow(Math.min(valley / 260, 1), 1.6) * WORLD.mountainHeight;
  const rolling = fbm(x, z, WORLD.seed) * (8 + mountain * 0.12);
  let h = 6 + mountain + rolling;
  // River carves the valley floor.
  const riverDist = Math.abs(x - riverX(z));
  if (riverDist < 16) h -= (1 - riverDist / 16) * 4;
  // Kestrel Strip is graded flat: 1 inside the strip, fading over 26 m out.
  const r = WORLD.runway;
  const dx = Math.max(0, Math.abs(x - r.x) - r.halfWidth);
  const dz = Math.max(0, Math.max(r.z0 - z, z - r.z1));
  const outside = Math.max(dx, dz);
  if (outside < 26) {
    const flat = 1 - outside / 26;
    h = h * (1 - flat) + r.elevation * flat;
  }
  return h;
}

export function isSnow(height) {
  return height > 120;
}

export function isRiver(x, z) {
  return Math.abs(x - riverX(z)) < 9 && heightAt(x, z) < 14;
}

/** Fixed props, generated once from the seed. */
export function buildProps() {
  const rand = mulberry32(WORLD.seed + 99);
  const trees = [];
  for (let i = 0; i < 420; i += 1) {
    const x = (rand() * 2 - 1) * 420;
    const z = 60 + rand() * 2900;
    const h = heightAt(x, z);
    if (h > 60 || h < 4 || Math.abs(x - riverX(z)) < 14) continue;
    trees.push({ x, z, y: h, s: 5 + rand() * 7 });
  }
  const huts = [
    { x: -58, z: 620, name: 'HUT 1 — ELDER MARA' },
    { x: 64, z: 1420, name: 'HUT 2 — GOAT HERD' },
    { x: -48, z: 2210, name: 'HUT 3 — WEATHER POST' },
  ].map((hut) => ({ ...hut, y: heightAt(hut.x, hut.z) }));
  const clouds = [];
  for (let i = 0; i < 42; i += 1) {
    clouds.push({
      x: (rand() * 2 - 1) * 900,
      z: rand() * 3000,
      y: 230 + rand() * 90,
      s: 40 + rand() * 70,
    });
  }
  return { trees, huts, clouds };
}

/** Terrain colour for a quad centre, with slope shading folded in. */
export function terrainColor(x, z, height, slope) {
  let r;
  let g;
  let b;
  if (isRiver(x, z)) {
    r = 52; g = 118; b = 168;
  } else if (isSnow(height)) {
    r = 232; g = 238; b = 244;
  } else if (height > 72) {
    r = 107; g = 93; b = 79;
  } else if (height > 40) {
    r = 96; g = 112; b = 62;
  } else {
    r = 74; g = 124; b = 58;
  }
  const shade = 1 - Math.min(0.28, Math.max(0, slope) * 0.5) + Math.min(0.12, Math.max(0, -slope) * 0.3);
  const n = noise2(x * 0.05, z * 0.05, WORLD.seed + 5) * 0.05;
  const k = Math.max(0.55, Math.min(1.15, shade + n));
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}
