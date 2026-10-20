/**
 * The map of the dungeon, shown in the pause:
 *
 *   with the map item    the known rooms, and the passages between them
 *   with the radar       where the start, the boss, the balls and the bonuses are
 *   without either       only the current room
 */

import { WIDTH as W, VIEW_HEIGHT as H } from "../config.js";
import { RoomType, Exit } from "../data/enums.js";
import { COLOR, BALL_PALETTE, roundedRect, circlePath, halo } from "../gfx/theme.js";
import { panel } from "../gfx/ui.js";
import { text } from "../gfx/draw.js";

const CELL_W = 44;
const CELL_H = 32;
const GAP = 8;

/** The ball colour shown for each kind of ball room / bonus (see DungeonBall / DungeonBonus). */
const OBJECT_BALLS = [1, 4, 5, 6];
const BONUS_COLORS = [COLOR.cyan, COLOR.cyan, COLOR.amber, COLOR.amber, COLOR.amber, COLOR.amber, COLOR.amber];

/** Is exit `dir` of a room a visible passage ? */
function passage(room, dir) {
	if (!room)
		return false;
	const t = room.exits[dir].type;
	return t !== Exit.WALL && t !== Exit.HIDDEN;
}

/** Draws the map in the middle of the pause. */
export function drawMap(ctx: CanvasRenderingContext2D, game) {
	const d = game.dungeon;
	const inv = game.inventory;
	const cur = game.room;
	const cols = Math.min(8, d.width), rows = Math.min(8, d.height);
	const w = cols * (CELL_W + GAP) - GAP, h = rows * (CELL_H + GAP) - GAP;
	const pw = w + 48, ph = h + 70;
	const px = (W - pw) / 2, py = (H - 60 - ph) / 2 + 6;

	panel(ctx, px, py, pw, ph, 24);
	text(ctx, "Carte", W / 2, py + 26, { size: 18, color: COLOR.ink, weight: "800" });
	const x0 = px + 24, y0 = py + 48;
	const at = (x, y) => ({ x: x0 + x * (CELL_W + GAP), y: y0 + y * (CELL_H + GAP) });

	// the passages first, under the rooms
	if (inv.map) {
		ctx.strokeStyle = "rgba(91,69,200,0.45)";
		ctx.lineWidth = 4;
		ctx.lineCap = "round";
		for (let x = 0; x < cols; x++) {
			for (let y = 0; y < rows; y++) {
				const room = d.room(x, y);
				if (!room)
					continue;
				const a = at(x, y);
				const link = (other, bx, by, dirA, dirB) => {
					if (!other || !passage(room, dirA) || !passage(other, dirB))
						return;
					const b = at(bx, by);
					ctx.beginPath();
					ctx.moveTo(a.x + CELL_W / 2, a.y + CELL_H / 2);
					ctx.lineTo(b.x + CELL_W / 2, b.y + CELL_H / 2);
					ctx.stroke();
				};
				link(d.room(x + 1, y), x + 1, y, 1, 0);
				link(d.room(x, y + 1), x, y + 1, 3, 2);
			}
		}
	}

	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			const room = d.room(x, y);
			if (!room)
				continue;
			const { x: rx, y: ry } = at(x, y);
			const here = x === cur.rx && y === cur.ry;
			if (here) {
				ctx.save();
				ctx.shadowColor = "rgba(95,203,43,0.8)";
				ctx.shadowBlur = 12;
				roundedRect(ctx, rx, ry, CELL_W, CELL_H, 8);
				ctx.fillStyle = COLOR.green;
				ctx.fill();
				ctx.restore();
			} else if (room.visited && inv.map) {
				roundedRect(ctx, rx, ry, CELL_W, CELL_H, 8);
				ctx.fillStyle = COLOR.roomOn;
				ctx.fill();
			} else if (inv.map) {
				roundedRect(ctx, rx + 1, ry + 1, CELL_W - 2, CELL_H - 2, 8);
				ctx.strokeStyle = "rgba(95,203,43,0.6)";
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			if (!inv.radar)
				continue;
			const cx = rx + CELL_W / 2, cy = ry + CELL_H / 2;
			switch (room.type) {
			case RoomType.BOSS:
				halo(ctx, cx, cy, 16, "rgba(255,46,126,0.7)");
				ctx.fillStyle = COLOR.magenta;
				circlePath(ctx, cx, cy, 6);
				ctx.fill();
				ctx.fillStyle = "#2A0B2E";
				circlePath(ctx, cx, cy, 2.5);
				ctx.fill();
				break;
			case RoomType.BALL:
				if (!room.taken)
					marker(ctx, cx, cy, BALL_PALETTE[OBJECT_BALLS[room.content]][0]);
				break;
			case RoomType.BONUS:
				if (!room.taken)
					marker(ctx, cx, cy, BONUS_COLORS[room.content]);
				break;
			default:
				if (x === d.start.x && y === d.start.y) {
					ctx.strokeStyle = here ? "#FFFFFF" : COLOR.green;
					ctx.lineWidth = 2;
					circlePath(ctx, cx, cy, 6);
					ctx.stroke();
				}
			}
		}
	}
}

function marker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
	ctx.fillStyle = "#FFFFFF";
	circlePath(ctx, x, y, 7);
	ctx.fill();
	ctx.fillStyle = color;
	circlePath(ctx, x, y, 5);
	ctx.fill();
}
