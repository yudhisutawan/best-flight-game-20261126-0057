// Deterministic screenshot scenes behind ?shot=ring|landing|drop|title.
// Each one plays the real rules forward from a fresh mission for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { createMission, nextRing, stepMission } from './missions.js';
import { heightAt } from './terrain.js';
import { WORLD } from './config.js';

const STEP = 1 / 60;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Steer the plane toward a target point at a target speed. */
function autopilot(plane, tx, ty, tz, targetSpeed) {
  const desiredHeading = Math.atan2(tx - plane.x, tz - plane.z);
  const headingErr = angleDiff(desiredHeading, plane.heading);
  // Damped steering: proportional turn plus counter-roll against current bank.
  const roll = clamp(-headingErr * 1.4 - plane.roll * 0.9, -1, 1);
  const desiredPitch = clamp((ty - plane.y) * 0.02, -0.4, 0.4);
  const pitch = clamp((desiredPitch - plane.pitch) * 2.5, -1, 1);
  const throttle = plane.speed < targetSpeed - 3 ? 1 : plane.speed > targetSpeed + 3 ? -1 : 0;
  return { pitch, roll, throttle, flaps: false };
}

function simulate(mission, seconds, targetFn) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (mission.status !== 'flying') break;
    const input = targetFn(mission);
    stepMission(mission, input, false, STEP);
  }
  return mission;
}

/**
 * Stage `mission` to the named scene and return the screen to draw over it.
 * Names: title | ring | landing | drop; anything else is title.
 */
export function stageShot(name, mission) {
  if (name === 'ring') {
    const m = mission.id === 'ring' ? mission : createMission('ring');
    simulate(m, 13, (s) => {
      const ring = nextRing(s) || s.rings[s.rings.length - 1];
      return autopilot(s.plane, ring.x, ring.y, ring.z, 58);
    });
    return { screen: 'play', mission: m };
  }
  if (name === 'landing') {
    const m = createMission('land');
    simulate(m, 39, (s) => {
      const p = s.plane;
      const r = WORLD.runway;
      const dist = Math.max(0, r.z0 - p.z);
      // Glide slope down to a 2.5 m flare over the threshold; always aim
      // 200 m ahead so the heading never flips past the target point.
      const targetY = r.elevation + Math.max(1.2, dist * 0.05);
      const input = autopilot(p, 0, targetY, p.z + 200, dist < 600 ? 40 : 58);
      input.flaps = p.z > 1500;
      if (p.onGround) input.throttle = -1;
      return input;
    });
    return { screen: 'play', mission: m };
  }
  if (name === 'drop') {
    const m = createMission('drop');
    simulate(m, 9.5, (s) => {
      const hut = s.huts.find((h) => !h.dropped) || s.huts[0];
      return autopilot(s.plane, hut.x, hut.y + 85, hut.z, 52);
    });
    return { screen: 'play', mission: m };
  }
  // Title: the Kestrel parked on the threshold at dawn light, valley ahead.
  const m = createMission('ring');
  m.plane.x = 0;
  m.plane.z = WORLD.runway.z0 - 30;
  m.plane.y = heightAt(0, WORLD.runway.z0 - 30) + 1.6;
  m.plane.speed = 0;
  m.plane.throttle = 0;
  m.plane.onGround = true;
  return { screen: 'title', mission: m };
}
