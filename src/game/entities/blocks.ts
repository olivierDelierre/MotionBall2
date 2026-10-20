/**
 * The square obstacles : green blocks, and the pink / blue blocks with their
 * switch.
 */

import { Entity, Layer } from "../entity.js";
import { BOUNCE } from "../physics.js";
import { BallType, Item } from "../../data/enums.js";
import { TILE } from "../../config.js";
import { drawBlock, drawLoweredBlock, drawSwitch, PINK_BLOCK, BLUE_BLOCK } from "../../gfx/sprites.js";
import { dropShadow } from "../../gfx/theme.js";
import { app } from "../../app.js";
import { Spark, Debris } from "./effects.js";

/**
 * A green block : a 40 x 40 tile, destroyed by the green ball.
 * Neighbouring blocks merge into one shape (see `neighbours`).
 */
export class GreenBlock extends Entity {
	declare itemType: any;
	declare data: any;
	declare left: any;
	declare top: any;
	declare shape: any;
	declare solid: boolean;
	declare bounce: any;
	declare neighbours: number;
	declare dead: boolean;
	

	/** x, y = top-left corner, `data` = the item of the level data (to remember it is gone). */
	constructor(x, y, data) {
		super(x + TILE / 2, y + TILE / 2, Layer.BLOCK);
		this.itemType = Item.BLOCK;
		this.data = data;
		this.left = x;
		this.top = y;
		this.shape = { kind: "box", x, y, w: TILE, h: TILE };
		this.solid = true;
		this.bounce = BOUNCE.block;
		// which neighbours are green blocks too : 1 left, 2 up, 4 right, 8 down
		this.neighbours = 0;
	}

	onHit(game, contact) {
		if (game.ball.type !== BallType.GREEN || this.dead) {
			app.audio.play("wall");
			game.room.add(new Spark(contact.x, contact.y));
			return;
		}

		app.audio.play("wall");
		this.dead = true;
		this.solid = false;
		this.data.destroyed = true;
		game.room.removeTile(this);
		game.achieve("block");

		// 4 pieces fly away in the direction of the ball
		const ball = game.ball;
		const angle = Math.atan2(ball.vy, ball.vx);
		const speed = contact.speed;
		for (let i = 0; i < 4; i++) {
			const s = ((Math.random() * speed / 2 + speed / 2) / 4 + 40);
			const a = angle + Math.random() - 0.5;
			game.room.add(new Debris(this.left + Math.random() * TILE, this.top + Math.random() * TILE, Math.cos(a) * s, Math.sin(a) * s));
		}
	}

	/** Neighbouring blocks leave their shared sides open, so that they merge. */
	render(ctx) {
		drawBlock(ctx, this.left, this.top, this.neighbours);
	}
}

/**
 * A pink or blue block. The switch of the room raises one colour and lowers
 * the other : pink blocks are up (solid) while the switch is on, blue blocks
 * while it is off. The state of the switches is kept for the whole game.
 */
export class SwitchBlock extends Entity {
	declare itemType: any;
	declare pink: any;
	declare left: any;
	declare top: any;
	declare shape: any;
	declare bounce: any;
	declare solid: any;
	declare lift: number;
	declare layer: any;


	/** x, y = the top-left corner of the collision box ; artX, artY = where the symbol is drawn */
	constructor(x, y, pink, artX = x + TILE / 2, artY = y + TILE / 2) {
		super(artX, artY, Layer.FLOOR);
		this.itemType = pink ? Item.PINK_BLOCK : Item.BLUE_BLOCK;
		this.pink = pink;
		this.left = x;
		this.top = y;
		this.shape = { kind: "box", x, y, w: TILE, h: TILE };
		this.bounce = BOUNCE.block;
		this.solid = null;
		// 1 = up, 0 = lowered into the floor (animated)
		this.lift = 1;
	}

	isUp(game) {
		return this.pink === game.switchOn;
	}

	update(dt, game) {
		const up = this.isUp(game);
		if (this.solid === null)
			this.lift = up ? 1 : 0;
		else
			this.lift = Math.max(0, Math.min(1, this.lift + (up ? 1 : -1) * dt / 0.25));
		this.solid = up;
		this.layer = up ? Layer.BLOCK : Layer.FLOOR;
	}

	onHit(game, contact) {
		app.audio.play("wall");
		game.room.add(new Spark(contact.x, contact.y));
	}

	render(ctx) {
		const palette = this.pink ? PINK_BLOCK : BLUE_BLOCK;
		if (this.lift <= 0) {
			drawLoweredBlock(ctx, this.left, this.top, palette);
			return;
		}
		// rising: the block grows out of the floor
		ctx.save();
		const s = 0.85 + 0.15 * this.lift;
		ctx.translate(this.left + TILE / 2, this.top + TILE / 2);
		ctx.scale(s, s);
		ctx.translate(-this.left - TILE / 2, -this.top - TILE / 2);
		ctx.globalAlpha *= 0.4 + 0.6 * this.lift;
		drawBlock(ctx, this.left, this.top, 0, palette);
		ctx.restore();
	}
}

/** The switch : toggles the pink and blue blocks. */
export class Switch extends Entity {
	declare itemType: any;
	declare shape: any;
	declare solid: boolean;
	declare bounce: any;
	declare cooldown: number;
	declare on: any;
	declare press: number;


	constructor(x, y) {
		super(x, y, Layer.OBJECT);
		this.itemType = Item.SWITCH;
		this.shape = { kind: "circle", x, y, r: 15 };
		this.solid = true;
		this.bounce = BOUNCE.block;
		this.cooldown = 0;
		this.on = null;
		this.press = 0;
	}

	onHit(game, contact) {
		// the ball touches it during several steps : one toggle per touch
		if (this.cooldown > 0)
			return;
		this.cooldown = 0.5;
		app.audio.play("metal");
		game.room.add(new Spark(contact.x, contact.y));
		game.switchOn = !game.switchOn;
		this.press = 1;
	}

	update(dt, game) {
		this.cooldown = Math.max(0, this.cooldown - dt);
		this.on = game.switchOn;
		// pressed down for a moment after a toggle
		this.press = Math.max(0, this.press - dt / 0.25);
	}

	renderShadow(ctx) {
		dropShadow(ctx, this.x + 2, this.y + 6, 22, 14);
	}

	render(ctx) {
		drawSwitch(ctx, this.x, this.y, !!this.on, this.press);
	}
}
