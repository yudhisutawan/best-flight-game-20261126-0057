// Flight model for the Kestrel STOL single. One job: turn throttle, pitch,
// roll and flap input into position, speed, fuel and damage.
import { PLANE, WORLD } from './config.js';
import { heightAt } from './terrain.js';

export function createPlane() {
  return {
    x: 0,
    y: WORLD.startAltitude,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: PLANE.cruiseSpeed,
    throttle: 0.62,
    fuel: 100,
    damage: 0,
    flaps: false,
    verticalSpeed: 0,
    stalled: false,
    onGround: false,
    wind: 0,
    time: 0,
  };
}

/**
 * Advance the plane one step. `input` is {pitch:-1..1, roll:-1..1,
 * throttle:-1..1 (delta), flaps:boolean}. Returns events: 'stall' | 'crash'
 * | 'landed' | 'fuelEmpty' | null.
 */
export function stepPlane(p, input, dt) {
  p.time += dt;
  // Wind gusts push the tail sideways; they grow with altitude.
  p.wind = Math.sin(p.time * 0.35) * 3.2 + Math.sin(p.time * 0.9) * 1.4;
  p.throttle = Math.max(0, Math.min(1, p.throttle + (input.throttle || 0) * dt * 0.7));
  if (p.fuel <= 0) p.throttle = 0;
  p.flaps = !!input.flaps;

  const flapDrag = p.flaps ? 9 : 0;
  const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed) - flapDrag;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.55);

  p.pitch += (input.pitch || 0) * PLANE.pitchRate * dt;
  p.pitch = Math.max(-0.5, Math.min(0.5, p.pitch));
  p.roll += (input.roll || 0) * PLANE.rollRate * dt;
  p.roll = Math.max(-1.1, Math.min(1.1, p.roll));
  // Gentle auto-coordination: wings level themselves when hands are off.
  if (!(input.roll || 0)) p.roll *= Math.max(0, 1 - dt * 0.8);
  if (!(input.pitch || 0)) p.pitch *= Math.max(0, 1 - dt * 0.6);

  p.heading += -p.roll * PLANE.turnRate * (p.speed / PLANE.cruiseSpeed) * dt;

  const prevY = p.y;
  const climb = Math.sin(p.pitch) * p.speed * PLANE.climbRate;
  p.stalled = p.speed < PLANE.stallSpeed;
  const sink = p.stalled ? (PLANE.stallSpeed - p.speed) * 0.55 : 0;
  p.y += (climb - sink) * dt;
  p.verticalSpeed = (p.y - prevY) / dt;

  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  p.x += (fx * p.speed + p.wind * 0.35) * dt;
  p.z += fz * p.speed * dt;

  // Keep the pilot inside the valley walls.
  if (Math.abs(p.x) > 480) {
    p.x = Math.sign(p.x) * 480;
    p.damage = Math.min(100, p.damage + 4 * dt);
  }

  p.fuel = Math.max(0, p.fuel - (0.12 + p.throttle * PLANE.fuelBurn) * dt);
  if (p.fuel <= 0 && p.throttle === 0) return 'fuelEmpty';

  const ground = heightAt(p.x, p.z);
  const r = WORLD.runway;
  const overRunway =
    Math.abs(p.x - r.x) < r.halfWidth && p.z > r.z0 && p.z < r.z1;
  if (p.y <= ground + 1.6) {
    if (p.onGround) {
      // Rolling out: stay pinned to the strip, bleed speed, never re-crash.
      p.y = ground + 1.6;
      p.verticalSpeed = 0;
      p.speed = Math.max(0, p.speed - 26 * dt);
      return 'landed';
    }
    if (overRunway && Math.abs(p.verticalSpeed) < 3.2 && p.speed < 46 && Math.abs(p.roll) < 0.35) {
      p.y = ground + 1.6;
      p.onGround = true;
      p.speed = Math.max(0, p.speed - 26 * dt);
      return 'landed';
    }
    p.damage = 100;
    return 'crash';
  }
  if (p.y > 420) {
    p.y = 420;
    p.pitch = Math.min(p.pitch, 0);
  }
  return p.stalled ? 'stall' : null;
}

export function knots(p) {
  return Math.round(p.speed * 1.944);
}

export function feet(p) {
  return Math.round(p.y * 3.281);
}

export function headingDegrees(p) {
  return Math.round(((p.heading * 180) / Math.PI % 360) + 360) % 360;
}
