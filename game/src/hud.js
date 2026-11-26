// HUD: lit instruments over the chase view. One job: altitude tape,
// airspeed tape, compass strip, artificial horizon, fuel/damage, mission
// status and centre messages — everything criterion 1 asks to see.
import { feet, headingDegrees, knots } from './plane.js';
import { objectiveText } from './missions.js';

const PANEL = 'rgba(8,18,28,0.72)';
const LIT = '#7dffd4';
const AMBER = '#ffc21c';
const RED = '#ff5a4e';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,255,212,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function tape(ctx, x, y, w, h, value, step, unit, format) {
  panel(ctx, x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const mid = y + h / 2;
  const pxPerUnit = h / (step * 8);
  const base = Math.floor(value / step) * step;
  for (let v = base - step * 4; v <= base + step * 5; v += step) {
    const ty = mid - (v - value) * pxPerUnit;
    if (ty < y + 4 || ty > y + h - 4) continue;
    const major = v % (step * 2) === 0;
    ctx.strokeStyle = major ? LIT : 'rgba(125,255,212,0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + w - (major ? 16 : 9), ty);
    ctx.lineTo(x + w, ty);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#dfffeF';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(format(v), x + w - 20, ty + 4);
    }
  }
  ctx.restore();
  // Current value box.
  ctx.fillStyle = '#0d2b22';
  ctx.strokeStyle = LIT;
  ctx.beginPath();
  ctx.roundRect(x + w - 52, mid - 13, 52, 26, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = LIT;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(format(value), x + w - 26, mid + 5);
  ctx.fillStyle = 'rgba(223,255,239,0.8)';
  ctx.font = '10px monospace';
  ctx.fillText(unit, x + w / 2, y + h + 14);
}

function compass(ctx, w, heading) {
  const cw = 340;
  const x = (w - cw) / 2;
  const y = 10;
  panel(ctx, x, y, cw, 34);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, cw, 34);
  ctx.clip();
  const pxPerDeg = cw / 120;
  const midX = x + cw / 2;
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -60; d <= 60; d += 5) {
    const deg = ((Math.round(heading) + d) % 360 + 360) % 360;
    const tx = midX + d * pxPerDeg;
    const major = deg % 45 === 0;
    const mid = deg % 90 === 0;
    ctx.strokeStyle = major ? LIT : 'rgba(125,255,212,0.45)';
    ctx.beginPath();
    ctx.moveTo(tx, y + 30);
    ctx.lineTo(tx, y + (major ? 16 : 23));
    ctx.stroke();
    if (major) {
      ctx.fillStyle = mid ? AMBER : '#dfffeF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(names[deg] || String(deg), tx, y + 13);
    }
  }
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, y + 34);
  ctx.lineTo(w / 2 + 6, y + 34);
  ctx.lineTo(w / 2, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#dfffeF';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${String(Math.round(heading)).padStart(3, '0')}°`, w / 2, y + 56);
}

function horizon(ctx, x, y, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-plane.roll);
  const pitchPx = plane.pitch * r * 1.4;
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r, -r - pitchPx, r * 2, r + pitchPx);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(-r, pitchPx, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = LIT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.fillStyle = AMBER;
  ctx.fillRect(x - r - 8, y - 2, 12, 4);
  ctx.fillRect(x + r - 4, y - 2, 12, 4);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function bar(ctx, x, y, w, label, frac, good, warn) {
  ctx.fillStyle = '#dfffeF';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 5);
  ctx.fillStyle = 'rgba(8,18,28,0.72)';
  ctx.fillRect(x, y, w, 10);
  const color = frac > warn ? good : frac > 0.25 ? AMBER : RED;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * frac), 8);
  ctx.strokeStyle = 'rgba(125,255,212,0.4)';
  ctx.strokeRect(x, y, w, 10);
  ctx.fillStyle = '#dfffeF';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(frac * 100)}%`, x + w + 34, y + 9);
}

export function drawHud(ctx, w, h, mission) {
  const p = mission.plane;
  const heading = headingDegrees(p);
  // Crosshair.
  ctx.strokeStyle = 'rgba(125,255,212,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.46, 14, 0, Math.PI * 2);
  ctx.moveTo(w / 2 - 22, h * 0.46);
  ctx.lineTo(w / 2 - 8, h * 0.46);
  ctx.moveTo(w / 2 + 8, h * 0.46);
  ctx.lineTo(w / 2 + 22, h * 0.46);
  ctx.stroke();

  tape(ctx, 16, h / 2 - 110, 92, 220, knots(p), 10, 'KT', (v) => String(Math.round(v)));
  tape(ctx, w - 108, h / 2 - 110, 92, 220, feet(p), 100, 'FT', (v) => String(Math.round(v)));
  compass(ctx, w, heading);
  horizon(ctx, 96, h - 92, 46, p);

  // Throttle + flaps readout under the horizon.
  ctx.fillStyle = '#dfffeF';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`THR ${Math.round(p.throttle * 100)}%${p.flaps ? '  FLAPS' : ''}`, 16, h - 26);
  ctx.fillText(`WIND ${p.wind >= 0 ? '→' : '←'} ${Math.abs(p.wind).toFixed(1)} m/s`, 16, h - 8);

  // Fuel / damage, bottom right.
  bar(ctx, w - 220, h - 64, 170, 'FUEL', p.fuel / 100, '#37d67a', 0.5);
  bar(ctx, w - 220, h - 34, 170, 'DAMAGE', p.damage / 100, RED, 0.5);

  // Mission header, top left.
  panel(ctx, 16, 10, 300, 54);
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(mission.def.name, 28, 30);
  ctx.fillStyle = '#dfffeF';
  ctx.font = '12px monospace';
  ctx.fillText(objectiveText(mission), 28, 48);

  // Score, top right, on its own panel so it reads against sky.
  panel(ctx, w - 176, 10, 160, 54);
  ctx.fillStyle = '#dfffeF';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${mission.score}`, w - 28, 30);
  ctx.font = '12px monospace';
  ctx.fillText(`TIME ${Math.floor(mission.elapsed / 60)}:${String(Math.floor(mission.elapsed % 60)).padStart(2, '0')}`, w - 28, 48);

  // Centre flash message.
  if (mission.message && mission.elapsed < mission.messageUntil) {
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,18,28,0.7)';
    const tw = ctx.measureText(mission.message).width;
    ctx.fillRect(w / 2 - tw / 2 - 16, h * 0.2 - 28, tw + 32, 40);
    ctx.fillStyle = mission.status === 'crashed' ? RED : AMBER;
    ctx.fillText(mission.message, w / 2, h * 0.2);
  }
  if (p.stalled && mission.status === 'flying') {
    ctx.fillStyle = RED;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — NOSE DOWN, ADD POWER ⚠', w / 2, h * 0.62);
  }
}
