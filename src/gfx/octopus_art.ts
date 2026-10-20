/**
 * The octopus boss, drawn with paths: a violet blob with one big eye, two
 * pincers and a mouth that sucks. All the poses come from the boss's state.
 */

import { COLOR, TAU, circlePath, sphere, halo, dropShadow, drawSphere } from "./theme.js";

export interface OctopusPose {
	anim: string;          // sleep, normal, suck, eat, spit, eyeless, newEye, death
	animTime: number;      // seconds since the animation started
	pupilX: number;
	pupilY: number;
	pincers: number;       // opening angle, degrees
	suction: number;       // strength of the suction rings
	jump: number;          // height of the jump, pixels
	red: number;           // 0..1, how red (hurt)
	blink: number;         // 0..1, how closed the eyelid is
	time: number;          // for idle wobble
}

export function drawOctopusShadow(ctx: CanvasRenderingContext2D, x: number, y: number, jump: number): void {
	const k = 1 + jump / 300;
	dropShadow(ctx, x + 6, y + 30, 48 * k, 20 * k, 0.35 / k);
}

export function drawOctopus(ctx: CanvasRenderingContext2D, x: number, y: number, p: OctopusPose): void {
	ctx.save();
	ctx.translate(x, y - p.jump);
	// the body stretches while it is in the air
	const stretch = 1 + Math.min(0.2, p.jump / 400);
	ctx.scale(1 / Math.sqrt(stretch), stretch);
	if (p.anim === "death") {
		const s = 1 + Math.sin(p.animTime * 60) * 0.06;
		ctx.scale(s, s);
	}

	// suction rings in front of the mouth
	if (p.suction > 0.05) {
		ctx.strokeStyle = COLOR.cyan;
		ctx.lineWidth = 2;
		for (let i = 0; i < 3; i++) {
			const k = ((p.time * 1.4 + i / 3) % 1);
			ctx.globalAlpha = 0.5 * Math.sin(k * Math.PI) * Math.min(1, p.suction);
			circlePath(ctx, 0, 14, 110 * p.suction * (1 - k) + 14);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	// tentacles
	ctx.fillStyle = "#7A3FE0";
	for (let i = 0; i < 6; i++) {
		const a = Math.PI * (0.15 + 0.7 * i / 5);
		const wob = Math.sin(p.time * 4 + i) * 3;
		circlePath(ctx, Math.cos(a) * 34 + wob, Math.sin(a) * 30 + 6, 9);
		ctx.fill();
	}

	// pincers
	for (const side of [-1, 1]) {
		ctx.save();
		ctx.translate(side * 38, 0);
		ctx.rotate(side * (p.pincers + 25) * Math.PI / 180 * -1);
		ctx.fillStyle = "#4B2FB5";
		ctx.beginPath();
		ctx.ellipse(side * 12, 0, 16, 9, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "#FFFFFF";
		ctx.beginPath();
		ctx.moveTo(side * 24, -3); ctx.lineTo(side * 34, 0); ctx.lineTo(side * 24, 3);
		ctx.fill();
		ctx.restore();
	}

	// body
	halo(ctx, 0, 0, 80, "rgba(124,58,237,0.35)");
	const body = ctx.createRadialGradient(-12, -20, 6, 0, 0, 46);
	body.addColorStop(0, "#C8A8FF");
	body.addColorStop(0.6, "#8A52F0");
	body.addColorStop(1, "#5B2FC8");
	ctx.fillStyle = body;
	ctx.beginPath();
	ctx.ellipse(0, 0, 42, 36, 0, 0, TAU);
	ctx.fill();
	if (p.red > 0) {
		ctx.fillStyle = `rgba(255,46,70,${Math.min(0.75, p.red * 0.75)})`;
		ctx.beginPath();
		ctx.ellipse(0, 0, 42, 36, 0, 0, TAU);
		ctx.fill();
	}

	// mouth
	const open = p.anim === "suck" || p.anim === "eat" || p.anim === "spit" ? 1 : 0;
	ctx.fillStyle = "#1A1240";
	ctx.beginPath();
	ctx.ellipse(0, 20, 12 + open * 5, 4 + open * 8, 0, 0, TAU);
	ctx.fill();

	// eye
	const socket = p.anim === "eyeless" || (p.anim === "newEye" && p.animTime < 0.2);
	const grow = p.anim === "newEye" ? Math.min(1, p.animTime / 0.5) : 1;
	ctx.fillStyle = "#2A1B6B";
	circlePath(ctx, 0, -8, 19);
	ctx.fill();
	if (!socket && p.anim !== "death") {
		const r = 17 * grow;
		const asleep = p.anim === "sleep";
		drawSphere(ctx, 0, -8, r, ["#FFFFFF", "#FFFFFF", "#D8D0F5"]);
		const px = p.pupilX * 0.3, py = p.pupilY * 0.3;
		ctx.fillStyle = COLOR.ink;
		circlePath(ctx, px, -8 + py, 7.5 * grow);
		ctx.fill();
		ctx.fillStyle = "#FFFFFF";
		circlePath(ctx, px - 2, -10 + py, 2);
		ctx.fill();
		// the eyelid
		const lid = asleep ? 1 : p.blink;
		if (lid > 0) {
			ctx.fillStyle = "#8A52F0";
			ctx.beginPath();
			ctx.arc(0, -8, r + 1, Math.PI, 0);
			ctx.lineTo(r + 1, -8 - r + lid * r * 2);
			ctx.lineTo(-r - 1, -8 - r + lid * r * 2);
			ctx.closePath();
			ctx.clip();
			ctx.fillRect(-r - 2, -8 - r - 2, r * 2 + 4, lid * r * 2 + 2);
		}
	}
	ctx.restore();
}

/** The eye the octopus throws: an eyeball with a red iris. */
export function drawThrownEye(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, red: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(time * 6);
	halo(ctx, 0, 0, 34, "rgba(255,77,94,0.5)");
	drawSphere(ctx, 0, 0, 17, ["#FFFFFF", "#FFFFFF", red > 0 ? "#FFB3BB" : "#D8D0F5"]);
	ctx.fillStyle = COLOR.red;
	circlePath(ctx, 5, 0, 8);
	ctx.fill();
	ctx.fillStyle = COLOR.ink;
	circlePath(ctx, 6, 0, 4);
	ctx.fill();
	ctx.restore();
}

/** A blob of the octopus's death. */
export function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
	drawSphere(ctx, x, y, 20 * scale, ["#C8A8FF", "#8A52F0", "#5B2FC8"]);
}
