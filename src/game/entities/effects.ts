/**
 * Short visual effects: they live for a duration and remove themselves.
 */

import { Effect, Layer } from "../entity.js";
import { drawSpark, drawDebris, drawBeamFlash } from "../../gfx/sprites.js";
import { BALL_PALETTE } from "../../gfx/theme.js";

/** The little burst where the ball hits a wall. */
export class Spark extends Effect {

	constructor(x, y) {
		super(x, y, 0.3);
	}

	render(ctx) {
		drawSpark(ctx, this.x, this.y, this.t);
	}
}

/** A piece of a destroyed green block, flying and shrinking. */
export class Debris extends Effect {
	declare vx: number;
	declare vy: number;
	declare rotation: number;

	constructor(x, y, vx, vy) {
		super(x, y, 0.75);
		this.vx = vx;
		this.vy = vy;
		this.rotation = Math.random() * Math.PI * 2;
	}

	update(dt) {
		super.update(dt);
		this.x += this.vx * dt;
		this.y += this.vy * dt;
		this.rotation += 200 * Math.PI / 180 * dt;
	}

	render(ctx) {
		drawDebris(ctx, this.x, this.y, this.rotation, 1 - this.t);
	}
}

/** The flash of a laser beam that killed the ball. */
export class BeamFlash extends Effect {
	declare bx: number;
	declare by: number;
	declare phase: number;

	constructor(x1, y1, x2, y2, phase) {
		super(x1, y1, 0.4, Layer.EFFECT);
		this.bx = x2;
		this.by = y2;
		this.phase = phase;
	}

	render(ctx) {
		drawBeamFlash(ctx, this.x, this.y, this.bx, this.by, BALL_PALETTE[this.phase][0], this.t);
	}
}

/** A ring of smoke that opens and fades (the final boss vanishing / appearing). */
export class Puff extends Effect {

	constructor(x, y, layer = Layer.BOSS) {
		super(x, y, 0.3, layer);
	}

	render(ctx) {
		const t = this.t;
		ctx.save();
		ctx.globalAlpha *= 1 - t;
		ctx.strokeStyle = "#D5C2FF";
		ctx.lineWidth = 8 * (1 - t) + 1;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 12 + t * 40, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
}
