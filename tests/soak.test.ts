/**
 * Long games: nothing may grow without bound (entities, effects, audio fades,
 * cached sprites), which would make the game slower the longer it is played.
 */

import { test } from "vitest";
import assert from "node:assert/strict";
import { setup, newGame, run, fakeContext, app, STEP } from "./helpers.js";
import { Mode } from "../src/data/enums.js";
import { halo, drawSphere, spriteCount, view } from "../src/gfx/theme.js";

test("long random games: the entities, the fades and the sprite cache stay bounded", () => {
	for (const [mode, param] of [[Mode.CHALLENGE, 0], [Mode.CLASSIC, 0], [Mode.COURSE, 0], [Mode.ADVENTURE, 4]] as [any, number][]) {
		setup(7);
		let g = newGame(mode, param);
		let games = 1;
		const ctx = fakeContext();
		let maxEntities = 0;
		let maxFades = 0;
		let t = 0;
		for (let i = 0; i < 120 * 240; i++) {
			// steer at random, keep the game going
			if (i % 90 === 0) {
				const a = Math.random() * Math.PI * 2;
				app.input.dir = { x: Math.cos(a), y: Math.sin(a) };
			}
			g.ball.invulnerable = 1;
			g.time = Math.max(g.time, 60);
			app.time += STEP;
			run(g, STEP);
			if (i % 4 === 0)
				g.render(ctx);
			t += STEP;
			maxEntities = Math.max(maxEntities, g.room.entities.length);
			maxFades = Math.max(maxFades, (app.audio as any).fades?.length ?? 0);
			// (a lost game: start another one, like a player would)
			if (g.state === "over") {
				g = newGame(mode, param);
				games++;
			}
		}
		assert.ok(maxEntities < 150, mode + " entities : " + maxEntities);
		assert.ok(maxFades < 20, mode + " fades : " + maxFades);
		assert.ok(spriteCount() <= 160, "sprite cache : " + spriteCount());
		assert.ok(t > 200, "the games ran " + t + " s (" + games + " games)");
	}
});

test("the sprite cache is bounded, whatever the sizes and resolutions asked", () => {
	setup();
	const ctx = fakeContext();
	for (let i = 0; i < 5000; i++) {
		view.scale = 1 + (i % 400) / 100;       // a phone whose browser bars keep moving
		halo(ctx, 10, 10, 5 + (i % 90), "rgba(" + (i % 50) + ",0,0,1)");
		drawSphere(ctx, 10, 10, 3 + (i % 40) / 2, ["#fff", "#" + (i % 900 + 100), "#000"]);
	}
	assert.ok(spriteCount() <= 160, "cache : " + spriteCount());
});
