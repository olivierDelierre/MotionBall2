/**
 * The elemental snakes: a head, rings and a tail, each facing left in its
 * own frame (the caller rotates it). Elements: 0 water, 1 fire, 2 wind, 3 earth.
 */

import { COLOR, TAU, circlePath, halo, sphere } from "./theme.js";

/** Light, main and dark colour of each element. */
export const ELEMENT_COLORS: readonly [string, string, string][] = [
	["#B8F0FF", "#3A8DFF", "#1E4FB0"],   // water
	["#FFD08A", "#FF6B2B", "#B3261E"],   // fire
	["#E6FFF4", "#52D6B0", "#1E8F78"],   // wind
	["#E8C08A", "#B8763A", "#6B4220"]    // earth
];

const EYE_COLORS = ["#FF4D5E", "#5FCB2B", "#FFD21E"];

export function drawSnakePart(ctx: CanvasRenderingContext2D, kind: "head" | "ring" | "tail", element: number, eyes: number, bite: number): void {
	const [light, main, dark] = ELEMENT_COLORS[element];
	if (kind === "ring") {
		ctx.fillStyle = sphere(ctx, 0, 0, 26, [light, main, dark]);
		circlePath(ctx, 0, 0, 26);
		ctx.fill();
		ctx.strokeStyle = dark;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,255,255,0.45)";
		ctx.beginPath();
		ctx.arc(0, 0, 17, Math.PI * 1.1, Math.PI * 1.7);
		ctx.stroke();
		return;
	}
	if (kind === "tail") {
		const g = ctx.createLinearGradient(-20, 0, 40, 0);
		g.addColorStop(0, main);
		g.addColorStop(1, dark);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(-18, -14);
		ctx.quadraticCurveTo(14, -12, 44, 0);
		ctx.quadraticCurveTo(14, 12, -18, 14);
		ctx.closePath();
		ctx.fill();
		// the tail kills: warning tip
		ctx.fillStyle = COLOR.magenta;
		circlePath(ctx, 40, 0, 4);
		ctx.fill();
		return;
	}
	// head
	halo(ctx, 0, 0, 56, main, 0.35);
	ctx.fillStyle = sphere(ctx, -4, -6, 38, [light, main, dark]);
	ctx.beginPath();
	ctx.ellipse(0, 0, 38, 31, 0, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = dark;
	ctx.lineWidth = 2;
	ctx.stroke();
	// the mouth opens when it bites
	ctx.fillStyle = "#1A1240";
	ctx.beginPath();
	ctx.ellipse(-30, 0, 5 + bite * 18, 8 + bite * 14, 0, 0, TAU);
	ctx.fill();
	// the eyes: red angry, green calm, yellow berserk
	for (const s of [-1, 1]) {
		ctx.fillStyle = "#FFFFFF";
		circlePath(ctx, -12, s * 14, 8);
		ctx.fill();
		ctx.fillStyle = EYE_COLORS[eyes];
		circlePath(ctx, -14, s * 14, 5);
		ctx.fill();
		ctx.fillStyle = COLOR.ink;
		circlePath(ctx, -15, s * 14, 2.2);
		ctx.fill();
	}
}

/** A scale flying away from a lost ring. */
export function drawScale(ctx: CanvasRenderingContext2D, element: number): void {
	const [light, main, dark] = ELEMENT_COLORS[element];
	ctx.fillStyle = sphere(ctx, 0, 0, 6, [light, main, dark]);
	ctx.beginPath();
	ctx.moveTo(-6, 0); ctx.lineTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8);
	ctx.closePath();
	ctx.fill();
}

/** The emblem of the element on the floor of its boss room. */
export function drawElementLogo(ctx: CanvasRenderingContext2D, x: number, y: number, element: number): void {
	const [, main] = ELEMENT_COLORS[element];
	ctx.save();
	ctx.translate(x, y);
	ctx.globalAlpha *= 0.28;
	ctx.strokeStyle = main;
	ctx.fillStyle = main;
	ctx.lineWidth = 6;
	circlePath(ctx, 0, 0, 92);
	ctx.stroke();
	ctx.lineWidth = 3;
	circlePath(ctx, 0, 0, 78);
	ctx.stroke();
	ctx.lineWidth = 7;
	ctx.lineCap = "round";
	switch (element) {
	case 0: // water: a drop
		ctx.beginPath();
		ctx.moveTo(0, -48);
		ctx.bezierCurveTo(34, -4, 38, 20, 0, 44);
		ctx.bezierCurveTo(-38, 20, -34, -4, 0, -48);
		ctx.fill();
		break;
	case 1: // fire: a flame
		ctx.beginPath();
		ctx.moveTo(0, -52);
		ctx.bezierCurveTo(10, -22, 40, -10, 30, 22);
		ctx.bezierCurveTo(26, 44, -26, 44, -30, 22);
		ctx.bezierCurveTo(-34, 4, -8, -6, 0, -52);
		ctx.fill();
		break;
	case 2: // wind: curls
		for (let i = -1; i <= 1; i++) {
			ctx.beginPath();
			ctx.moveTo(-46, i * 24);
			ctx.bezierCurveTo(-10, i * 24 - 16, 24, i * 24 + 16, 44, i * 24 - 6);
			ctx.stroke();
		}
		break;
	default: // earth: a mountain
		ctx.beginPath();
		ctx.moveTo(-50, 36); ctx.lineTo(-14, -34); ctx.lineTo(8, 4); ctx.lineTo(22, -16); ctx.lineTo(52, 36);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
}
