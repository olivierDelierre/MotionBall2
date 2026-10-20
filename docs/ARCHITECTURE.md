# MotionBall 2 rewrite — architecture

This document explains how the rewrite is organised, the few ideas that hold it
together, and where to look to change something. It assumes you know the game
(roll a ball through a dungeon of rooms, collect the red pastilles to open the
doors, find the coloured balls, beat the boss).

## Principles

- **Modules with one job.** Each file is an ES module with a short header
  comment saying what it is for. Nothing is global, except the few shared
  services in `app.ts`.
- **The rules live in data.** Everything that differs between the game modes is
  a field of `game/modes.ts`; the game code asks `game.rules.xxx` instead of
  testing the mode.
- **Entities draw and update themselves.** A bumper, a pastille, a door or a
  boss is an object with `update(dt, game)` and `render(ctx, game)`. The room
  just keeps a list of them.
- **Real units.** Distances are pixels of the 610 x 410 room, durations are
  seconds, speeds are pixels per second. Values that come from the original
  game (which counted in pixels per frame at 40 frames per second) are
  converted, and the comment gives the original value.
- **Vector art, drawn from state.** Everything on screen is drawn with canvas
  paths (`gfx/sprites.ts`, `gfx/*_art.ts`) in the palette of `gfx/theme.ts`. A
  sprite is a function of the entity's state and of time (a `hitAge`, a
  `leave` amount, `app.time`): there are no timelines, so every animation is
  smooth at any frame rate. The original ActionScript (`mb2/*.as`, see the
  README) is a reference, it is not run.

## Layout

```
index.html            the page (Vite entry: loads src/main.ts)
package.json          scripts dev / build / test / lint / levels
vite.config.ts        Vite and Vitest
tsconfig.json         TypeScript (checked by `npm run typecheck`)
public/snd            the original sounds
dungeon/              the hand-made dungeons of the original level editor
tools/build_levels.js packs dungeon/*.txt into src/data/levels.generated.ts
tests/                Vitest tests (see "Tests" below) ; browser/smoke.mjs : Chromium smoke test

src/
  main.ts             entry point : creates the services, loads, starts the loop
  style.css           the page
  app.ts              the shared services (screen, input, audio, save, scenes, time, alpha)
  config.ts           sizes, physics tuning, ball specs
  sounds.ts           sound names -> files, music layers
  progress.ts         saved settings, unlocks and records
  achievements.ts     the achievements : the list, what unlocks them, the banner

  engine/             game-independent code
    loop.ts           fixed-step main loop, passes the interpolation factor to the draw
    screen.ts         canvas sizing, game coordinates
    input.ts          keyboard / gamepad / touch -> actions and a direction
    audio.ts          effects, cross-faded music, layered music (Web Audio or <audio>)
    storage.ts        localStorage with fallbacks
    scenes.ts         current screen + fade transitions
    math.ts           helpers (angles, frame-rate independent decay, random, easing)

  data/               the levels (enums, bit codec, dungeon model, random generators)

  game/               a game being played
    game.ts           the session : rooms, time, lives, room changes, end, drawing order
    modes.ts          the rules of each mode
    room.ts           builds a room from its data, holds its entities, draws the floor
    doors.ts          the floor outline and its four doors
    ball.ts           the player's ball
    physics.ts        collision shapes and the ball's bounces
    entity.ts         Entity / Effect base classes, drawing layers, interpolated position
    inventory.ts      balls, keys, map, radar
    hud.ts            the band above the room, the ball and key icons
    entities/         bumpers, blocks, pickups (and teleports), zappers, effects

  bosses/             octopus, snakes, powers, Tourneboule (state machines)

  gfx/                drawing
    theme.ts          palette, font, gradients, halos, shadows
    sprites.ts        everything in a room, and the ball
    octopus_art.ts, snake_art.ts, powers_art.ts, tourneboule_art.ts   the bosses
    draw.ts, ui.ts    text, cards, buttons, sliders, panels, the backdrop

  scenes/             title, menu, play (pause and end panels), map, achievements
```

The room is 610 x 410 pixels; the canvas is 610 x 462: a HUD band of 52 pixels
on top, and the room under it (`Game.render` translates by `HUD_HEIGHT`).

## The main loop

`engine/loop.ts` runs the simulation in fixed steps of 1/120 s and draws once
per displayed frame:

```
every animation frame:
    input.poll()                         gamepad buttons -> actions
    while enough time has passed:        (at most 16 steps, the rest is dropped)
        step(1/120)                      audio fades, scenes.update(dt), input.endStep()
    scenes.render(ctx)
```

Fixed steps make the game behave the same on every screen, and keep the
collisions stable (the ball moves at most a few pixels per step).

Input actions ("confirm", "pause", "switchBall"...) are *edge triggered*: a
key press is queued, seen by the next step, then cleared by `endStep()`. The
direction of the ball (`input.axis()`) is read continuously; it combines the
keys, the gamepad stick and the virtual joystick of touch screens.

## Scenes

A scene is an object with `enter()`, `exit()`, `update(dt)` and `render(ctx)`.
`app.scenes.goto(scene)` fades to black, swaps, and fades back.

```
TitleScene -> MenuScene -> PlayScene -> (end panel) -> MenuScene
```

`PlayScene` owns a `Game` and two overlays: the pause (with the map when the
map or the radar was found) and the end-of-game panel, which also saves the
records (`progress.ts`).

## A game

`Game` (`game/game.ts`) holds:

| field | |
| --- | --- |
| `rules` | the mode's rules (`modes.ts`) |
| `dungeon` | the level data, modified while playing (opened doors, destroyed blocks...) |
| `room` | the `Room` being played |
| `ball` | the player's `Ball` (it lives across rooms) |
| `boss` | the boss, once the ball is in the boss room |
| `time` | seconds left (or elapsed, in Course mode) |
| `inventory` | balls of each colour, keys, map, radar |
| `state` | `play`, `scroll` (changing room) or `over` |

Each step in `play`: time, ball switch, `room.update`, `ball.update`,
`boss.update`, then the boss room trigger and the exits.

**Changing room.** When the ball leaves the room (its centre crosses an edge)
and a room exists there, `goToRoom` builds the next room right away and the
game enters the `scroll` state: both rooms slide for 0.5 s, then the new room
becomes current and the ball's position is shifted by one room. The door the
ball comes in by is opened in the data first, so that it is open in the new
room.

**Losing a ball.** `ball.die()` (or falling in a hole) starts the ball's
shrinking animation; at its end `game.ballFell()` removes one ball of that
colour (unless the rules say otherwise), picks another colour if needed, or
ends the game. The ball comes back to where it entered the room.

**Classique.** Falling through the hatch calls `nextClassicLevel()`: the next
level is the next column of the dungeon, a random row, and the ball lands where
the hatch was (the scrolling goes down).

**Course.** Crossing a one-way door validates the lap; crossing a checkpoint
beam then counts it and resets the other rooms (doors closed, blocks and
pastilles back).

## Rooms

`Room` (`game/room.ts`) turns a room of the data into entities:

- level items (`{ type, x, y }` in 4 x 4 pixel cells, top-left corner) become
  entities centred on their symbol, sized like the original did it
  (`symbolCells`, from the symbol's bounds) ;
- green blocks and holes also go into a 14 x 9 grid of 40 x 40 tiles
  (`room.tiles`): holes are only tiles, blocks use it to merge their shapes ;
- ball rooms, bonus rooms and the boss room have a fixed layout ;
- the zappers of the same colour are linked by beams.

Drawing, back to front: the `background` symbol, holes (the `ground` symbol
clipped to the hole tiles, with a back wall on their top edge), block shadows,
then the entities sorted by layer (`entity.ts` `Layer`), their shadows first,
and finally the `border` and the `door` symbols on top.

## Drawing and smooth motion

**Sprites are functions.** `gfx/sprites.ts` draws each thing from its state and
a time: `drawBumper(ctx, x, y, r, hit)`, `drawOrb(ctx, x, y, kind, time, leave)`,
`drawGear(ctx, x, y, size, angle)`... An entity keeps the few numbers it
needs (`hitAge` since its last hit, `leave` while it is taken, `lift` of a
block) and advances them with `dt`; idle motion (the gear turning, the pulse of
a time orb) reads `app.time`. Nothing is quantised to a frame rate.

**Interpolation.** The simulation runs at 120 steps per second, the screen at
whatever it likes. `Loop` computes how far the frame is between the last two
steps (`alpha`, 0..1) and stores it in `app.alpha`. Moving entities remember
their previous position (`Entity.snapshot()`, called by the room before each
update) and draw at `drawX` / `drawY`, which blend the two. A jump of more than
40 pixels (a teleport, a respawn) is not blended. The room scroll does the
same with its progress. UI motion (cards growing, the title) uses real time
and a frame-rate independent decay (`1 - exp(-dt * k)`).

**Staying fast on a phone.** Gradients and shadows are the costly part of a
canvas frame, so: halos and spheres are painted once into small bitmaps and
copied (`gfx/theme.ts`, a bounded cache emptied when the resolution changes);
shadows are stacked translucent shapes (`softShadow`), never `shadowBlur`; the
floor is painted once and copied. The canvas never exceeds 1.6 million pixels
and 1.5x the device ratio, resize events are handled once per frame, and if
frames keep taking over 24 ms `Screen.lowerQuality()` draws at a lower
resolution (the browser scales it up). `tests/soak.test.ts` plays long games
and checks that nothing grows without bound.

**The bosses.** Their poses come from their state machines; where the original
timeline called back into the code (Tourneboule's `kataDone` / `animDone`) the
durations are kept in a table (`KATA_TIMES`).

## Physics

The ball is a circle; everything solid has a shape (`game/physics.ts`):
`circle` (bumpers, posts), `box` (blocks, border, door openings) or `arc` (the
rounded inside corners of the room).

`Ball.move` advances in sub-steps of at most 4 pixels. After each one,
`collideBall` pushes the ball out of every shape it overlaps and, if it was
moving toward it, reflects its velocity on the contact normal. The new speed is
`max(speed x coef, min)` — `BOUNCE` gives these per obstacle, from the original
game: bumpers throw the ball harder than it came. Then the obstacle's
`onHit(game, contact)` gives its effect (sound, spark, death, time...).

Things the ball only *touches* are tested by distance in their own `update`:
pastilles, balls, the hatch, teleports, laser beams.

**Holes** (`Ball.testHole`): on a hole tile the ball speeds up and is pulled
away from the edges that touch the floor; once it is far enough from those
edges it falls. The blue ball jumps instead.

**Ball specs** (`config.ts` `BALLS`): acceleration, inertia (the speed is
multiplied by it every 1/40 s: `decay(inertia, dt)`), maximum speed. The metal
ball is slow and heavy, the orange one fast, etc.

## Doors

Each side of the border is made of two fixed boxes around the opening and a
`Door` (`game/doors.ts`) filling it. A door is solid unless it is `open`,
`opening` or `hidden`. States: `wall` (no door), `hidden`, `closed` (opens when
the red pastilles are taken, or with a key), `locked` (a one-way door seen from
the wrong side), `opening`, `open`, `closing`. Opening a door writes `Exit.OPEN`
into the dungeon data, so it stays open.

## Bosses

A boss is an entity of the `BOSS` layer, created by `bosses/index.ts` when the
ball is fully inside the boss room (the doors close). The game calls its
`update(dt, game)` and adds its colliders if it has some; it calls
`game.bossBeaten()` when its death animation is over. While a boss dies,
`game.invincible` prevents losing.

Each boss is a **state machine**: `this.state = { name, time, ...fields }`,
and one `update...` method per state. For example the octopus:

```
sleep -> jumps <-> (big jump | suck -> spit | shout | throw eye) -> ... -> dying
```

The elemental powers (`powers.ts`) are entities added to the room; the boss
keeps a list of them to limit how many are active. Some effects tuned "per
frame" in the original (the earth vine, the water trail) run at 40 Hz through a
small `FrameClock`, whatever the simulation rate.

## Level data

- **Hand-made dungeons** (tutorial, 5 adventures, 7 courses) are the
  `dungeon/*.txt` files of the original level editor, packed into
  `levels.generated.js` by `npm run levels`. Each line is a room: `NONE`,
  `DATA=<bits>` (an editor room), `START=<bits>`, `ITEM=<name>`, `END`.
  `data/dungeon.ts` decodes them.
- **Random dungeons** (Challenge, Classique) are generated with the rules of
  the original OCaml tool. A failed generation step throws `Retry` and is done
  again (see `generator/util.ts`). Two loops of the original could never end;
  they are bounded here (see the comments in `rooms.ts` and `index.ts`).

## Audio

`engine/audio.ts` plays effects (`app.audio.play("red")`), a music with
cross-fades (`playMusic`), and the **layered** in-game music: 5 loops of the
same length play together and in sync, only one is audible; each new ball
colour found cross-fades to a richer one (`setLayer`). Music and effects have
separate volumes (the options). The names of the sounds are in `sounds.ts`.

## Saving

`progress.ts` keeps, in `localStorage` (key `motionball2.rewrite`): the settings,
the adventures won (the 5th opens after the 4 others), the unlocked courses
and their 3 best times (starting with 3 "CPU" times), the best Challenge score
and Classique level.

## Tests

The game logic doesn't need the browser : it only draws through the canvas
context it is given, and reaches the sound, the input and the images through
`app`. The tests (`npm test`) replace those with fakes (`tests/helpers.ts`):

- `setup(seed)` installs a fake input (the test sets `app.input.dir` and
  triggers actions), a fake audio recording the sounds, no images, a fake
  `document` / canvas context, and seeds `Math.random` ;
- `newGame(mode)` starts a game, `run(game, seconds)` / `runUntil(game, cond)`
  advance it by simulation steps ;
- `testRoom(game, items, exits)` puts the ball in a room made for the test
  (items placed by their centre with `item()` / `tileItem()`).

The drawing code is run on the fake context too (`scenes.test.js`), so an error
in it fails the tests even though nothing is drawn. `tests/browser/smoke.mjs`
checks the real page in Chromium.

## Common tasks

| to... | look at |
| --- | --- |
| tune the ball | `config.ts` (`BALLS`, `PHYSICS`) |
| change a mode's rules (time, lives...) | `game/modes.ts` |
| change a bumper's bounce | `game/physics.ts` `BOUNCE` |
| add an item type | `data/enums.ts`, `Room.addItem` + `ITEM_SYMBOLS` in `game/room.ts`, a class in `game/entities/` |
| change what a boss does | its state methods in `bosses/` |
| change a sound | `sounds.ts` |
| add a screen | a scene in `scenes/`, then `app.scenes.goto(new MyScene())` |
| edit a hand-made dungeon | `dungeon/*.txt`, then `npm run levels` and `npm run build` |

After a change in `src/`, run `npm test` and `npm run typecheck`. A new behaviour deserves a test in `tests/game.test.js` : most are a
few lines with `testRoom`.
