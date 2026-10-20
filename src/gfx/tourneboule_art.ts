/** Tourneboule, the final boss: a spinning ball with a ring, a face and a shield. */

import { COLOR, TAU, circlePath, halo, sphere, dropShadow } from "./theme.js";

export interface TBPose {
	spin: number;        // angle of the ring
	lift: number;        // 0 on the floor .. 1 flying
	squash: number;      // 1 = round, <1 squashed (kata anticipation)
	red: number;         // 0..1 hurt
	shield: boolean;
	shieldFlash: number; // 0..1 the shield popping
	death: number;       // 0..1
	time: number;
}

export function drawTBShadow(ctx: CanvasRenderingContext2D, x: number, y: number, lift: number): void {
	dropShadow(ctx, x + 4, y + 28 + lift * 10, 34 - lift * 8, 14 - lift * 4, 0.35);
}

export function drawTourneboule(ctx: CanvasRenderingContext2D, x: number, y: number, p: TBPose): void {
	ctx.save();
	ctx.translate(x, y - p.lift * 22);
	const s = (1 - p.death * 0.9) * (1 + Math.sin(p.time * 3) * 0.015);
	ctx.scale(s * (2 - p.squash), s * p.squash);
	ctx.globalAlpha *= 1 - p.death * 0.6;

	halo(ctx, 0, 0, 62, "rgba(255,46,126,0.4)");
	ctx.fillStyle = sphere(ctx, 0, 0, 31, ["#E8D5FF", "#8A52F0", "#3B1A8A"]);
	circlePath(ctx, 0, 0, 31);
	ctx.fill();

	// the ring turns around it
	ctx.save();
	circlePath(ctx, 0, 0, 31);
	ctx.clip();
	ctx.rotate(p.spin);
	ctx.strokeStyle = COLOR.magenta;
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.ellipse(0, 0, 40, 12, 0, 0, TAU);
	ctx.stroke();
	ctx.strokeStyle = COLOR.amber;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.ellipse(0, 0, 40, 12, 0, 0.3, 2.6);
	ctx.stroke();
	ctx.restore();

	// the face
	ctx.fillStyle = "#FFFFFF";
	for (const sx of [-1, 1]) {
		ctx.beginPath();
		ctx.ellipse(sx * 10, -6, 6, 8, 0, 0, TAU);
		ctx.fill();
	}
	ctx.fillStyle = COLOR.ink;
	for (const sx of [-1, 1]) {
		circlePath(ctx, sx * 10, -4, 3);
		ctx.fill();
	}
	ctx.strokeStyle = COLOR.ink;
	ctx.lineWidth = 2.5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-8, 12);
	ctx.quadraticCurveTo(0, 17, 8, 12);
	ctx.stroke();

	if (p.red > 0) {
		ctx.fillStyle = `rgba(255,46,70,${Math.min(0.7, p.red * 0.7)})`;
		circlePath(ctx, 0, 0, 31);
		ctx.fill();
	}
	if (p.shield) {
		ctx.strokeStyle = "rgba(255,255,255,0.7)";
		ctx.lineWidth = 2;
		circlePath(ctx, 0, 0, 38 + Math.sin(p.time * 4) * 1.5);
		ctx.stroke();
		ctx.fillStyle = "rgba(255,255,255,0.12)";
		ctx.fill();
	}
	if (p.shieldFlash > 0) {
		ctx.strokeStyle = `rgba(255,255,255,${p.shieldFlash})`;
		ctx.lineWidth = 4;
		circlePath(ctx, 0, 0, 38 + (1 - p.shieldFlash) * 30);
		ctx.stroke();
	}
	ctx.restore();
}
