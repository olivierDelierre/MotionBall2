/**
 * The border of the room and its four doors.
 *
 * Collisions : each side of the border is made of two boxes (the "jambs")
 * around the door opening, and a third box filling the opening (the "leaf"),
 * solid unless the door lets the ball through. The inner corners of the
 * border are rounded : an "arc" shape keeps the ball inside them.
 *
 * Door states :
 *   wall      no door : plain border
 *   hidden    looks like the border, but the ball goes through
 *   closed    a closed door (opens when the red pastilles are taken, or with a key)
 *   locked    a one-way door seen from the wrong side : never opens
 *   opening / open / closing
 */

import { WIDTH as W, HEIGHT as H, BORDER as B, DOOR_SIZE as D } from "../config.js";
import { BOUNCE } from "./physics.js";
import { COLOR, FONT, roundedRect } from "../gfx/theme.js";
import { app } from "../app.js";
import { Spark } from "./entities/effects.js";

// the opening animation of the door symbol : 12 frames at 40 per second
const OPEN_TIME = 12 / 40;
const CORNER = 22;
const OUT = 200;   // the border boxes extend outside of the room

/** The opening of each door, in room coordinates. */
const GAPS = [
	{ x: -OUT, y: H / 2 - D / 2, w: B + OUT, h: D },
	{ x: W - B, y: H / 2 - D / 2, w: B + OUT, h: D },
	{ x: W / 2 - D / 2, y: -OUT, w: D, h: B + OUT },
	{ x: W / 2 - D / 2, y: H - B, w: D, h: B + OUT }
];

/** The two jambs of each side. */
const JAMBS = [
	[{ x: -OUT, y: -OUT, w: B + OUT, h: H / 2 - D / 2 + OUT }, { x: -OUT, y: H / 2 + D / 2, w: B + OUT, h: H / 2 - D / 2 + OUT }],
	[{ x: W - B, y: -OUT, w: B + OUT, h: H / 2 - D / 2 + OUT }, { x: W - B, y: H / 2 + D / 2, w: B + OUT, h: H / 2 - D / 2 + OUT }],
	[{ x: -OUT, y: -OUT, w: W / 2 - D / 2 + OUT, h: B + OUT }, { x: W / 2 + D / 2, y: -OUT, w: W / 2 - D / 2 + OUT, h: B + OUT }],
	[{ x: -OUT, y: H - B, w: W / 2 - D / 2 + OUT, h: B + OUT }, { x: W / 2 + D / 2, y: H - B, w: W / 2 - D / 2 + OUT, h: B + OUT }]
];

/** The rounded inner corners : the ball must stay inside these arcs. */
const CORNERS = [
	{ kind: "arc", x: B + CORNER, y: B + CORNER, r: CORNER, sx: -1, sy: -1 },
	{ kind: "arc", x: W - B - CORNER, y: B + CORNER, r: CORNER, sx: 1, sy: -1 },
	{ kind: "arc", x: B + CORNER, y: H - B - CORNER, r: CORNER, sx: -1, sy: 1 },
	{ kind: "arc", x: W - B - CORNER, y: H - B - CORNER, r: CORNER, sx: 1, sy: 1 }
];

/** Where each door is drawn : middle of its side, and rotation (the room is toward +y). */
const DOOR_FRAMES = [
	{ x: B / 2, y: H / 2, angle: -Math.PI / 2 },
	{ x: W - B / 2, y: H / 2, angle: Math.PI / 2 },
	{ x: W / 2, y: B / 2, angle: 0 },
	{ x: W / 2, y: H - B / 2, angle: Math.PI }
];

/** Colliders of the parts of the border that never change. */
export function borderColliders() {
	const list = [];
	for (const jambs of JAMBS)
		for (const shape of jambs)
			list.push({ shape, solid: true, bounce: BOUNCE.border, onHit: wallHit });
	for (const shape of CORNERS)
		list.push({ shape, solid: true, bounce: BOUNCE.border, onHit: wallHit });
	return list;
}

function wallHit(game, contact) {
	app.audio.play("wall");
	game.room.add(new Spark(contact.x, contact.y));
}

export class Door {
	declare dir: any;
	declare state: any;
	declare progress: any;
	declare shape: any;
	declare bounce: any;
	declare closeWhenInside: boolean;
	

	constructor(dir, state) {
		this.dir = dir;
		this.state = state;
		this.progress = state === "open" ? 1 : 0;   // 0 closed .. 1 open
		// collider of the opening
		this.shape = GAPS[dir];
		this.bounce = BOUNCE.border;
		// one-way door : closes once the ball is inside
		this.closeWhenInside = false;
	}

	/** Can the ball go through ? */
	get solid() {
		return !(this.state === "open" || this.state === "hidden" || this.state === "opening");
	}

	/** Can the red pastilles or a key open it ? */
	get openable() {
		return this.state === "closed";
	}

	open(sound = true) {
		if (this.state !== "closed")
			return;
		this.state = "opening";
		if (sound)
			app.audio.play("doors");
	}

	close() {
		if (this.state === "open" || this.state === "opening")
			this.state = "closing";
	}

	/** A closed door : a key opens it. */
	onHit(game, contact) {
		if (this.state === "closed" && game.inventory.keys > 0) {
			game.inventory.keys--;
			app.audio.play("key");
			game.room.openDoor(this.dir, game);
			return;
		}
		wallHit(game, contact);
	}

	update(dt, game) {
		if (this.state === "opening") {
			this.progress = Math.min(1, this.progress + dt / OPEN_TIME);
			if (this.progress >= 1)
				this.state = "open";
		} else if (this.state === "closing") {
			this.progress = Math.max(0, this.progress - dt / OPEN_TIME);
			if (this.progress <= 0)
				this.state = "locked";
		}

		// a one-way door closes behind the ball
		if (this.closeWhenInside && game.ballInside()) {
			this.closeWhenInside = false;
			this.close();
			game.oneWayCrossed();
		}
	}

	/**
	 * Drawn in the frame of its side (+y toward the room, the floor edge at
	 * y = B / 2): a magenta barrier with a counter of the orbs taken while it
	 * is closed, a green glow and an arrow once it is open.
	 */
	render(ctx, room) {
		if (this.state === "wall" || this.state === "hidden")
			return;
		const f = DOOR_FRAMES[this.dir];
		const p = this.progress;
		ctx.save();
		ctx.translate(f.x, f.y);
		ctx.rotate(f.angle);
		const y = B / 2;

		if (p > 0) {
			// the way through: a soft green light and an arrow pointing outwards
			const g = ctx.createRadialGradient(0, y, 0, 0, y, D * 0.55);
			g.addColorStop(0, "rgba(95,203,43,0.4)");
			g.addColorStop(1, "rgba(95,203,43,0)");
			ctx.globalAlpha = p;
			ctx.fillStyle = g;
			ctx.fillRect(-D * 0.6, y - 40, D * 1.2, 80);
			ctx.strokeStyle = COLOR.green;
			ctx.lineWidth = 3.5;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(-8, y - 3);
			ctx.lineTo(0, y - 13);
			ctx.lineTo(8, y - 3);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		if (p < 1) {
			const w = D * (1 - p);
			const locked = this.state === "locked";
			const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
			if (locked) {
				g.addColorStop(0, "#8F82C9");
				g.addColorStop(1, "#6B4BDB");
			} else {
				g.addColorStop(0, COLOR.magenta);
				g.addColorStop(1, COLOR.amber);
			}
			ctx.save();
			ctx.shadowColor = locked ? "rgba(107,75,219,0.5)" : "rgba(255,46,126,0.7)";
			ctx.shadowBlur = 14;
			ctx.fillStyle = g;
			roundedRect(ctx, -w / 2, y - 4.5, w, 9, 4.5);
			ctx.fill();
			ctx.restore();
			if (this.state === "closed" && room && room.redsTotal > 0 && room.redsLeft > 0)
				orbCounter(ctx, y + 22, -f.angle, room.redsTotal - room.redsLeft, room.redsTotal);
		}
		ctx.restore();
	}
}

/** The pill showing a padlock and how many orbs are taken: "2/6". */
function orbCounter(ctx: CanvasRenderingContext2D, y: number, upright: number, taken: number, total: number): void {
	const w = 58, h = 24;
	ctx.save();
	ctx.translate(0, y);
	ctx.rotate(upright);   // (the door's frame is turned: keep the text upright)
	ctx.shadowColor = "rgba(60,40,140,0.25)";
	ctx.shadowBlur = 8;
	roundedRect(ctx, -w / 2, -h / 2, w, h, h / 2);
	ctx.fillStyle = "rgba(255,255,255,0.95)";
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.strokeStyle = "rgba(180,83,9,0.45)";
	ctx.lineWidth = 1;
	ctx.stroke();
	// the padlock
	ctx.fillStyle = COLOR.amberInk;
	roundedRect(ctx, -w / 2 + 11, -2, 10, 8, 2);
	ctx.fill();
	ctx.strokeStyle = COLOR.amberInk;
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	ctx.arc(-w / 2 + 16, -2, 3, Math.PI, 0);
	ctx.stroke();
	ctx.font = `700 13px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = COLOR.amberInk;
	ctx.fillText(taken + "/" + total, -w / 2 + 26, 1);
	ctx.restore();
}

/**
 * The outline of the floor: a green rounded line, interrupted where a door
 * is open. (The floor itself is drawn by the room.)
 */
export function drawBorder(ctx, doors = []) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(-50, -50, W + 100, H + 100);
	for (const door of doors) {
		if (door.progress <= 0)
			continue;
		const f = DOOR_FRAMES[door.dir];
		const w = D * door.progress;
		// (a rectangle across the outline, in the frame of the door)
		const c = Math.cos(f.angle), s = Math.sin(f.angle);
		const pt = (lx, ly) => [f.x + lx * c - ly * s, f.y + lx * s + ly * c];
		const [a, b, d, e] = [pt(-w / 2, B / 2 - 6), pt(w / 2, B / 2 - 6), pt(w / 2, B / 2 + 6), pt(-w / 2, B / 2 + 6)];
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0], b[1]);
		ctx.lineTo(d[0], d[1]);
		ctx.lineTo(e[0], e[1]);
		ctx.closePath();
	}
	ctx.clip("evenodd");
	roundedRect(ctx, B, B, W - 2 * B, H - 2 * B, CORNER);
	ctx.strokeStyle = COLOR.green;
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.restore();
}
