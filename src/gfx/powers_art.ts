/** The elemental powers of the snakes: water drop, fire, bud and vine, whirlwind. */

import { COLOR, TAU, circlePath, halo, sphere } from "./theme.js";

export function drawWaterDrop(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, time: number): void {
	ctx.save();
	ctx.translate(x, y);
	halo(ctx, 0, 0, 30, "rgba(58,141,255,0.55)");
	ctx.rotate(angle);
	const s = 1 + Math.sin(time * 14) * 0.06;
	ctx.scale(s, 1 / s);
	ctx.fillStyle = sphere(ctx, 0, 0, 11, ["#D9F7FF", "#4DB5FF", "#1E58C9"]);
	ctx.beginPath();
	ctx.moveTo(-18, 0);
	ctx.quadraticCurveTo(-4, -9, 0, -11);
	ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2);
	ctx.quadraticCurveTo(-4, 9, -18, 0);
	ctx.fill();
	ctx.restore();
}

/** A droplet of the splash. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
	ctx.fillStyle = "rgba(77,181,255,0.85)";
	circlePath(ctx, x, y, 5 * size);
	ctx.fill();
}

/** A wet streak left behind the ball. `alpha` fades it. */
export function drawWetMark(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, alpha: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.globalAlpha *= alpha * 0.55;
	ctx.strokeStyle = "#4DB5FF";
	ctx.lineWidth = 5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(Math.max(2, length * 3), 0);
	ctx.stroke();
	ctx.restore();
}

/** A fire pillar. `grow` 0..1 (embers then flames), `fade` 1..0 when it dies down. */
export function drawFire(ctx: CanvasRenderingContext2D, x: number, y: number, grow: number, fade: number, time: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.globalAlpha *= fade;
	halo(ctx, 0, -6, 38 * grow + 6, "rgba(255,107,43,0.6)");
	const flick = Math.sin(time * 18) * 1.5;
	const h = 30 * grow;
	ctx.fillStyle = COLOR.red;
	ctx.beginPath();
	ctx.moveTo(-12 * grow, 4);
	ctx.quadraticCurveTo(-14 * grow, -h * 0.4, flick, -h);
	ctx.quadraticCurveTo(14 * grow, -h * 0.4, 12 * grow, 4);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "#FF8A1A";
	ctx.beginPath();
	ctx.moveTo(-8 * grow, 4);
	ctx.quadraticCurveTo(-9 * grow, -h * 0.3, -flick * 0.5, -h * 0.7);
	ctx.quadraticCurveTo(9 * grow, -h * 0.3, 8 * grow, 4);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "#FFE070";
	ctx.beginPath();
	ctx.ellipse(0, 0, 4 * grow, 6 * grow, 0, 0, TAU);
	ctx.fill();
	ctx.restore();
}

/** The bud of the earth power. `state`: growing 0..1, then "tied" bursts open. */
export function drawBud(ctx: CanvasRenderingContext2D, x: number, y: number, grow: number, open: boolean, wither: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.globalAlpha *= 1 - wither;
	const s = grow * (1 - wither * 0.4);
	ctx.scale(s, s);
	halo(ctx, 0, 0, 26, "rgba(95,203,43,0.45)");
	ctx.fillStyle = "#3A8F14";
	for (let i = 0; i < 5; i++) {
		ctx.save();
		ctx.rotate(i * TAU / 5 + (open ? 0.3 : 0));
		ctx.beginPath();
		ctx.ellipse(open ? 12 : 8, 0, open ? 11 : 8, 5, 0, 0, TAU);
		ctx.fill();
		ctx.restore();
	}
	ctx.fillStyle = COLOR.magenta;
	circlePath(ctx, 0, 0, open ? 6 : 5);
	ctx.fill();
	ctx.restore();
}

/** The vine tying the ball: a green rope through the given points. */
export function drawVine(ctx: CanvasRenderingContext2D, points: readonly { x: number; y: number }[], alpha: number): void {
	if (points.length < 2)
		return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const [w, c] of [[7, "#2E7010"], [4, "#5FCB2B"]] as const) {
		ctx.strokeStyle = c;
		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++)
			ctx.lineTo(points[i].x, points[i].y);
		ctx.stroke();
	}
	ctx.restore();
}

/** One gust of the whirlwind, pointing along +x. */
export function drawGust(ctx: CanvasRenderingContext2D): void {
	ctx.strokeStyle = "#52D6B0";
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-26, 0);
	ctx.bezierCurveTo(-12, -10, 4, 10, 22, 0);
	ctx.stroke();
	ctx.globalAlpha *= 0.5;
	ctx.beginPath();
	ctx.moveTo(-18, 7);
	ctx.bezierCurveTo(-6, 0, 6, 14, 14, 8);
	ctx.stroke();
}
