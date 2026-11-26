// Kestrel Valley Run — shared tuning constants and mission definitions.
// One job: every number the flight model, terrain and missions agree on.
export const WORLD = {
  seed: 20261126,
  valleyHalfWidth: 70,
  mountainStart: 130,
  mountainHeight: 190,
  gridStep: 25,
  gridHalfX: 500,
  viewDistance: 950,
  runway: { x: 0, z0: 2500, z1: 2780, elevation: 18, halfWidth: 14 },
  startAltitude: 150,
};

export const PLANE = {
  maxSpeed: 82,
  minSpeed: 24,
  cruiseSpeed: 58,
  stallSpeed: 30,
  climbRate: 1.0,
  rollRate: 1.9,
  pitchRate: 1.1,
  turnRate: 0.55,
  fuelBurn: 0.55,
  wingSpan: 14,
};

export const MISSIONS = [
  {
    id: 'ring',
    key: '1',
    name: 'RING RUN',
    tagline: 'Thread 12 golden rings down Kestrel Valley',
    brief: 'Fly through every ring. Centre passes pay double. Mind your fuel.',
    ringCount: 12,
    fuel: 100,
  },
  {
    id: 'land',
    key: '2',
    name: 'DIRT STRIP LANDING',
    tagline: 'Put her down on Kestrel Strip, 2,600 m up the valley',
    brief: 'Flaps help (F). Flare before the threshold. Touch down slow and level.',
    ringCount: 0,
    fuel: 100,
  },
  {
    id: 'drop',
    key: '3',
    name: 'SUPPLY DROP',
    tagline: 'Drop food and medicine to three mountain huts',
    brief: 'Press SPACE over a smoking hut, 40–120 m up. Three drops, one tank.',
    ringCount: 0,
    fuel: 100,
  },
];

export const SCORE = {
  ringPass: 100,
  ringCentreBonus: 100,
  hutDrop: 150,
  landingBase: 500,
  landingSmoothBonus: 300,
  crashPenalty: 0,
};

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}
