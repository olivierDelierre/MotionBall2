/**
 * What the bosses share : the base class, the red flash of a hit, and the
 * floor tiles falling into new holes.
 *
 * A boss is an entity of the BOSS layer created by bosses/index.js when the
 * ball enters the boss room. The game calls update(dt, game) every step
 * (render with the room), and onPause(paused). A boss calls
 * game.bossBeaten() when it is dead.
 */

import { WIDTH as W, HEIGHT as H, TILE, TILE_ORIGIN, BORDER } from "../config.js";
import { Entity, Layer, Effect } from "../game/entity.js";
import { roundedRect } from "../gfx/theme.js";

export class Boss extends Entity {

	constructor(x, y) {
		super(x, y, Layer.BOSS);
	}

	onPause() { }
}

// ----- new holes -----

/** A floor tile falling into a new hole: it shrinks and fades. */
export class FallingTile extends Effect {
	declare left: number;
	declare top: number;

	constructor(tx, ty) {
		super(TILE_ORIGIN + tx * TILE, TILE_ORIGIN + ty * TILE, 0.6, Layer.ITEM);
		this.left = this.x;
		this.top = this.y;
	}

	render(ctx) {
		const t = this.t;
		const s = 1 - t * 0.6;
		ctx.save();
		ctx.globalAlpha *= 1 - t;
		ctx.translate(this.left + TILE / 2, this.top + TILE / 2 + t * 18);
		ctx.scale(s, s);
		roundedRect(ctx, -TILE / 2, -TILE / 2, TILE, TILE, 6);
		ctx.fillStyle = "#AD99E6";
		ctx.fill();
		ctx.restore();
	}
}

/**
 * The floor cracking: when it is over, the tile falls and becomes a hole
 * (`onDone`).
 */
export class CrackingTile extends Effect {
	declare tx: any;
	declare ty: any;
	declare onDone: any;
	declare left: number;
	declare top: number;

	constructor(tx, ty, onDone) {
		super(TILE_ORIGIN + tx * TILE, TILE_ORIGIN + ty * TILE, 1.2, Layer.FLOOR);
		this.left = this.x;
		this.top = this.y;
		this.tx = tx;
		this.ty = ty;
		this.onDone = onDone;
	}

	update(dt, game) {
		super.update(dt);
		if (this.dead)
			this.onDone(game, this.tx, this.ty);
	}

	render(ctx) {
		const shake = Math.sin(this.age * 90) * this.t * 1.5;
		ctx.save();
		ctx.translate(this.left + shake, this.top);
		ctx.strokeStyle = `rgba(75,47,181,${0.3 + this.t * 0.6})`;
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(4, 6); ctx.lineTo(18, 16); ctx.lineTo(14, 26); ctx.lineTo(30, 36);
		ctx.moveTo(36, 4); ctx.lineTo(24, 14); ctx.lineTo(18, 16);
		ctx.stroke();
		ctx.restore();
	}
}

/** Makes a hole at tile (tx, ty), with a falling tile. */
export function breakFloor(game, tx, ty) {
	game.room.addHole(tx, ty);
	game.room.add(new FallingTile(tx, ty));
}

/** Where a boss can move (the room minus a margin). */
export const ARENA = { minX: BORDER * 2, maxX: W - BORDER * 2, minY: BORDER, maxY: H - BORDER };
