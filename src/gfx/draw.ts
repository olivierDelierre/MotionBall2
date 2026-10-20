/**
 * Small drawing helpers: text and rounded shapes.
 */

import { FONT } from "./theme.js";

export { FONT };

/** Starts a new path with a circle. */
export function circle(ctx, x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

/** Starts a new path with a rounded rectangle. */
export function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	roundRectPath(ctx, x, y, w, h, r);
	ctx.closePath();
}

/** Adds a rounded rectangle (with soft, quadratic corners) to the current path. */
export function roundRectPath(ctx, x, y, w, h, r) {
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
}

/**
 * Draws a text centred on (x, y) ; "\n" makes several lines.
 * options : { size, color, outline, align, weight, baseline }
 */
export function text(ctx, str, x, y, options: any = {}) {
	const size = options.size || 16;
	ctx.font = (options.weight || "700") + " " + size + "px " + FONT;
	ctx.textAlign = options.align || "center";
	ctx.textBaseline = options.baseline || "middle";

	const lines = String(str).split("\n");
	const lineHeight = size * 1.15;
	let yy = y - (lines.length - 1) * lineHeight / 2;
	for (const line of lines) {
		if (options.outline) {
			ctx.lineJoin = "round";
			ctx.lineWidth = options.outlineWidth || Math.max(2, size / 5);
			ctx.strokeStyle = options.outline;
			ctx.strokeText(line, x, yy);
		}
		ctx.fillStyle = options.color || "#1E1545";
		ctx.fillText(line, x, yy);
		yy += lineHeight;
	}
}
