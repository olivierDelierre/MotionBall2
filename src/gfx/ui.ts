/**
 * The interface kit: cards, pill buttons, panels and the elastic "pop" of a
 * panel. Everything is drawn from the palette in theme.ts, and takes a
 * `focus` amount (0..1) so that the caller can animate it at any frame rate.
 */

import { COLOR, FONT, roundedRect, circlePath, halo, softShadow, drawSphere } from "./theme.js";
import { text } from "./draw.js";

/** A white panel with a soft shadow. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 20): void {
	softShadow(ctx, x, y, w, h, radius, 18, 0.3, 8);
	roundedRect(ctx, x, y, w, h, radius);
	ctx.fillStyle = "#FFFFFF";
	ctx.fill();
	roundedRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
	ctx.strokeStyle = "rgba(30,21,69,0.1)";
	ctx.lineWidth = 1;
	ctx.stroke();
}

export interface CardOptions {
	title: string;
	subtitle?: string;
	/** colours of the orb on the left: [light, main, dark] */
	orb?: readonly [string, string, string];
	/** 0..1, how much the card is focused */
	focus?: number;
	enabled?: boolean;
	/** small text on the right, e.g. a record */
	badge?: string;
}

/** A menu card centred on (x, y). */
export function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: CardOptions): void {
	const f = o.focus ?? 0;
	const enabled = o.enabled !== false;
	ctx.save();
	ctx.translate(x, y);
	const s = 1 + 0.035 * f;
	ctx.scale(s, s);
	ctx.globalAlpha *= enabled ? 1 : 0.55;

	softShadow(ctx, -w / 2, -h / 2, w, h, 16, 8 + 6 * f, 0.22 + 0.2 * f, 4 + 4 * f);
	roundedRect(ctx, -w / 2, -h / 2, w, h, 16);
	ctx.fillStyle = "#FFFFFF";
	ctx.fill();
	roundedRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 15);
	ctx.strokeStyle = f > 0.5 ? COLOR.green : "rgba(30,21,69,0.1)";
	ctx.lineWidth = f > 0.5 ? 2.5 : 1;
	ctx.stroke();

	const orb = o.orb ?? ["#D5C2FF", "#7C3AED", "#3B1A8A"];
	const ox = -w / 2 + 30;
	if (enabled)
		halo(ctx, ox, 0, 28, orb[1], 0.35 + 0.3 * f);
	if (enabled) {
		drawSphere(ctx, ox, 0, 14, orb as [string, string, string]);
	} else {
		ctx.fillStyle = "#C9C2E0";
		circlePath(ctx, ox, 0, 14);
		ctx.fill();
	}
	if (!enabled)
		lock(ctx, ox, 0);

	text(ctx, o.title, -w / 2 + 58, o.subtitle ? -8 : 0, { size: 18, color: COLOR.ink, align: "left", weight: "700" });
	if (o.subtitle)
		text(ctx, o.subtitle, -w / 2 + 58, 12, { size: 12, color: COLOR.muted, align: "left", weight: "500" });
	if (o.badge)
		text(ctx, o.badge, w / 2 - 16, 0, { size: 13, color: COLOR.cyanInk, align: "right", weight: "700" });
	ctx.restore();
}

function lock(ctx: CanvasRenderingContext2D, x: number, y: number): void {
	ctx.fillStyle = "#FFFFFF";
	roundedRect(ctx, x - 5, y - 1, 10, 8, 2);
	ctx.fill();
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 1.8;
	ctx.beginPath();
	ctx.arc(x, y - 1, 3.2, Math.PI, 0);
	ctx.stroke();
}

/**
 * A pill button centred on (x, y). `state`: "idle", "focus" (keyboard /
 * mouse over) or "disabled".
 */
export function button(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, state = "idle"): void {
	const focus = state === "focus";
	const disabled = state === "disabled";
	ctx.save();
	ctx.translate(x, y);
	if (focus)
		ctx.scale(1.05, 1.05);
	softShadow(ctx, -w / 2, -h / 2, w, h, h / 2, 7, 0.3, 4);
	const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
	if (disabled) {
		g.addColorStop(0, "#D6D0EA");
		g.addColorStop(1, "#BDB5DA");
	} else if (focus) {
		g.addColorStop(0, "#8FE85A");
		g.addColorStop(1, "#5FCB2B");
	} else {
		g.addColorStop(0, "#FFFFFF");
		g.addColorStop(1, "#F0EAFF");
	}
	ctx.fillStyle = g;
	roundedRect(ctx, -w / 2, -h / 2, w, h, h / 2);
	ctx.fill();
	roundedRect(ctx, -w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, h / 2);
	ctx.strokeStyle = focus ? "#3A8F14" : "rgba(30,21,69,0.15)";
	ctx.lineWidth = 1.5;
	ctx.stroke();
	text(ctx, label, 0, 1, { size: Math.min(17, h * 0.55), color: focus ? "#12330A" : COLOR.ink, weight: "700" });
	ctx.restore();
}

/** A slider bar centred vertically on y. `value` 0..1. */
export function slider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, value: number, active: boolean, enabled = true): void {
	ctx.save();
	ctx.globalAlpha *= enabled ? 1 : 0.4;
	roundedRect(ctx, x, y - 4, w, 8, 4);
	ctx.fillStyle = "rgba(30,21,69,0.12)";
	ctx.fill();
	const bar = ctx.createLinearGradient(x, 0, x + w, 0);
	bar.addColorStop(0, COLOR.cyan);
	bar.addColorStop(1, "#8EA8FF");
	ctx.fillStyle = bar;
	roundedRect(ctx, x, y - 4, Math.max(8, w * value), 8, 4);
	ctx.fill();
	ctx.fillStyle = "#FFFFFF";
	halo(ctx, x + w * value, y, 14, "rgba(60,40,140,0.35)");
	circlePath(ctx, x + w * value, y, active ? 9 : 7);
	ctx.fill();
	ctx.restore();
}

/** The elastic "pop" of a panel: value goes 0 -> 1 with a bounce (a damped spring, time-based). */
export class Pop {
	declare value: number;
	declare speed: number;

	constructor() {
		this.value = 0;
		this.speed = 0;
	}

	update(dt: number): number {
		const stiffness = 520, damping = 22;
		this.speed += ((1 - this.value) * stiffness - this.speed * damping) * dt;
		this.value += this.speed * dt;
		return this.value;
	}
}

/** The lavender backdrop of the screens, with `orbs` slowly floating. */
export function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, orbs = true): void {
	const g = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.9);
	g.addColorStop(0, "#FFFFFF");
	g.addColorStop(1, COLOR.backdrop);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
	if (!orbs)
		return;
	const colors = [COLOR.green, COLOR.cyan, COLOR.red, COLOR.violet, COLOR.magenta];
	for (let i = 0; i < 9; i++) {
		const r = 10 + (i * 7) % 16;
		const x = (i * 97 + 40 + Math.sin(time * 0.3 + i) * 18) % w;
		const y = (i * 61 + 30 + Math.cos(time * 0.25 + i * 2) * 14) % h;
		halo(ctx, x, y, r * 2.4, colors[i % colors.length], 0.12);
		ctx.globalAlpha = 0.28;
		ctx.fillStyle = colors[i % colors.length];
		circlePath(ctx, x, y, r * 0.5);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}

export { FONT };
