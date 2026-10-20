/**
 * The achievements screen (from the menu) : every achievement, unlocked or
 * not, with its progress when it counts something. Any key, a click or a tap
 * goes back to the menu.
 */

import { WIDTH as W, VIEW_HEIGHT as H } from "../config.js";
import { ACHIEVEMENTS } from "../achievements.js";
import { text } from "../gfx/draw.js";
import { COLOR, BALL_PALETTE, roundedRect, circlePath, sphere } from "../gfx/theme.js";
import { backdrop } from "../gfx/ui.js";
import { app } from "../app.js";
import { MenuScene } from "./menu.js";

const COLUMNS = 2;
const TOP = 76;
const ROW = 42;
const CELL_W = 285;
const LEFT = (W - CELL_W * COLUMNS - 10) / 2;

/** "12/09/2026" */
const day = ms => {
	const d = new Date(ms);
	const two = n => String(n).padStart(2, "0");
	return two(d.getDate()) + "/" + two(d.getMonth() + 1) + "/" + d.getFullYear();
};

export class AchievementsScene {
	declare time: number;


	constructor() {
		this.time = 0;
	}

	update(dt) {
		this.time += dt;
		const input = app.input;
		if (this.time > 0.3 && !app.scenes.busy
			&& (input.pressed("back") || input.pressed("confirm") || input.pressed("pause") || input.pointer)) {
			app.audio.play("menuEnter");
			this.back();
		}
	}

	back() {
		app.scenes.goto(new MenuScene("main", "succes"));
	}

	render(ctx: CanvasRenderingContext2D) {
		backdrop(ctx, W, H, this.time);

		const ach = app.achievements;
		text(ctx, "Succès", W / 2, 34, { size: 28, color: COLOR.ink, weight: "800" });
		text(ctx, ach.unlockedCount + " / " + ACHIEVEMENTS.length, W / 2, 58, { size: 14, color: COLOR.muted, weight: "600" });

		ACHIEVEMENTS.forEach((a, i) => {
			const x = LEFT + (i % COLUMNS) * (CELL_W + 10);
			const y = TOP + Math.floor(i / COLUMNS) * ROW;
			const done = ach.isUnlocked(a.id);
			const hidden = a.secret && !done;
			const h = ROW - 6;

			ctx.save();
			ctx.shadowColor = "rgba(60,40,140,0.12)";
			ctx.shadowBlur = 10;
			ctx.shadowOffsetY = 3;
			roundedRect(ctx, x, y, CELL_W, h, 12);
			ctx.fillStyle = done ? "#FFFFFF" : "rgba(255,255,255,0.55)";
			ctx.fill();
			ctx.restore();

			// the icon: an orb of the achievement's colour, dim while locked
			const [main, dark, light] = BALL_PALETTE[a.ball];
			ctx.globalAlpha = done ? 1 : 0.3;
			ctx.fillStyle = sphere(ctx, x + 20, y + h / 2, 11, [light, main, dark]);
			circlePath(ctx, x + 20, y + h / 2, 11);
			ctx.fill();
			ctx.globalAlpha = 1;

			const name = hidden ? "???" : a.name;
			const desc = hidden ? "Un succès secret." : a.text;
			text(ctx, name, x + 40, y + 12, { size: 13, color: done ? COLOR.ink : COLOR.muted, align: "left", weight: "700" });
			text(ctx, desc, x + 40, y + 27, { size: 10.5, color: COLOR.muted, align: "left", weight: "500" });

			if (done) {
				text(ctx, day(ach.date(a.id)), x + CELL_W - 10, y + 12, { size: 10, color: COLOR.green, align: "right", weight: "700" });
			} else {
				const p = ach.progress(a);
				if (p) {
					text(ctx, p.value + " / " + p.goal, x + CELL_W - 10, y + 12, { size: 10, color: COLOR.muted, align: "right", weight: "600" });
					roundedRect(ctx, x + CELL_W - 72, y + 22, 62, 5, 2.5);
					ctx.fillStyle = "rgba(30,21,69,0.12)";
					ctx.fill();
					roundedRect(ctx, x + CELL_W - 72, y + 22, Math.max(5, 62 * p.value / p.goal), 5, 2.5);
					ctx.fillStyle = COLOR.cyan;
					ctx.fill();
				}
			}
		});

		if (this.time > 0.3)
			text(ctx, "Clique ou appuie sur une touche pour revenir", W / 2, H - 14,
				{ size: 12, color: COLOR.muted, weight: "600" });
	}
}
