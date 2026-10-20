/**
 * The title screen: the letters of "MotionBall" drop in one after the other,
 * the big "2" falls and shakes the screen, a ball rolls underneath, then
 * "press a key" pulses. Waits for a key, a click or a tap (which also allows
 * the browser to play sound), then goes to the menu.
 *
 * Everything is a function of the time since the start, so it is drawn at
 * the display rate whatever it is.
 */

import { WIDTH as W, VIEW_HEIGHT as H } from "../config.js";
import { COLOR, FONT, BALL_PALETTE, halo } from "../gfx/theme.js";
import { backdrop } from "../gfx/ui.js";
import { drawBallSprite, drawBallShadow } from "../gfx/sprites.js";
import { MUSIC_VOLUME } from "../sounds.js";
import { app } from "../app.js";
import { MenuScene } from "./menu.js";

const WORD = "MotionBall";
const LETTER_SIZE = 62;
const LETTER_DELAY = 0.07;
const DROP_TIME = 0.7;
const TWO_AT = 1.4;
const TWO_FALL = 0.45;
const READY_AT = 2.4;

/** 0 -> 1 with a few bounces at the end. */
function bounceOut(t: number): number {
	if (t >= 1) return 1;
	if (t < 1 / 2.75) return 7.5625 * t * t;
	if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
	if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
	return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

export class TitleScene {
	declare leaving: boolean;
	declare time: number;

	constructor() {
		this.leaving = false;
		this.time = 0;
	}

	update(dt) {
		const input = app.input;
		if (!this.leaving && (input.pressed("confirm") || input.pressed("pause") || input.pointer)) {
			this.leaving = true;
			app.audio.unlock();
			app.audio.play("menuEnter");
			app.audio.playMusic("musicMenu", MUSIC_VOLUME);
			app.scenes.goto(new MenuScene());
			return;
		}
		this.time += dt;
	}

	render(ctx: CanvasRenderingContext2D) {
		const t = this.time;
		backdrop(ctx, W, H, t);

		// the shake when the "2" lands
		const since = t - (TWO_AT + TWO_FALL);
		const shake = since > 0 && since < 0.5 ? Math.sin(since * 70) * 7 * (1 - since / 0.5) : 0;
		ctx.save();
		ctx.translate(0, shake);

		this.renderWord(ctx, t);
		this.renderTwo(ctx, t, since);
		this.renderBall(ctx, t);

		if (t > READY_AT) {
			const k = Math.min(1, (t - READY_AT) / 0.4);
			ctx.globalAlpha = k * (0.65 + 0.35 * Math.sin(t * 4));
			ctx.fillStyle = COLOR.muted;
			ctx.font = `600 18px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Appuie sur une touche", W / 2, H - 70);
			ctx.globalAlpha = 1;
		}
		ctx.restore();
	}

	renderWord(ctx: CanvasRenderingContext2D, t: number) {
		ctx.font = `800 ${LETTER_SIZE}px ${FONT}`;
		ctx.textBaseline = "alphabetic";
		ctx.textAlign = "left";
		const widths = [...WORD].map(c => ctx.measureText(c).width);
		const total = widths.reduce((a, b) => a + b, 0);
		let x = (W - total) / 2 - 36;
		const base = 190;
		[...WORD].forEach((c, i) => {
			const k = Math.max(0, Math.min(1, (t - i * LETTER_DELAY) / DROP_TIME));
			if (k > 0) {
				const y = base - (1 - bounceOut(k)) * 260;
				ctx.save();
				ctx.globalAlpha = Math.min(1, k * 4);
				// the "Ball" half is green-tinted ink, "Motion" is ink
				ctx.fillStyle = i < 6 ? COLOR.ink : COLOR.violet;
				// a gentle breathing once everything has landed
				const breathe = t > 1.2 ? Math.sin(t * 2 + i * 0.6) * 2 : 0;
				ctx.fillText(c, x, y + breathe);
				ctx.restore();
			}
			x += widths[i];
		});
	}

	renderTwo(ctx: CanvasRenderingContext2D, t: number, since: number) {
		const k = (t - TWO_AT) / TWO_FALL;
		if (k < 0)
			return;
		const cx = W / 2 + 176, cy = 150;
		const fall = Math.min(1, k);
		const y = cy - (1 - fall * fall) * 320;
		const scale = 1 + (1 - fall) * 2.2;
		if (since > 0 && since < 0.6) {
			// the shockwave of the landing
			ctx.strokeStyle = COLOR.green;
			ctx.globalAlpha = 1 - since / 0.6;
			ctx.lineWidth = 6 * (1 - since / 0.6) + 1;
			ctx.beginPath();
			ctx.arc(cx, cy + 20, 20 + since * 260, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		ctx.save();
		ctx.translate(cx, y);
		ctx.scale(scale, scale);
		halo(ctx, 0, 0, 90, "rgba(95,203,43,0.6)", fall);
		ctx.font = `800 120px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const g = ctx.createLinearGradient(0, -50, 0, 50);
		g.addColorStop(0, "#D2FF8F");
		g.addColorStop(1, COLOR.green);
		ctx.fillStyle = g;
		ctx.strokeStyle = "#3A8F14";
		ctx.lineWidth = 4;
		ctx.lineJoin = "round";
		ctx.strokeText("2", 0, 0);
		ctx.fillText("2", 0, 0);
		ctx.restore();
	}

	renderBall(ctx: CanvasRenderingContext2D, t: number) {
		const start = TWO_AT + TWO_FALL + 0.2;
		if (t < start)
			return;
		const u = t - start;
		const x = -30 + u * 150;
		const wrap = ((x + 30) % (W + 60)) - 30;
		const y = 300 - Math.abs(Math.sin(u * 4.5)) * 46;
		const trail = [1, 2, 3].map(i => ({ x: wrap - i * 14, y: 300 - Math.abs(Math.sin((u - i * 0.03) * 4.5)) * 46 }));
		drawBallShadow(ctx, wrap, 300);
		drawBallSprite(ctx, wrap, y, 1, 1.5, trail);
		void BALL_PALETTE;
	}
}
