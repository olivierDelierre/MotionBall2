/**
 * The player's ball : controls, movement, holes, the blue ball's jump, and
 * the "falling" animation (in a hole, through the hatch, or killed).
 *
 * Movement : the wanted direction accelerates the ball, and its speed is
 * multiplied by `inertia` every original frame (1/40 s). Each ball colour has
 * its own acceleration and inertia (config.js BALLS). Above the maximum
 * speed (after a bumper kicked it) the ball brakes hard.
 *
 * The ball moves in sub-steps of at most 4 pixels, and collides with the
 * room after each sub-step (physics.js).
 */

import { BALLS, BALL_RADIUS, PHYSICS, WATER, INVULNERABLE_TIME, TILE, TILE_ORIGIN, CELL, ORIGINAL_FPS } from "../config.js";
import { BallType, Item } from "../data/enums.js";
import { Entity, Layer } from "./entity.js";
import { collideBall } from "./physics.js";
import { decay } from "../engine/math.js";
import { drawBallSprite, drawBallShadow } from "../gfx/sprites.js";
import { app } from "../app.js";

const MAX_SUBSTEP = 4;

/** How many past positions the speed trail remembers, and how often one is taken. */
const TRAIL_LENGTH = 3;
const TRAIL_INTERVAL = 1 / 40;

export class Ball extends Entity {
	declare radius: any;
	declare type: any;
	declare vx: number;
	declare vy: number;
	declare spawnX: number;
	declare spawnY: number;
	declare controlled: any;
	declare speedLimit: any;
	declare water: any;
	declare invulnerable: any;
	declare fall: any;
	declare jump: any;
	declare justLanded: boolean;
	declare height: any;
	declare hidden: boolean;
	declare trail: { x: number; y: number }[];
	declare trailClock: number;
	declare x: any;
	declare y: any;


	constructor() {
		super(0, 0, Layer.BALL);
		this.radius = BALL_RADIUS;
		this.type = BallType.YELLOW;
		this.vx = 0;
		this.vy = 0;

		// where the ball comes back after losing a life
		this.spawnX = 0;
		this.spawnY = 0;

		this.controlled = true;       // false while a boss holds it
		this.speedLimit = true;       // false while a boss throws it
		this.water = false;           // slippery floor (water snake)
		this.invulnerable = 0;        // seconds left

		// falling : null, or { kind: "hole" | "hatch" | "death", scale, speed, clip }
		this.fall = null;

		// the blue ball's jump over the holes
		this.jump = null;             // null, or { size, way }
		this.justLanded = false;
		this.height = 0;              // jump height, in pixels

		this.hidden = false;
		this.trail = [];
		this.trailClock = 0;
		this.setType(BallType.YELLOW);
	}

	get speed() {
		return Math.hypot(this.vx, this.vy);
	}

	get specs() {
		return BALLS[this.type];
	}

	/** Changes the colour. */
	setType(type) {
		this.type = type;
	}

	placeAt(x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
	}

	/** Remembers the current position as the place to come back to after a death. */
	setSpawn() {
		this.spawnX = this.x;
		this.spawnY = this.y;
	}

	get falling() {
		return this.fall !== null;
	}

	// ----- every step -----

	update(dt, game) {
		if (this.invulnerable > 0)
			this.invulnerable = Math.max(0, this.invulnerable - dt);

		this.updateJump(dt);

		if (this.fall) {
			this.updateFall(dt, game);
			return;
		}

		this.steer(dt, game);
		this.move(dt, game);
		this.updateTrail(dt);
	}

	/** Controls and speed. */
	steer(dt, game) {
		const specs = this.specs;
		let accel = specs.accel;
		let inertia = specs.inertia;
		if (this.water) {
			accel *= WATER.accelFactor;
			inertia = WATER.inertia;
		}

		// friction
		const k = decay(inertia, dt);
		this.vx *= k;
		this.vy *= k;
		// (the original threshold is per 1/40 s frame : smaller for shorter steps,
		// or weak forces such as a distant magnet could never move the ball)
		const rest = PHYSICS.restSpeed * dt * ORIGINAL_FPS;
		if (Math.abs(this.vx) < rest)
			this.vx = 0;
		if (Math.abs(this.vy) < rest)
			this.vy = 0;

		// the player (not while a boss holds the ball, nor in the air)
		if (this.controlled && !this.jump) {
			const axis = app.input.axis();
			this.vx += axis.x * accel * dt;
			this.vy += axis.y * accel * dt;
		}

		// above the maximum speed : brake hard
		const max = specs.maxSpeed;
		let speed = this.speed;
		if (this.speedLimit && speed > max) {
			let f = decay(PHYSICS.overSpeedDamping, dt);
			if (speed > 3 * max)
				f /= 3;
			this.vx *= f;
			this.vy *= f;
		}

		if (this.type === BallType.RED)
			this.attractReds(dt, game);
	}

	/** Moves in sub-steps, testing the holes and the collisions. */
	move(dt, game) {
		const dx = this.vx * dt;
		const dy = this.vy * dt;
		const steps = 1 + Math.floor(Math.hypot(dx, dy) / MAX_SUBSTEP);
		const colliders = game.colliders();

		for (let i = 0; i < steps; i++) {
			this.x += dx / steps;
			this.y += dy / steps;
			collideBall(this, colliders, game);
			game.room.touchBeams(this, game);
			if (this.testHole(dt / steps, game))
				return;
		}
	}

	/** The red ball attracts the red pastilles within 200 pixels. */
	attractReds(dt, game) {
		for (const e of game.room.entities) {
			if (e.itemType !== Item.RED || e.taken)
				continue;
			const dx = this.x - e.x;
			const dy = this.y - e.y;
			const d2 = dx * dx + dy * dy;
			if (d2 < 200 * 200 && d2 > 1) {
				// (original : 150 / distance pixels per frame)
				const pull = 150 * 40 * dt / d2;
				e.x += dx * pull;
				e.y += dy * pull;
			}
		}
	}

	/** Remembers where the ball was a moment ago (the speed trail). */
	updateTrail(dt) {
		this.trailClock += dt;
		if (this.trailClock < TRAIL_INTERVAL)
			return;
		this.trailClock = 0;
		if (this.speed < 60) {
			this.trail.pop();
			return;
		}
		this.trail.unshift({ x: this.x, y: this.y });
		if (this.trail.length > TRAIL_LENGTH)
			this.trail.pop();
	}

	// ----- holes -----

	/**
	 * Holes are 40 x 40 tiles of the room. On a hole, the ball is pulled toward
	 * the middle of the hole, away from the edges touching the floor. Once it
	 * is far enough from those edges, it falls. The blue ball jumps instead.
	 * Returns true when the ball starts falling.
	 */
	testHole(dt, game) {
		const tiles = game.room.tiles;
		// (the original tests the holes at its ball's position, which it draws
		// half a cell further right and down : 2 pixels up-left of our centre)
		const x = this.x - CELL / 2;
		const y = this.y - CELL / 2;
		const tx = Math.floor((x - TILE_ORIGIN) / TILE);
		const ty = Math.floor((y - TILE_ORIGIN) / TILE);
		const isHole = (x, y) => tiles.get(x, y) === Item.HOLE;

		if (!isHole(tx, ty) || this.jump) {
			this.justLanded = false;
			return false;
		}

		const cx = TILE_ORIGIN + (tx + 0.5) * TILE;
		const cy = TILE_ORIGIN + (ty + 0.5) * TILE;
		const half = TILE / 2;
		const R = this.radius;

		// the ball speeds up on a hole
		const boost = decay(PHYSICS.holeBoost, dt);
		this.vx *= boost;
		this.vy *= boost;

		// the edges of this tile that touch the floor, on the ball's side
		let left = x < cx && !isHole(tx - 1, ty);
		let right = x > cx && !isHole(tx + 1, ty);
		let up = y < cy && !isHole(tx, ty - 1);
		let down = y > cy && !isHole(tx, ty + 1);
		if (left && right && up && down)
			left = right = up = down = false;

		const pull = PHYSICS.holePull * dt;
		if (left) this.vx += pull;
		if (right) this.vx -= pull;
		if (up) this.vy += pull;
		if (down) this.vy -= pull;

		const inside =
			x > cx - half + (left ? R : 0) &&
			x < cx + half - (right ? R : 0) &&
			y > cy - half + (up ? R : 0) &&
			y < cy + half - (down ? R : 0);

		if (inside) {
			this.startFall("hole", 1, game.room.holeClip());
			return true;
		}
		if (this.type === BallType.BLUE && !this.justLanded) {
			this.jump = { size: 0, way: 1 };
			// (original : the take-off gets the whole push of a frame on a hole,
			// the speed x 1.1 and the pull of 1 px / frame, not a slice of it)
			const k = PHYSICS.holeBoost / boost;
			this.vx *= k;
			this.vy *= k;
			const extra = PHYSICS.holePull / ORIGINAL_FPS - pull;
			if (left) this.vx += extra;
			if (right) this.vx -= extra;
			if (up) this.vy += extra;
			if (down) this.vy -= extra;
		}
		return false;
	}

	/** The blue ball's jump : it goes up and down in 0.225 s, higher when fast. */
	updateJump(dt) {
		const j = this.jump;
		if (!j) {
			this.height = 0;
			return;
		}
		// (original : + 60 per frame, back down once over 200 ; it ends below 0.
		// Frame by frame, it goes 60 ... 240, then 180 ... -60 : 9 frames in
		// the air. Continuous, the same turns are at 240 and -60.)
		j.size += j.way * 60 * ORIGINAL_FPS * dt;
		if (j.size >= 240)
			j.way = -1;
		if (j.size <= -60) {
			this.jump = null;
			this.height = 0;
			this.justLanded = true;
			return;
		}
		this.height = Math.sqrt(Math.max(0, j.size * this.speed / ORIGINAL_FPS)) / 6;
	}

	// ----- falling and dying -----

	/**
	 * Starts falling : the ball shrinks, clipped by `clip` (a function adding
	 * the visible area to a path), then game.ballFell(kind) is called.
	 */
	startFall(kind, speed, clip) {
		this.fall = { kind, scale: 1, speed, clip };
		this.jump = null;
		this.height = 0;
		this.invulnerable = 0;
	}

	/** Killed (death bumper, laser, boss...). Ignored while invulnerable. */
	die() {
		if (this.invulnerable > 0 || this.fall)
			return false;
		this.vx = 0;
		this.vy = 0;
		this.startFall("death", 5, null);
		return true;
	}

	updateFall(dt, game) {
		const f = this.fall;
		const k = decay(0.9, dt);
		this.vx *= k;
		this.vy *= k;
		this.x += this.vx * dt / 5;
		this.y += this.vy * dt / 5;
		f.scale *= decay(Math.pow(0.92, f.speed), dt);
		if (f.scale >= 0.03)
			return;
		this.fall = null;
		game.ballFell(f.kind);
	}

	/** Back to the entrance of the room, blinking. */
	respawn() {
		this.placeAt(this.spawnX, this.spawnY);
		this.fall = null;
		this.jump = null;
		this.height = 0;
		this.invulnerable = INVULNERABLE_TIME;
	}

	// ----- drawing -----

	renderShadow(ctx) {
		if (this.hidden || this.fall)
			return;
		drawBallShadow(ctx, this.drawX, this.drawY - this.height * 0.3, 1 - this.height * 0.01);
	}

	render(ctx) {
		if (this.hidden)
			return;
		// blinking while invulnerable
		if (this.invulnerable > 0)
			ctx.globalAlpha = Math.floor(this.invulnerable * 20) % 2 === 0 ? 0.35 : 0.7;

		ctx.save();
		if (this.fall && this.fall.clip) {
			ctx.beginPath();
			this.fall.clip(ctx);
			ctx.clip();
		}
		// (original : x / y scale 100 % + 3 % per pixel of jump)
		const scale = (this.fall ? this.fall.scale : 1) * (1 + this.height * 0.03);
		drawBallSprite(ctx, this.drawX, this.drawY - this.height, this.type, scale, this.fall ? [] : this.trail);
		ctx.restore();
		ctx.globalAlpha = 1;
	}
}
