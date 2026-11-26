// Kestrel Valley Run — game loop, screens and wiring. One job: own the
// canvas, the mission lifecycle and the title / play / pause / over screens.
import { MISSIONS } from './config.js';
import { createMission, stepMission } from './missions.js';
import { renderWorld } from './render3d.js';
import { drawHud } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const input = createInput();
const audio = createAudio();
let screen = 'title';
let selected = 0;
let mission = createMission(MISSIONS[selected].id);
let overTimer = 0;
let lastRings = 0;
let lastDrops = 0;
let lastStatus = 'flying';
let stallBeepAt = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function drawTitle() {
  const w = canvas.width;
  const h = canvas.height;
  renderWorld(ctx, w, h, mission);
  const g = ctx.createLinearGradient(0, h * 0.35, 0, h);
  g.addColorStop(0, 'rgba(6,14,22,0)');
  g.addColorStop(1, 'rgba(6,14,22,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.35, w, h * 0.65);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc21c';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('M A K E F U N   •   A   B U S H   P I L O T   S T O R Y', w / 2, h * 0.42);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('KESTREL VALLEY RUN', w / 2, h * 0.42 + 72);
  ctx.fillStyle = '#bfe3d2';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Three sorties. One valley. One tank of fuel each.', w / 2, h * 0.42 + 104);

  const y0 = h * 0.42 + 150;
  MISSIONS.forEach((m, i) => {
    const y = y0 + i * 62;
    const active = i === selected;
    ctx.fillStyle = active ? 'rgba(255,194,28,0.16)' : 'rgba(8,18,28,0.55)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 330, y - 24, 660, 50, 8);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = '#ffc21c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = active ? '#ffc21c' : '#f5f2e8';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`${m.key} — ${m.name}`, w / 2 - 310, y + 2);
    ctx.fillStyle = '#bfe3d2';
    ctx.font = '13px monospace';
    ctx.fillText(m.tagline, w / 2 - 310, y + 20);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '14px monospace';
  ctx.fillText('ENTER fly   •   ↑↓ pitch   ←→ bank   •   W/S throttle   •   F flaps   •   SPACE drop   •   mouse steers too', w / 2, y0 + 3 * 62 + 16);
  ctx.fillStyle = 'rgba(245,242,232,0.65)';
  ctx.font = '12px monospace';
  ctx.fillText('Fly the rings, land the strip, feed the huts — mind the fuel gauge and the stall horn.', w / 2, y0 + 3 * 62 + 38);
  setStatus('Kestrel Valley Run. Choose a mission with keys 1, 2 or 3, then press Enter.');
}

function drawOver() {
  const w = canvas.width;
  const h = canvas.height;
  const won = mission.status === 'won';
  ctx.fillStyle = 'rgba(6,14,22,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7dffd4' : '#ff5a4e';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(
    won ? 'SORTIE COMPLETE' : mission.status === 'crashed' ? 'CRASHED' : 'OUT OF FUEL',
    w / 2,
    h / 2 - 60,
  );
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '18px monospace';
  ctx.fillText(mission.def.name, w / 2, h / 2 - 24);
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#ffc21c';
  ctx.fillText(`FINAL SCORE  ${mission.score}`, w / 2, h / 2 + 18);
  ctx.fillStyle = '#bfe3d2';
  ctx.font = '14px monospace';
  const detail =
    mission.def.id === 'ring'
      ? `Rings ${mission.ringsPassed}/${mission.rings.length}   •   Time ${Math.round(mission.elapsed)}s`
      : mission.def.id === 'land'
        ? `Landing quality ${Math.round(mission.landingQuality * 100)}%`
        : `Huts supplied ${mission.dropsDone}/3`;
  ctx.fillText(detail, w / 2, h / 2 + 48);
  ctx.fillStyle = '#f5f2e8';
  ctx.fillText('ENTER — fly again      •      T — title screen', w / 2, h / 2 + 92);
}

function drawPaused() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = 'rgba(6,14,22,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f2e8';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.font = '15px monospace';
  ctx.fillText('P — resume      •      T — title screen', w / 2, h / 2 + 24);
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const edges = input.consumeEdges();
  const keys = input.poll();

  if (screen === 'title') {
    if (edges.menuKey === '1' || edges.menuKey === '2' || edges.menuKey === '3') {
      selected = Number(edges.menuKey) - 1;
      mission = createMission(MISSIONS[selected].id);
    }
    if (edges.menuKey === 'Enter') {
      audio.unlock();
      screen = 'play';
      mission = createMission(MISSIONS[selected].id);
      lastRings = 0;
      lastDrops = 0;
      lastStatus = 'flying';
      overTimer = 0;
    }
    drawTitle();
  } else if (screen === 'play') {
    if (edges.pausePressed) {
      screen = 'paused';
    } else {
      stepMission(mission, keys, edges.dropPressed, dt);
      audio.engine(mission.plane.throttle, mission.plane.speed);
      if (mission.ringsPassed > lastRings) {
        audio.ring(mission.rings[mission.ringsPassed - 1]?.centre);
        lastRings = mission.ringsPassed;
      }
      if (mission.dropsDone > lastDrops) {
        audio.drop();
        lastDrops = mission.dropsDone;
      }
      if (mission.plane.stalled && now - stallBeepAt > 450) {
        audio.stallBeep();
        stallBeepAt = now;
      }
      if (mission.status !== 'flying' && lastStatus === 'flying') {
        if (mission.status === 'crashed') audio.crash();
        if (mission.status === 'won') audio.thud();
        overTimer = now;
      }
      lastStatus = mission.status;
      renderWorld(ctx, canvas.width, canvas.height, mission);
      drawHud(ctx, canvas.width, canvas.height, mission);
      if (mission.status !== 'flying' && now - overTimer > 1600) screen = 'over';
      setStatus(
        `${mission.def.name}: score ${mission.score}. Altitude ${Math.round(mission.plane.y * 3.28)} feet, speed ${Math.round(mission.plane.speed * 1.94)} knots.`,
      );
    }
  } else if (screen === 'paused') {
    renderWorld(ctx, canvas.width, canvas.height, mission);
    drawHud(ctx, canvas.width, canvas.height, mission);
    drawPaused();
    if (edges.pausePressed) screen = 'play';
    if (edges.menuKey === 'Enter') screen = 'title';
  } else if (screen === 'over') {
    renderWorld(ctx, canvas.width, canvas.height, mission);
    drawHud(ctx, canvas.width, canvas.height, mission);
    drawOver();
    if (edges.menuKey === 'Enter') {
      screen = 'play';
      mission = createMission(MISSIONS[selected].id);
      lastRings = 0;
      lastDrops = 0;
      lastStatus = 'flying';
      overTimer = 0;
    }
  }
  // 't' returns to the title from anywhere (handled via keydown state).
  if (window.__kestrelTitleKey) {
    window.__kestrelTitleKey = false;
    screen = 'title';
    mission = createMission(MISSIONS[selected].id);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 't' || e.key === 'T') window.__kestrelTitleKey = true;
});

if (shotName) {
  // Screenshot mode: stage one deterministic frame and paint it once.
  const staged = stageShot(shotName, mission);
  screen = staged.screen;
  mission = staged.mission;
  renderWorld(ctx, canvas.width, canvas.height, mission);
  if (screen === 'play') drawHud(ctx, canvas.width, canvas.height, mission);
  else drawTitle();
  setStatus(`Kestrel Valley Run — ${shotName} scene.`);
} else {
  requestAnimationFrame(frame);
}
