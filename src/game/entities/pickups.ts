/**
 * What the ball collects : pastilles, balls, item boxes, and the Classique
 * hatch. Also the teleports. Drawn with vector sprites (gfx/sprites.ts).
 *
 * Pastilles and balls are collected by distance (the ball rolls over them),
 * item boxes by collision.
 */

import { Entity, Layer } from "../entity.js";
import { BOUNCE } from "../physics.js";
import { Item } from "../../data/enums.js";
import { dist2 } from "../../engine/math.js";
import { drawOrb, drawBallBox, drawItemBox, drawHatch, drawTeleportBase, drawTeleportRing } from "../../gfx/sprites.js";
import { app } from "../../app.js";

/** Distance (squared) under which the ball takes a pastille (original : 300). */
const TAKE_DIST2 = 300;

/** How long a taken pickup takes to burst and vanish. */
const LEAVE_TIME = 0.25;
const HATCH_OPEN_TIME = 0.6;

/**
 * A red pastille (take them all to open the doors) or a time pastille.
 */
export class Pastille extends Entity {
	declare itemType: any;
	declare red: any;
	declare data: any;
	declare taken: boolean;
	declare leave: number;
	declare dead: boolean;


	/** @param data  the item of the level data (to remember it was taken) */
	constructor(x, y, red, data) {
		super(x, y, Layer.ITEM);
		this.itemType = red ? Item.RED : Item.BLUE;
		this.red = red;
		this.data = data;
		this.taken = false;
		this.leave = 0;
	}

	update(dt, game) {
		if (this.taken) {
			this.leave += dt / LEAVE_TIME;
			if (this.leave >= 1)
				this.dead = true;
		}
		const ball = game.ball;
		if (this.taken || ball.falling || dist2(this.x, this.y, ball.x, ball.y) >= TAKE_DIST2)
			return;
		this.taken = true;
		this.data.taken = true;
		if (this.red) {
			app.audio.play("red");
			game.room.redTaken(game);
			game.achieve("pastille");
		} else {
			app.audio.play("blue");
			game.addTime(game.rules.bluePastille);
		}
	}

	render(ctx) {
		drawOrb(ctx, this.x, this.y, this.red ? "red" : "blue", app.time, Math.min(1, this.leave));
	}
}

/**
 * The hatch of the Classique rooms : it opens when the red pastilles are
 * taken, then the ball can fall through it to the next level.
 */
export class Hatch extends Entity {
	declare itemType: any;
	declare open: any;
	declare opening: boolean;
	declare progress: number;


	constructor(x, y) {
		super(x, y, Layer.ITEM);
		this.itemType = Item.HATCH;
		this.open = 0;          // 1 once open
		this.opening = false;
		this.progress = 0;      // the lid slides away in OPEN_TIME
	}

	update(dt, game) {
		if (this.opening)
			this.progress = Math.min(1, this.progress + dt / HATCH_OPEN_TIME);
		if (this.progress >= 1)
			this.open = 1;

		const ball = game.ball;
		if (this.open < 1 || ball.falling || dist2(this.x, this.y, ball.x, ball.y) >= TAKE_DIST2)
			return;
		const { x, y } = this;
		ball.startFall("hatch", 3, ctx => ctx.arc(x, y, 16, 0, Math.PI * 2));
	}

	render(ctx) {
		drawHatch(ctx, this.x, this.y, this.progress, app.time);
	}
}

/** A ball to collect, in the middle of a room. */
export class BallPickup extends Entity {
	declare ballType: any;
	declare taken: boolean;
	declare leave: number;
	declare dead: boolean;


	constructor(x, y, ballType) {
		super(x, y, Layer.ITEM);
		this.ballType = ballType;
		this.taken = false;
		this.leave = 0;
	}

	update(dt, game) {
		if (this.taken) {
			this.leave += dt / LEAVE_TIME;
			if (this.leave >= 1)
				this.dead = true;
			return;
		}
		const ball = game.ball;
		if (!ball.falling && dist2(this.x, this.y, ball.x, ball.y) < 24 * 24) {
			this.taken = true;
			app.audio.play("found");
			game.collectBall(this.ballType);
		}
	}

	render(ctx) {
		drawBallBox(ctx, this.x, this.y, this.ballType, app.time, Math.min(1, this.leave));
	}
}

/**
 * An item box (a card with the icon of the item) : it bursts when
 * the ball hits it, and gives its item.
 */
export class ItemBox extends Entity {
	declare icon: any;
	declare give: any;
	declare shape: any;
	declare solid: boolean;
	declare bounce: any;
	declare burst: number;
	declare dead: boolean;


	/**
	 * @param icon    the item : 0 map, 1 radar, 2 small time, 3 big time, 4 key
	 * @param give    (game) => void : gives the item
	 */
	constructor(x, y, icon, give) {
		super(x, y, Layer.OBJECT);
		this.icon = icon;
		this.give = give;
		this.shape = { kind: "circle", x, y, r: 22 };
		this.solid = true;
		this.bounce = BOUNCE.itemBox;
		this.burst = 0;
	}

	onHit(game) {
		if (!this.solid)
			return;
		this.solid = false;
		this.burst = 0.001;
		app.audio.play("found");
		this.give(game);
	}

	update(dt) {
		if (this.burst > 0) {
			this.burst += dt / LEAVE_TIME;
			if (this.burst >= 1)
				this.dead = true;
		}
	}

	render(ctx) {
		drawItemBox(ctx, this.x, this.y, this.icon, app.time, Math.min(1, this.burst));
	}
}

/**
 * A teleport : the ball rolling on it is sent to the other teleport of the
 * room. Both ends then wait for the ball to leave them, so that it doesn't
 * bounce back and forth.
 */
export class Teleport extends Entity {
	declare itemType: any;
	declare busy: boolean;
	declare circles: any;


	constructor(x, y) {
		super(x, y, Layer.FLOOR);
		this.itemType = Item.TELEPORT;
		this.busy = false;
		this.circles = [];
		for (let i = 0; i < 5; i++) {
			this.circles.push({
				offset: Math.random() * 6,
				tilt: Math.random() * Math.PI * 2,
				angle: 0,
				speed: 3 + Math.floor(Math.random() * 3),
				phase: Math.random() * Math.PI * 2
			});
		}
	}

	update(dt, game) {
		const ball = game.ball;
		const d = Math.sqrt(dist2(this.x, this.y, ball.x, ball.y)) + 0.1;

		// the circles turn faster when the ball is close
		for (const c of this.circles) {
			c.angle += c.speed * (1 + 60 / d) * dt * 40 * Math.PI / 180;
			c.phase += (20 + 200 / d) * dt * 40 / 100;
		}

		if (d >= ball.radius) {
			this.busy = false;
			return;
		}
		if (this.busy || ball.falling)
			return;
		const other = game.room.entities.find(e => e instanceof Teleport && e !== this);
		if (!other)
			return;
		this.busy = true;
		other.busy = true;
		ball.x = other.x;
		ball.y = other.y;
	}

	/** A base, and 5 rings turning and stretching around it (faster when the ball is close). */
	render(ctx) {
		drawTeleportBase(ctx, this.x, this.y, app.time);
		this.circles.forEach((c, i) => {
			ctx.save();
			ctx.translate(this.x, this.y);
			ctx.rotate(c.angle);
			ctx.scale(1 + Math.cos(c.phase) * 0.5, 1 + Math.sin(c.phase) * 0.5);
			ctx.rotate(c.tilt);
			ctx.translate(0, c.offset);
			drawTeleportRing(ctx, i);
			ctx.restore();
		});
	}
}
