// Ring course and supply-drop targets. One job: where the rings and huts
// are, and whether the plane flew through one.
import { WORLD } from './config.js';
import { heightAt, riverX } from './terrain.js';

/** 12 golden rings threading down the valley, following the river. */
export function buildRings(count) {
  const rings = [];
  for (let i = 0; i < count; i += 1) {
    const z = 320 + i * 185;
    const x = riverX(z) * 0.55 + Math.sin(i * 1.7) * 22;
    const y = Math.max(52, heightAt(x, z) + 42 + Math.sin(i * 0.9) * 14);
    rings.push({ x, y, z, radius: 15, passed: false, centre: false });
  }
  return rings;
}

/**
 * Check the plane against the next unpassed ring. Returns the ring when the
 * plane crosses its plane inside the hoop, else null. `centre` is true for
 * a pass within the inner third of the hoop.
 */
export function checkRing(plane, ring) {
  if (ring.passed) return null;
  const dz = plane.z - ring.z;
  if (Math.abs(dz) > 7) return null;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > ring.radius) return null;
  ring.passed = true;
  ring.centre = dist < ring.radius / 3;
  return ring;
}

/** A hut is droppable from 40–120 m up, within 26 m horizontally. */
export function hutInDropWindow(plane, hut) {
  const dx = plane.x - hut.x;
  const dz = plane.z - hut.z;
  const alt = plane.y - hut.y;
  return Math.abs(dx) < 26 && Math.abs(dz) < 26 && alt > 40 && alt < 120;
}
