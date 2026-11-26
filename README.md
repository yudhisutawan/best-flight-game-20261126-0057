# Kestrel Valley Run

[![competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/yudhisutawan/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/yudhisutawan/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-pilot flight game for the make.fun **best flight game** bounty
(`best-flight-game-20261126-0057`). Fly the Kestrel STOL single down a
named valley — green river valley, pine forest, snow-capped peaks — in
three sorties, one tank of fuel each:

1. **Ring Run** — thread 12 golden rings down the valley. Dead-centre
   passes pay double.
2. **Dirt Strip Landing** — put her down on Kestrel Strip, a graded dirt
   runway 2,600 m up the valley. Flaps, wind gusts, flare, touchdown
   judged on smoothness.
3. **Supply Drop** — drop food and medicine to three smoking mountain
   huts (SPACE over the smoke, 40–120 m up).

## Flying it

- **↑ / ↓** pitch, **← / →** bank and turn (mouse steers too)
- **W / S** throttle up / down, **F** flaps, **SPACE** drop supplies
- **P** pause, **T** title screen, **1 / 2 / 3** pick a mission, **Enter** fly

Watch the stall horn: below 30 kt the Kestrel sinks. Fuel, damage, wind,
altitude (FT), airspeed (KT) and heading all live on the HUD — altimeter
and airspeed tapes, compass strip, artificial horizon, fuel and damage
bars.

## How it is built

Pure static files under `game/` — no build step, no library, no network
request, no assets. A small pseudo-3D engine projects a seeded procedural
heightfield (valley, river, runway, trees, huts, clouds) onto a 2D canvas,
and the aircraft is a polygon model that banks, pitches and yaws with the
flight model. Sounds are synthesized with WebAudio.

| File | Job |
|---|---|
| `game/src/config.js` | tuning constants + mission definitions |
| `game/src/random.js` | seeded RNG + value noise |
| `game/src/terrain.js` | heightfield, river, runway, props |
| `game/src/plane.js` | flight model (throttle, stall, fuel, damage) |
| `game/src/rings.js` | ring course + drop windows |
| `game/src/missions.js` | objectives, scoring, win/lose |
| `game/src/render3d.js` | chase-view 3D renderer |
| `game/src/hud.js` | lit instruments (tapes, compass, horizon) |
| `game/src/input.js` | keyboard + mouse |
| `game/src/audio.js` | procedural WebAudio sounds |
| `game/src/shots.js` | deterministic screenshot scenes |
| `game/src/main.js` | loop + title/play/pause/over screens |

Screenshots are real renders of the game's own code, staged by
`game/src/shots.js` (`?shot=ring|landing|drop|title`) and captured in
headless Chromium.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Hand in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
