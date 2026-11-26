// 3D chase-view renderer on a 2D canvas. One job: project the world and
// paint it — sky, terrain mesh, river, runway, rings, huts, trees, clouds
// and the Kestrel STOL itself. No library, no assets, pure canvas.
import { WORLD } from './config.js';
import { heightAt, isRiver, terrainColor } from './terrain.js';

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const SKY_TOP = [86, 158, 214];
const SKY_HORIZON = [198, 222, 235];
const FOG = [188, 216, 234];

/** Camera basis from the plane: chase position, forward, right, up. */
export function cameraFor(plane) {
  const fx = Math.sin(plane.heading);
  const fz = Math.cos(plane.heading);
  const dist = 30;
  const height = 7;
  const cx = plane.x - fx * dist;
  const cz = plane.z - fz * dist;
  const cy = plane.y + height;
  const lookX = plane.x + fx * 26;
  const lookY = plane.y - 1.5 + Math.sin(plane.pitch) * 18;
  const lookZ = plane.z + fz * 26;
  let fwd = [lookX - cx, lookY - cy, lookZ - cz];
  const fl = Math.hypot(fwd[0], fwd[1], fwd[2]);
  fwd = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
  // Right = forward x world-up, rolled slightly with the plane for feel.
  let right = [fwd[2], 0, -fwd[0]];
  const rl = Math.hypot(right[0], right[2]) || 1;
  right = [right[0] / rl, 0, right[2] / rl];
  // Up = forward x right (right-handed basis; right x forward points down).
  const up = [
    fwd[1] * right[2] - fwd[2] * right[1],
    fwd[2] * right[0] - fwd[0] * right[2],
    fwd[0] * right[1] - fwd[1] * right[0],
  ];
  return { pos: [cx, cy, cz], fwd, right, up };
}

function makeProjector(cam, w, h) {
  const focal = (h / 2) / Math.tan((62 * Math.PI) / 360);
  return function project(px, py, pz) {
    const dx = px - cam.pos[0];
    const dy = py - cam.pos[1];
    const dz = pz - cam.pos[2];
    const cz = dx * cam.fwd[0] + dy * cam.fwd[1] + dz * cam.fwd[2];
    if (cz < 1.2) return null;
    const cx = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
    const cy = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
    return { x: w / 2 + (cx / cz) * focal, y: h / 2 - (cy / cz) * focal, d: cz };
  };
}

function fogBlend(ctx, d) {
  const t = Math.max(0, Math.min(0.72, (d - 140) / 900));
  return t;
}

export function drawSky(ctx, w, h, plane) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgb(86,158,214)');
  g.addColorStop(0.55, 'rgb(168,205,232)');
  g.addColorStop(0.72, 'rgb(198,222,235)');
  g.addColorStop(1, 'rgb(190,214,228)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Sun.
  const sx = w * 0.78;
  const sy = h * 0.16;
  const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 70);
  sg.addColorStop(0, 'rgba(255,246,200,0.95)');
  sg.addColorStop(0.25, 'rgba(255,236,160,0.55)');
  sg.addColorStop(1, 'rgba(255,236,160,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 70, sy - 70, 140, 140);
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(sx, sy, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawTerrain(ctx, project, w, h, plane) {
  const step = WORLD.gridStep;
  const z0 = Math.max(0, Math.floor((plane.z - 110) / step) * step);
  const z1 = plane.z + WORLD.viewDistance;
  const x0 = -WORLD.gridHalfX;
  const x1 = WORLD.gridHalfX;
  const cols = Math.round((x1 - x0) / step) + 1;
  // Precompute one row of heights, then sweep far-to-near so nearer quads
  // paint over farther ones (painter's algorithm on a regular grid).
  let prevRow = null;
  for (let z = z1; z >= z0; z -= step) {
    const row = new Array(cols);
    for (let c = 0; c < cols; c += 1) {
      const x = x0 + c * step;
      row[c] = heightAt(x, z);
    }
    if (prevRow) {
      for (let c = 0; c < cols - 1; c += 1) {
        const x = x0 + c * step;
        const x2 = x + step;
        const h00 = row[c];
        const h10 = row[c + 1];
        const h01 = prevRow[c];
        const h11 = prevRow[c + 1];
        const p00 = project(x, h00, z);
        const p10 = project(x2, h10, z);
        const p01 = project(x, h01, z + step);
        const p11 = project(x2, h11, z + step);
        if (!p00 || !p10 || !p01 || !p11) continue;
        if (Math.max(p00.x, p10.x, p01.x, p11.x) < -40) continue;
        if (Math.min(p00.x, p10.x, p01.x, p11.x) > w + 40) continue;
        if (Math.min(p00.y, p10.y, p01.y, p11.y) > h + 40) continue;
        const midH = (h00 + h10 + h01 + h11) / 4;
        const midX = x + step / 2;
        const midZ = z + step / 2;
        const slope = (h01 + h11 - h00 - h10) / (2 * step);
        ctx.fillStyle = terrainColor(midX, midZ, midH, slope);
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fill();
        // Distance haze over far quads.
        const t = fogBlend(ctx, p00.d);
        if (t > 0.02) {
          ctx.fillStyle = `rgba(188,216,234,${t.toFixed(3)})`;
          ctx.fill();
        }
      }
    }
    prevRow = row;
  }
}

function drawRunway(ctx, project, plane) {
  const r = WORLD.runway;
  const corners = [
    [r.x - r.halfWidth, r.elevation + 0.4, r.z0],
    [r.x + r.halfWidth, r.elevation + 0.4, r.z0],
    [r.x + r.halfWidth, r.elevation + 0.4, r.z1],
    [r.x - r.halfWidth, r.elevation + 0.4, r.z1],
  ].map(([x, y, z]) => project(x, y, z));
  if (corners.some((p) => !p)) return;
  ctx.fillStyle = '#3a3d42';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.fillStyle = '#f5f2e8';
  for (let z = r.z0 + 20; z < r.z1 - 10; z += 40) {
    const a = project(0, r.elevation + 0.6, z);
    const b = project(0, r.elevation + 0.6, z + 18);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x - 1.5, a.y);
    ctx.lineTo(b.x - 1.5, b.y);
    ctx.lineTo(b.x + 1.5, b.y);
    ctx.lineTo(a.x + 1.5, a.y);
    ctx.closePath();
    ctx.fill();
  }
  // Orange threshold bars at both ends.
  ctx.fillStyle = '#e8862e';
  [r.z0 + 4, r.z1 - 8].forEach((z) => {
    const a = project(r.x - r.halfWidth + 2, r.elevation + 0.6, z);
    const b = project(r.x + r.halfWidth - 2, r.elevation + 0.6, z + 4);
    if (!a || !b) return;
    ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.max(2, Math.abs(b.y - a.y) + 2));
  });
  // Windsock beside the threshold.
  const sock = project(r.x + r.halfWidth + 8, r.elevation + 9, r.z0 + 10);
  if (sock && sock.d > 0) {
    ctx.strokeStyle = '#c33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y + 14);
    ctx.lineTo(sock.x, sock.y);
    ctx.stroke();
    ctx.fillStyle = '#e8641e';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x + 12 + plane.wind, sock.y + 3);
    ctx.lineTo(sock.x, sock.y + 6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRing(ctx, project, ring) {
  const pts = [];
  for (let i = 0; i <= 28; i += 1) {
    const a = (i / 28) * Math.PI * 2;
    const px = ring.x + Math.cos(a) * ring.radius;
    const py = ring.y + Math.sin(a) * ring.radius;
    const p = project(px, py, ring.z);
    if (p) pts.push(p);
  }
  if (pts.length < 8) return;
  ctx.lineWidth = Math.max(2, 420 / pts[0].d);
  ctx.strokeStyle = ring.passed ? 'rgba(120,200,120,0.9)' : '#ffc21c';
  ctx.shadowColor = '#ff9d00';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner glow ring.
  ctx.lineWidth = Math.max(1, 180 / pts[0].d);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.stroke();
}

function drawHut(ctx, project, hut) {
  const base = project(hut.x, hut.y, hut.z);
  if (!base) return;
  const s = Math.max(2, 900 / base.d);
  const top = project(hut.x, hut.y + 5 * (s / 8), hut.z);
  if (!top) return;
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(base.x - s, base.y - s * 0.9, s * 2, s * 0.9);
  ctx.fillStyle = '#8a2f24';
  ctx.beginPath();
  ctx.moveTo(base.x - s * 1.2, base.y - s * 0.9);
  ctx.lineTo(base.x, base.y - s * 1.7);
  ctx.lineTo(base.x + s * 1.2, base.y - s * 0.9);
  ctx.closePath();
  ctx.fill();
  if (!hut.dropped) {
    // Smoke column marks the drop target.
    ctx.fillStyle = 'rgba(240,240,240,0.55)';
    ctx.beginPath();
    ctx.arc(base.x + Math.sin(hut.z) * 3, base.y - s * 2.6, s * 0.45, 0, Math.PI * 2);
    ctx.arc(base.x + 2, base.y - s * 3.6, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2fae4e';
    ctx.font = `bold ${Math.max(11, Math.round(s * 0.9))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SUPPLIED ✓', base.x, base.y - s * 2.2);
  }
}

function drawTrees(ctx, project, trees, plane) {
  ctx.fillStyle = '#2e5d33';
  for (let i = 0; i < trees.length; i += 1) {
    const t = trees[i];
    if (Math.abs(t.z - plane.z) > 900 || Math.abs(t.x - plane.x) > 420) continue;
    const p = project(t.x, t.y, t.z);
    if (!p || p.x < -20 || p.x > 1300 || p.y < -20 || p.y > 900) continue;
    const s = Math.max(1.5, (t.s * 260) / p.d);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s * 1.6);
    ctx.lineTo(p.x - s * 0.55, p.y);
    ctx.lineTo(p.x + s * 0.55, p.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawClouds(ctx, project, clouds) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < clouds.length; i += 1) {
    const c = clouds[i];
    const p = project(c.x, c.y, c.z);
    if (!p) continue;
    const s = (c.s * 320) / p.d;
    if (s < 2 || s > 400) continue;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The Kestrel STOL, built from projected polygons: fuselage, wing,
// tailplane, fin and a spinning prop disc. Drawn in world space so it
// banks, pitches and yaws with the flight model.
function drawPlane(ctx, project, plane) {
  const cy = Math.cos(plane.heading);
  const sy = Math.sin(plane.heading);
  const cp = Math.cos(plane.pitch);
  const sp = Math.sin(plane.pitch);
  const cr = Math.cos(plane.roll);
  const sr = Math.sin(plane.roll);
  function xform(lx, ly, lz) {
    // Roll around Z, pitch around X, yaw around Y, then translate.
    let x = lx * cr - ly * sr;
    let y = lx * sr + ly * cr;
    let z = lz;
    const y2 = y * cp - z * sp;
    const z2 = y * sp + z * cp;
    y = y2;
    z = z2;
    const x2 = x * cy + z * sy;
    const z3 = -x * sy + z * cy;
    return project(plane.x + x2, plane.y + y, plane.z + z3);
  }
  function poly(points, color) {
    const pts = points.map(([x, y, z]) => xform(x, y, z));
    if (pts.some((p) => !p)) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  // Wing (top, red with white tips) and tailplane.
  poly([[-7, 0.25, 1.6], [7, 0.25, 1.6], [7, 0.25, -1.2], [-7, 0.25, -1.2]], '#c0392b');
  poly([[-7, 0.25, 1.6], [-5.4, 0.25, 1.6], [-5.4, 0.25, -1.2], [-7, 0.25, -1.2]], '#f5f2e8');
  poly([[5.4, 0.25, 1.6], [7, 0.25, 1.6], [7, 0.25, -1.2], [5.4, 0.25, -1.2]], '#f5f2e8');
  poly([[-2.6, 0.15, -4.4], [2.6, 0.15, -4.4], [2.6, 0.15, -5.6], [-2.6, 0.15, -5.6]], '#c0392b');
  // Fuselage top and sides.
  poly([[-0.85, 0.3, 5.6], [0.85, 0.3, 5.6], [0.9, 0.3, -5.2], [-0.9, 0.3, -5.2]], '#f5f2e8');
  poly([[-0.9, 0.3, 3.4], [0.9, 0.3, 3.4], [0.9, -0.5, -5.2], [-0.9, -0.5, -5.2]], '#d8d2c2');
  // Cheatline stripe.
  poly([[-0.92, 0.05, 4.6], [0.92, 0.05, 4.6], [0.92, -0.18, -5.0], [-0.92, -0.18, -5.0]], '#c0392b');
  // Tail fin.
  poly([[-0.08, 0.2, -4.6], [0.08, 0.2, -4.6], [0.08, 2.1, -5.6], [-0.08, 2.1, -5.6]], '#c0392b');
  // Cockpit glass.
  poly([[-0.6, 0.32, 3.6], [0.6, 0.32, 3.6], [0.55, 0.32, 1.6], [-0.55, 0.32, 1.6]], '#1d3a4d');
  // Spinning prop disc.
  const hub = xform(0, 0, 6.1);
  const rim = xform(1.7, 0, 6.1);
  if (hub && rim) {
    const r = Math.abs(rim.x - hub.x) + Math.abs(rim.y - hub.y);
    ctx.fillStyle = 'rgba(40,40,40,0.28)';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, Math.max(2, r * 0.9), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paint one frame of the world (no HUD) for the given mission state. */
export function renderWorld(ctx, w, h, mission) {
  const plane = mission.plane;
  const cam = cameraFor(plane);
  const project = makeProjector(cam, w, h);
  drawSky(ctx, w, h, plane);
  drawClouds(ctx, project, mission.props.clouds);
  drawTerrain(ctx, project, w, h, plane);
  drawRunway(ctx, project, plane);
  mission.rings.forEach((ring) => {
    if (Math.abs(ring.z - plane.z) < 1000) drawRing(ctx, project, ring);
  });
  mission.huts.forEach((hut) => {
    if (Math.abs(hut.z - plane.z) < 900) drawHut(ctx, project, hut);
  });
  drawTrees(ctx, project, mission.props.trees, plane);
  drawPlane(ctx, project, plane);
}
