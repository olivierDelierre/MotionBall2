# MotionBall 2 — TypeScript rewrite

A rewrite of **MotionBall 2** (Motion Twin, Frutiparc, 2005) for modern browsers.

The rules, levels and sounds of the original Flash game, in a modern codebase
with a new look (the "Refonte graphique" design: a lavender backdrop, a violet
floor, and one vivid colour per function — green for the player, red for the
goals, cyan for time, magenta for danger):

- **TypeScript**, ES modules, bundled by **Vite**; tests with **Vitest**;
  ESLint and Prettier;
- everything on screen is **drawn with canvas paths** (`src/gfx/`): no sprites,
  no bitmaps, sharp at any resolution; the font (Outfit) is bundled;
- a fixed-step simulation (120 steps per second) with **render interpolation**:
  motion is drawn between the last two steps, so it is smooth at 60, 120 or
  240 Hz; every animation is a function of real time;
- geometric collisions (circles, boxes and rounded corners);
- entities that update and draw themselves, bosses written as state machines;
- keyboard, gamepad and touch (virtual joystick) controls;
- sound with separate music and effect volumes.

## Play and develop

```sh
npm install
npm run dev            # http://localhost:5173 with hot reload
npm run build          # type-checks, then builds dist/
npm run preview        # serves the built game
npm test               # Vitest (about 10 s)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run test:browser   # builds, then loads the game in Chromium (needs Playwright)
npm run levels         # regenerates src/data/levels.generated.ts from dungeon/*.txt
```

Controls: arrows / WASD / ZQSD (or a gamepad stick, or drag a finger on the
screen) to roll the ball, Space to change ball, Escape or P for the pause and
the map.

`motionball` is exposed in the browser console: `motionball.play("adventure", 4)`
starts a game, `motionball.scenes.current.game` is the game being played.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organised.

## Tests

`npm test` runs the game in Node, without a browser (the canvas, sound and input
are replaced by fakes, see `tests/helpers.ts`, and the random numbers are seeded):

| file | covers |
| --- | --- |
| `tests/game.test.ts` | the ball, every kind of item, doors and keys, room changes, holes, deaths, time, the rules of each mode, long random games |
| `tests/bosses.test.ts` | the three bosses: how each one is hurt, its attacks, its death; the four powers |
| `tests/scenes.test.ts` | menus, pause, end of game; every screen, room and boss fight is also drawn on a fake canvas |
| `tests/progress.test.ts` | unlocks, records, saving |
| `tests/achievements.test.ts` | what unlocks each achievement, the counters, the banner, their screen |
| `tests/engine.test.ts` | input, audio mixing, main loop, transitions, math |
| `tests/physics.test.ts` | the collision shapes and the bounce |
| `tests/data.test.ts` | the hand-made dungeons and the random generator |

`npm run test:browser` (`tests/browser/smoke.mjs`) opens the built game in
Chromium, goes through the title and the menu, starts every mode and every
boss, and fails on any error or missing file. It needs Playwright
(`npm install --no-save playwright && npx playwright install chromium`, or
`CHROMIUM_PATH` pointing to a Chromium), and skips itself otherwise.

## The original sources

- `dungeon/`: the hand-made dungeons (adventures, courses, tutorial) saved by
  the original level editor (`npm run levels` packs them into the game);
- `public/snd/`: the original sounds.

The rest of the original game is archived in
[WebGamesArchives, `Frutiparc/Games/motionBall2/`](https://github.com/olivierDelierre/WebGamesArchives/tree/main/Frutiparc/Games/motionBall2):
the ActionScript 2 code (`mb2/*.as`, e.g. `Ball.as`, `Menu.as`, `BossTB.as`,
named in the comments of the rewrite), the random dungeon generator
(`mb2gen/`, OCaml), the `.fla` files and the original images.

## Differences with the original

The rules, levels, tuning and sounds are the original ones. What differs:

- **A new look**: the original sprites and animations (converted from the
  XFL exports in the previous version of this rewrite) are gone, replaced by
  vector drawing in the new design. The HUD is a band above the room (main
  figure, time bar, orbs, room count and map).
- Collisions are geometric: the ball bounces on the real shapes of the bumpers
  and slides along the walls instead of sampling 16 points on a 4 x 4 grid.
- A fixed 120 steps per second simulation with render interpolation; the
  original's per-frame tuning (40 frames per second) is converted to pixels
  per second, and the boss timelines are kept as durations.
- 17 achievements, in place of the Frutiparc trophies.
- Separate volumes for the music and the sound effects (sliders in the
  options page of the menu, saved with the settings).
- Keyboard, gamepad and touch controls: the menu cards can be walked with the
  arrows, the pause has "Continuer" / "Abandonner" buttons, a finger drives the
  ball with a virtual joystick.
- The laser beams between the posts of the same colour are drawn.
- Losing the Frutiparc network: rankings, trophies and the "disc" and "white"
  variants are gone; the records are local (`localStorage`).
