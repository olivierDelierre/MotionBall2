/**
 * The in-game display, a band above the room (see the "Gameplay" design):
 *   - on the left, the main figure of the mode (the explored part of the
 *     dungeon, the level in Classique, the laps in Course);
 *   - the time, as a clock and a bar (a chronometer in Course);
 *   - the red orbs taken in this room;
 *   - the room count and a small map of the visited rooms.
 * Over the room, at the bottom right: one icon per ball owned (the current
 * one lit) and the keys.
 *
 * Numbers ease toward their value so that changes read smoothly at any
 * frame rate.
 */

import { WIDTH as W, HEIGHT as H, HUD_HEIGHT, BORDER } from "../config.js";
import { BALL_TYPE_COUNT } from "../data/enums.js";
import { COLOR, FONT, BALL_PALETTE, roundedRect, circlePath, sphere, halo } from "../gfx/theme.js";
import { app } from "../app.js";
import { smooth } from "../engine/math.js";
import { formatTime } from "../engine/math.js";

const MAP_CELL = 7;
const MAP_GAP = 1;

export class Hud {
	declare game: any;
	declare shownTime: number;
	declare lapFlash: number;
	declare cacheAt: number;
	declare cached: number;
	declare visitedCount: number;

	constructor(game) {
		this.game = game;
		this.shownTime = game.time;
		this.lapFlash = 0;
		this.cacheAt = -1;
		this.cached = 0;
		this.visitedCount = 0;
	}

	/** (the game tells the HUD about time changes: it does not need to react) */
	timeChanged(_seconds?: number) { }

	/** Course: a lap is done, the figure flashes. */
	lapDone() {
		this.lapFlash = 1;
	}

	update(dt: number) {
		this.shownTime = smooth(this.shownTime, this.game.time, 0.02, dt);
		this.lapFlash = Math.max(0, this.lapFlash - dt * 1.5);
	}

	/** Draws the band; the context is in view coordinates (the room starts at HUD_HEIGHT). */
	renderBand(ctx: CanvasRenderingContext2D): void {
		const g = this.game;
		const r = g.rules;
		const mid = HUD_HEIGHT / 2;

		// the main figure
		let label = "DONJON";
		let value = String(this.explored()) + " %";
		if (r.laps) {
			label = "TOURS";
			value = String(Math.max(0, g.laps - 1));
		} else if (g.mode === "classic") {
			label = "NIVEAU";
			value = String(g.level + 1);
		}
		label_(ctx, label, 24, mid - 16);
		ctx.save();
		if (this.lapFlash > 0) {
			ctx.translate(24, mid + 14);
			const s = 1 + this.lapFlash * 0.25;
			ctx.scale(s, s);
			ctx.translate(-24, -mid - 14);
			ctx.fillStyle = COLOR.green;
		} else {
			ctx.fillStyle = COLOR.ink;
		}
		ctx.font = `700 28px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(value, 24, mid + 20);
		ctx.restore();

		// the time
		const tx = 150, tw = 170;
		label_(ctx, "TEMPS", tx, mid - 16);
		const low = !r.laps && g.time < 60;
		ctx.fillStyle = low ? COLOR.magenta : COLOR.cyanInk;
		ctx.font = `700 22px ${FONT}`;
		ctx.textAlign = "right";
		ctx.fillText(formatTime(Math.max(0, this.shownTime)), tx + tw, mid - 10 + 16);
		if (r.startTime > 0 || r.maxTime) {
			const total = r.maxTime || r.startTime;
			const k = Math.max(0, Math.min(1, this.shownTime / total));
			roundedRect(ctx, tx, mid + 12, tw, 8, 4);
			ctx.fillStyle = "rgba(30,21,69,0.1)";
			ctx.fill();
			if (k > 0) {
				const bar = ctx.createLinearGradient(tx, 0, tx + tw, 0);
				bar.addColorStop(0, low ? COLOR.magenta : COLOR.cyan);
				bar.addColorStop(1, low ? COLOR.amber : "#8EA8FF");
				ctx.save();
				ctx.shadowColor = low ? "rgba(255,46,126,0.5)" : "rgba(77,225,255,0.6)";
				ctx.shadowBlur = 8;
				ctx.fillStyle = bar;
				roundedRect(ctx, tx, mid + 12, Math.max(8, tw * k), 8, 4);
				ctx.fill();
				ctx.restore();
			}
		}

		// the orbs
		const room = g.room;
		const ox = 350;
		label_(ctx, "ORBES", ox, mid - 16);
		const total = room.redsTotal;
		const taken = total - room.redsLeft;
		for (let i = 0; i < Math.min(total, 8); i++) {
			const cx = ox + 7 + i * 17;
			if (i < taken) {
				halo(ctx, cx, mid + 10, 12, "rgba(255,77,94,0.7)");
				ctx.fillStyle = sphere(ctx, cx, mid + 10, 6.5, ["#FF9AA5", "#FF4D5E", "#C81E3A"]);
				circlePath(ctx, cx, mid + 10, 6.5);
				ctx.fill();
			} else {
				ctx.strokeStyle = "rgba(255,77,94,0.55)";
				ctx.lineWidth = 2;
				circlePath(ctx, cx, mid + 10, 5.5);
				ctx.stroke();
			}
		}
		if (total > 0) {
			ctx.fillStyle = COLOR.ink;
			ctx.font = `700 14px ${FONT}`;
			ctx.textAlign = "left";
			ctx.fillText(taken + "/" + total, ox, mid + 32);
		}

		// the map of the visited rooms
		this.renderMap(ctx, W - 24, mid);
	}

	explored(): number {
		if (this.cacheAt === app.time)
			return this.cached;
		this.cacheAt = app.time;
		let rooms = 0, visited = 0;
		for (const { room } of this.game.dungeon.allRooms()) {
			rooms++;
			if (room.visited)
				visited++;
		}
		this.visitedCount = visited;
		return this.cached = rooms ? Math.floor(visited * 100 / rooms) : 0;
	}

	renderMap(ctx: CanvasRenderingContext2D, right: number, mid: number): void {
		const g = this.game;
		const d = g.dungeon;
		const w = Math.min(8, d.width), h = Math.min(8, d.height);
		const size = MAP_CELL + MAP_GAP;
		const x0 = right - w * size;
		const y0 = mid - (h * size) / 2;
		const cur = g.room;
		for (let x = 0; x < w; x++) {
			for (let y = 0; y < h; y++) {
				const room = d.room(x, y);
				if (!room)
					continue;
				const px = x0 + x * size, py = y0 + y * size;
				const here = x === cur.rx && y === cur.ry;
				if (here) {
					ctx.save();
					ctx.shadowColor = "rgba(95,203,43,0.8)";
					ctx.shadowBlur = 6;
					ctx.fillStyle = COLOR.green;
					roundedRect(ctx, px, py, MAP_CELL, MAP_CELL, 2);
					ctx.fill();
					ctx.restore();
				} else if (room.visited) {
					ctx.fillStyle = COLOR.roomOn;
					roundedRect(ctx, px, py, MAP_CELL, MAP_CELL, 2);
					ctx.fill();
				} else if (g.inventory.map) {
					ctx.strokeStyle = "rgba(95,203,43,0.55)";
					ctx.lineWidth = 1;
					roundedRect(ctx, px + 0.5, py + 0.5, MAP_CELL - 1, MAP_CELL - 1, 2);
					ctx.stroke();
				}
			}
		}
		ctx.fillStyle = COLOR.muted;
		ctx.font = `600 10px ${FONT}`;
		ctx.textAlign = "right";
		ctx.fillText("SALLES", x0 - 8, mid - 4);
		ctx.fillStyle = COLOR.ink;
		ctx.font = `700 20px ${FONT}`;
		this.explored();
		ctx.fillText(String(this.visitedCount).padStart(2, "0"), x0 - 8, mid + 16);
	}

	/** The balls owned and the keys, drawn in room coordinates over the floor. */
	renderOverlay(ctx: CanvasRenderingContext2D): void {
		const g = this.game;
		if (!g.rules.ballSwitch)
			return;
		const inv = g.inventory;
		let i = 0;
		// (from the violet ball, right to left, the current one last)
		for (let type = BALL_TYPE_COUNT - 1; type >= 0; type--) {
			for (let n = 0; n < inv.balls[type]; n++) {
				const current = g.ball.type === type && n === inv.balls[type] - 1 && !g.ball.hidden;
				const x = W - BORDER - 16 - 22 * i, y = H - BORDER - 14;
				const [main, dark, light] = BALL_PALETTE[type];
				ctx.save();
				ctx.globalAlpha = current ? 1 : 0.55;
				if (current) {
					ctx.strokeStyle = "#FFFFFF";
					ctx.lineWidth = 2;
					circlePath(ctx, x, y, 10);
					ctx.stroke();
				}
				ctx.fillStyle = sphere(ctx, x, y, 7, [light, main, dark]);
				circlePath(ctx, x, y, 7);
				ctx.fill();
				ctx.restore();
				i++;
			}
		}
		for (let k = 0; k < inv.keys; k++) {
			const x = W - BORDER - 16 - 20 * k, y = H - BORDER - 38;
			ctx.fillStyle = COLOR.amber;
			circlePath(ctx, x, y, 6);
			ctx.fill();
			ctx.fillStyle = COLOR.amberInk;
			ctx.fillRect(x - 1.5, y + 4, 3, 9);
		}
	}
}

function label_(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
	ctx.fillStyle = COLOR.muted;
	ctx.font = `600 10px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	if ("letterSpacing" in ctx)
		(ctx as any).letterSpacing = "1.6px";
	ctx.fillText(text, x, y + 4);
	if ("letterSpacing" in ctx)
		(ctx as any).letterSpacing = "0px";
}
