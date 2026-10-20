/**
 * The round bumpers : normal, clock, death, magnet and invisible ("ghost").
 *
 * They are drawn with vector sprites (gfx/sprites.ts). `hitAge` is the time
 * since the last hit: the "hit" pulse plays for HIT_TIME and a bumper cannot
 * be hit again (sound, effect) while it plays.
 */

import { Entity, Layer } from "../entity.js";
import { BOUNCE } from "../physics.js";
import { BallType, Item } from "../../data/enums.js";
import { dist2, perFrameChance, smooth, TAU } from "../../engine/math.js";
import { drawBumper, drawClockBumper, drawGear, drawMagnet, drawGhostBumper } from "../../gfx/sprites.js";
import { dropShadow } from "../../gfx/theme.js";
import { app } from "../../app.js";
import { Spark } from "./effects.js";

/** Duration of the hit pulse (12 frames of the original at 40 per second). */
const HIT_TIME = 0.3;

class RoundBumper extends Entity {
	declare itemType: any;
	declare shape: any;
	declare solid: boolean;
	declare bounce: any;
	declare hitAge: number;


	/**
	 * @param x, y        centre
	 * @param radius      collision radius
	 * @param bounce      see physics.js
	 */
	constructor(x, y, radius, bounce, itemType) {
		super(x, y, Layer.OBJECT);
		this.itemType = itemType;
		this.shape = { kind: "circle", x, y, r: radius };
		this.solid = true;
		this.bounce = bounce;
		this.hitAge = HIT_TIME;
	}

	/** 1 right after a hit, down to 0. */
	get hit() {
		return Math.max(0, 1 - this.hitAge / HIT_TIME);
	}

	/** Plays the hit animation, if it is not already playing (returns false then). */
	animateHit() {
		if (this.hitAge < HIT_TIME)
			return false;
		this.hitAge = 0;
		return true;
	}

	update(dt: number, _game?: any) {
		this.hitAge = Math.min(HIT_TIME, this.hitAge + dt);
	}

	renderShadow(ctx) {
		const r = this.shape.r;
		dropShadow(ctx, this.x + 3, this.y + r * 0.6, r * 1.3, r * 0.9);
	}

	render(ctx) {
		drawBumper(ctx, this.x, this.y, this.shape.r * 1.2, this.hit);
	}
}

/** The normal bumper : kicks the ball away. */
export class Bumper extends RoundBumper {

	constructor(x, y) {
		super(x, y, 20, BOUNCE.bumper, Item.BUMPER);
	}

	onHit() {
		if (this.animateHit())
			app.audio.play("metal");
	}
}

/**
 * The clock bumper : each hit costs time (or adds time to the chronometer
 * in Course mode). Its hands ("aig", "aig2") show the time.
 */
export class ClockBumper extends RoundBumper {
	declare shownTime: any;


	constructor(x, y, game) {
		super(x, y, 28, BOUNCE.clock, Item.CLOCK);
		this.shownTime = game.time;
	}

	onHit(game) {
		if (!this.animateHit())
			return;
		app.audio.play("wall");
		game.addTime(game.rules.clockBumper);
	}

	update(dt, game) {
		super.update(dt);
		this.shownTime = smooth(this.shownTime, game.time, 0.05, dt);
	}

	render(ctx) {
		// the hands show the time left: one turn of the minute hand per minute
		const t = this.shownTime;
		drawClockBumper(ctx, this.x, this.y, this.shape.r * 1.28, -(t / 3600) * TAU, -(t / 60) * TAU, this.hit);
	}
}

/** The death bumper : kills the ball, except the metal one. */
export class DeathBumper extends RoundBumper {
	declare spin: number;


	constructor(x, y) {
		super(x, y, 15, BOUNCE.death, Item.DEATH);
		this.spin = Math.random() * TAU;
	}

	update(dt) {
		super.update(dt);
		this.spin += dt * 1.6;
	}

	renderShadow() { }

	render(ctx) {
		drawGear(ctx, this.x, this.y, this.shape.r * 2.8, this.spin);
	}

	onHit(game) {
		const ball = game.ball;
		if (ball.type === BallType.METAL || ball.invulnerable > 0) {
			app.audio.play("metal");
			return;
		}
		app.audio.play("death");
		this.animateHit();
		ball.die();
	}
}

/**
 * The magnet : attracts the ball (not the metal one). When hit, it repels
 * the ball for a while (about 25 s on average), then attracts again.
 * Its symbol has an animation for each : "plus" and "neg".
 */
export class Magnet extends RoundBumper {
	declare attracting: boolean;


	constructor(x, y) {
		super(x, y, 20, BOUNCE.magnet, Item.MAGNET);
		this.attracting = true;
	}

	render(ctx) {
		drawMagnet(ctx, this.x, this.y, this.shape.r * 1.1, this.attracting, app.time, this.hit);
	}

	onHit() {
		if (this.attracting) {
			this.attracting = false;
			app.audio.play("metal");
		}
	}

	update(dt, game) {
		super.update(dt);

		const ball = game.ball;
		if (ball.type !== BallType.METAL && !ball.falling) {
			const d2 = dist2(this.x, this.y, ball.x, ball.y);
			if (d2 < 30000) {
				// (original : 30 / distance pixels per frame^2, toward / away from the magnet)
				const way = this.attracting ? 1 : -1;
				const f = way * 30 * 1600 * dt / d2;
				ball.vx += (this.x - ball.x) * f;
				ball.vy += (this.y - ball.y) * f;
			}
		}

		// back to attracting, at random
		if (!this.attracting && Math.random() < perFrameChance(1000, dt)) {
			this.attracting = true;
		}
	}
}

/**
 * The invisible bumper ("ghost") : it shows up for a moment when hit.
 * The violet ball sees it when close.
 */
export class GhostBumper extends RoundBumper {
	declare alpha: number;


	constructor(x, y) {
		super(x, y, 24, BOUNCE.ghost, Item.GHOST);
		this.alpha = 0;
	}

	onHit(game) {
		if (!this.animateHit())
			return;
		app.audio.play("metal");
		if (game.ball.type !== BallType.VIOLET)
			this.alpha = 1;
	}

	update(dt, game) {
		super.update(dt);
		const ball = game.ball;
		if (ball.type === BallType.VIOLET) {
			// (original : alpha = 200000 / distance^2 %)
			this.alpha = Math.min(1, 2000 / Math.max(1, dist2(this.x, this.y, ball.x, ball.y)));
		} else if (this.alpha > 0) {
			// (original : -4 % per frame)
			this.alpha = Math.max(0, this.alpha - dt * 1.6);
		}
	}

	renderShadow() { }

	render(ctx) {
		drawGhostBumper(ctx, this.x, this.y, this.shape.r, this.alpha, this.hit);
	}
}

/** Adds a spark where the ball hit. */
export function spark(game, contact) {
	game.room.add(new Spark(contact.x, contact.y));
}
