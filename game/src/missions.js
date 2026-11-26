// Mission logic. One job: objectives, scoring and win/lose for the three
// sorties, kept separate from the flight model and the renderer.
import { SCORE, missionById } from './config.js';
import { createPlane, stepPlane } from './plane.js';
import { buildRings, checkRing, hutInDropWindow } from './rings.js';
import { buildProps } from './terrain.js';

export function createMission(missionId) {
  const def = missionById(missionId);
  const props = buildProps();
  const state = {
    def,
    plane: createPlane(),
    rings: buildRings(def.ringCount),
    huts: props.huts.map((h) => ({ ...h, dropped: false })),
    props,
    score: 0,
    status: 'flying', // flying | won | crashed | outOfFuel
    message: '',
    messageUntil: 0,
    ringsPassed: 0,
    dropsDone: 0,
    landingQuality: 0,
    elapsed: 0,
  };
  if (def.id === 'land') {
    state.plane.y = 190;
    state.plane.speed = 62;
  }
  if (def.id === 'drop') {
    state.plane.y = 120;
  }
  return state;
}

export function nextRing(state) {
  return state.rings.find((r) => !r.passed) || null;
}

export function objectiveText(state) {
  if (state.def.id === 'ring') return `RINGS ${state.ringsPassed}/${state.rings.length}`;
  if (state.def.id === 'land') return 'LAND ON KESTREL STRIP — RWY 26';
  return `DROPS ${state.dropsDone}/3 HUTS`;
}

function flash(state, text, seconds) {
  state.message = text;
  state.messageUntil = state.elapsed + seconds;
}

/** Advance one step; `input` comes from input.js, `dropPressed` is edge-triggered. */
export function stepMission(state, input, dropPressed, dt) {
  if (state.status !== 'flying') return state;
  state.elapsed += dt;
  const event = stepPlane(state.plane, input, dt);
  const p = state.plane;

  if (state.def.id === 'ring') {
    const ring = nextRing(state);
    if (ring) {
      const hit = checkRing(p, ring);
      if (hit) {
        state.ringsPassed += 1;
        const pts = SCORE.ringPass + (hit.centre ? SCORE.ringCentreBonus : 0);
        state.score += pts;
        flash(state, hit.centre ? `DEAD CENTRE! +${pts}` : `RING ${state.ringsPassed}! +${pts}`, 1.6);
      }
    }
    if (state.ringsPassed === state.rings.length) {
      state.status = 'won';
      state.score += 250;
      flash(state, 'VALLEY CLEARED! +250', 4);
    }
  }

  if (state.def.id === 'land') {
    if (event === 'landed' && p.speed < 8) {
      state.status = 'won';
      const smooth = Math.max(0, 1 - Math.abs(p.verticalSpeed) / 3.2);
      state.landingQuality = smooth;
      state.score += SCORE.landingBase + Math.round(SCORE.landingSmoothBonus * smooth);
      flash(state, 'TOUCHDOWN! WELCOME TO KESTREL STRIP', 4);
    } else if (event === 'landed') {
      flash(state, 'ROLLING OUT… EASE OFF THE THROTTLE', 1.2);
    }
  }

  if (state.def.id === 'drop') {
    if (dropPressed) {
      const hut = state.huts.find((h) => !h.dropped && hutInDropWindow(p, h));
      if (hut) {
        hut.dropped = true;
        state.dropsDone += 1;
        state.score += SCORE.hutDrop;
        flash(state, `SUPPLIES AWAY — ${hut.name} +${SCORE.hutDrop}`, 2);
        if (state.dropsDone === 3) {
          state.status = 'won';
          state.score += 200;
          flash(state, 'ALL HUTS SUPPLIED! +200', 4);
        }
      } else {
        flash(state, 'NO HUT BELOW — FLY OVER THE SMOKE', 1.4);
      }
    }
  }

  if (event === 'crash') {
    state.status = 'crashed';
    flash(state, 'CRASHED — THE VALLEY CLAIMS ANOTHER KESTREL', 4);
  } else if (event === 'stall') {
    flash(state, 'STALL! NOSE DOWN, ADD POWER', 0.8);
  } else if (p.fuel <= 0 && state.status === 'flying') {
    state.status = 'outOfFuel';
    flash(state, 'FUEL EMPTY — GLIDING TO WHATEVER IS BELOW', 4);
  }
  return state;
}
