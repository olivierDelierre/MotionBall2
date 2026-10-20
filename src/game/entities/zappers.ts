/**
 * Zappers : laser posts. The posts of the same colour ("phase") are linked by
 * laser beams that only the ball of that colour can cross ; any other ball
 * dies. The phase of a post comes from its position in the room.
 *
 * In Course mode the posts are checkpoints : crossing their beam counts a
 * lap (see Game.checkpoint).
 */

import { Entity, Layer } from "../entity.js";
import { BOUNCE } from "../physics.js";
import { Item, BALL_TYPE_COUNT } from "../../data/enums.js";
import { BALL_PALETTE, dropShadow } from "../../gfx/theme.js";
import { drawZapper, drawBeam } from "../../gfx/sprites.js";
import { app } from "../../app.js";
import { Spark, BeamFlash } from "./effects.js";

export class Zapper extends Entity {
	declare itemType: any;
	declare shape: any;
	declare solid: boolean;
	declare bounce: any;
	declare checkpoint: any;
	declare phase: any;


	/**
	 * @param cellX, cellY  the position in the level data (gives the phase)
	 * @param cells         the size of the symbol in cells
	 */
	constructor(x, y, cellX, cellY, cells, checkpoint) {
		super(x, y, Layer.OBJECT);
		this.itemType = Item.ZAPPER;
		this.shape = { kind: "circle", x, y, r: 14 };
		this.solid = true;
		this.bounce = BOUNCE.zapper;
		this.checkpoint = checkpoint;
		// the colour depends on the position (original : ((x - w/2) + (y - h/2)) % 7)
		const p = (cellX - cells.w / 2) + (cellY - cells.h / 2);
		this.phase = checkpoint ? 0 : ((p % BALL_TYPE_COUNT) + BALL_TYPE_COUNT) % BALL_TYPE_COUNT;
	}

	onHit(game, contact) {
		app.audio.play("metal");
		game.room.add(new Spark(contact.x, contact.y));
	}

	renderShadow(ctx) {
		dropShadow(ctx, this.x + 3, this.y + 9, 20, 12);
	}

	/** A post in the colour of its beams ; white in Course mode (a checkpoint). */
	render(ctx) {
		drawZapper(ctx, this.x, this.y, this.phase, this.checkpoint, app.time);
	}
}

/** A laser beam between two posts of the same phase. */
export class Beam extends Entity {
	declare a: any;
	declare b: any;
	declare phase: any;
	declare checkpoint: any;


	constructor(a, b) {
		super(a.x, a.y, Layer.FLOOR);
		this.a = a;
		this.b = b;
		this.phase = a.phase;
		this.checkpoint = a.checkpoint;
	}

	/** The ball touches the beam. */
	touch(game) {
		if (this.checkpoint) {
			game.checkpoint();
			return;
		}
		if (game.ball.type === this.phase)
			return;
		if (game.ball.die()) {
			app.audio.play("laser");
			game.room.add(new BeamFlash(this.a.x, this.a.y, this.b.x, this.b.y, this.phase));
		}
	}

	render(ctx) {
		drawBeam(ctx, this.a.x, this.a.y, this.b.x, this.b.y, this.checkpoint ? "#FFFFFF" : BALL_PALETTE[this.phase][0], app.time);
	}
}

/** Links every pair of posts of the same phase. */
export function makeBeams(zappers) {
	const beams = [];
	for (let i = 0; i < zappers.length; i++)
		for (let j = i + 1; j < zappers.length; j++)
			if (zappers[i].phase === zappers[j].phase)
				beams.push(new Beam(zappers[i], zappers[j]));
	return beams;
}
