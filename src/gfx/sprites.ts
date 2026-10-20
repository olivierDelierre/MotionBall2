/**
 * Everything in a room, drawn with canvas paths in the style of the design:
 * glowing orbs, a green bumper ring, the magenta gear, violet blocks and
 * translucent holes. Every function draws centred on (x, y) in room pixels,
 * and takes the time it needs for idle animations (it never reads a clock),
 * so it can be reused by the menus and tested without a browser.
 */

import { TILE, TILE_ORIGIN } from "../config.js";
import { COLOR, BALL_PALETTE, TAU, circlePath, roundedRect, sphere, halo, dropShadow, lighten, drawSphere } from "./theme.js";

// ----- orbs -----

/** Visual radius of a red / blue orb. */
export const ORB_RADIUS = 12;

/**
 * A red orb (take them all to open the doors) or a blue one (adds time).
 * `leave` goes 0 -> 1 while it is being taken.
 */
export function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "red" | "blue", time: number, leave = 0): void {
	const s = 1 + leave * 0.9;
	const alpha = 1 - leave;
	if (alpha <= 0)
		return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	const red = kind === "red";
	const stops: [string, string, string] = red ? ["#FFB3BB", "#FF4D5E", "#C81E3A"] : ["#D9F7FF", "#4DE1FF", "#1E8FD6"];
	halo(ctx, x, y, ORB_RADIUS * 2.2 * s, red ? "rgba(255,77,94,0.55)" : "rgba(77,225,255,0.55)");
	if (!red) {
		// the pulse of the time orbs
		const p = (time % 2.2) / 2.2;
		const k = Math.sin(p * Math.PI);
		ctx.save();
		ctx.strokeStyle = COLOR.cyan;
		ctx.lineWidth = 2;
		ctx.globalAlpha *= 0.55 - 0.45 * k;
		circlePath(ctx, x, y, ORB_RADIUS * (1.6 + 0.5 * k));
		ctx.stroke();
		ctx.restore();
	}
	drawSphere(ctx, x, y, ORB_RADIUS * s, stops);
	ctx.restore();
}

// ----- bumpers -----

/** The normal bumper: a green ring, a dark well and a violet core. `hit` goes 1 -> 0 after a hit. */
export function drawBumper(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hit = 0): void {
	const s = 1 + 0.16 * hit;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(s, s);
	halo(ctx, 0, 0, r * 1.7, "rgba(95,203,43,0.45)", 0.5 + 0.5 * hit);
	const g = ctx.createLinearGradient(-r, -r, r, r);
	g.addColorStop(0, "#D2FF8F");
	g.addColorStop(1, "#34D399");
	ctx.fillStyle = g;
	circlePath(ctx, 0, 0, r);
	ctx.fill();
	ctx.fillStyle = "#1A1240";
	circlePath(ctx, 0, 0, r * 0.68);
	ctx.fill();
	// the inner shadow of the well
	const well = ctx.createLinearGradient(0, -r * 0.68, 0, r * 0.68);
	well.addColorStop(0, "rgba(0,0,0,0.5)");
	well.addColorStop(0.35, "rgba(0,0,0,0)");
	ctx.fillStyle = well;
	circlePath(ctx, 0, 0, r * 0.68);
	ctx.fill();
	const core = r * 0.36;
	halo(ctx, 0, 0, core * 2.4, "rgba(124,58,237,0.8)", 0.6 + 0.4 * hit);
	drawSphere(ctx, 0, 0, core, ["#D5C2FF", "#7C3AED", "#3B1A8A"]);
	ctx.restore();
}

/** The clock bumper: a cyan ring around a clock face. `minute` / `hour` are angles (radians). */
export function drawClockBumper(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hour: number, minute: number, hit = 0): void {
	const s = 1 + 0.12 * hit;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(s, s);
	halo(ctx, 0, 0, r * 1.6, "rgba(77,225,255,0.5)", 0.5 + 0.5 * hit);
	const g = ctx.createLinearGradient(-r, -r, r, r);
	g.addColorStop(0, "#B8F4FF");
	g.addColorStop(1, "#2BB6E8");
	ctx.fillStyle = g;
	circlePath(ctx, 0, 0, r);
	ctx.fill();
	ctx.fillStyle = "#FFFFFF";
	circlePath(ctx, 0, 0, r * 0.8);
	ctx.fill();
	ctx.strokeStyle = "rgba(30,21,69,0.35)";
	ctx.lineWidth = 1.5;
	ctx.lineCap = "round";
	for (let i = 0; i < 12; i++) {
		const a = i * TAU / 12;
		const r0 = r * (i % 3 === 0 ? 0.58 : 0.67);
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
		ctx.lineTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74);
		ctx.stroke();
	}
	ctx.strokeStyle = COLOR.ink;
	ctx.lineWidth = 3;
	hand(ctx, hour, r * 0.38);
	ctx.lineWidth = 2;
	hand(ctx, minute, r * 0.58);
	ctx.fillStyle = COLOR.magenta;
	circlePath(ctx, 0, 0, 3);
	ctx.fill();
	ctx.restore();
}

function hand(ctx: CanvasRenderingContext2D, angle: number, length: number): void {
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length);
	ctx.stroke();
}

/** The gear of the death bumper: magenta teeth, dark well, red core. */
export function drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number): void {
	ctx.save();
	ctx.translate(x, y);
	const k = size / 64;
	ctx.scale(k, k);
	halo(ctx, 0, 0, 52, "rgba(255,46,126,0.5)");
	ctx.rotate(angle);
	ctx.fillStyle = COLOR.magenta;
	for (let i = 0; i < 8; i++) {
		ctx.save();
		ctx.rotate(i * TAU / 8);
		roundedRect(ctx, -5, -31, 10, 14, 3);
		ctx.fill();
		ctx.restore();
	}
	circlePath(ctx, 0, 0, 22);
	ctx.fill();
	ctx.fillStyle = "#2A0B2E";
	circlePath(ctx, 0, 0, 14);
	ctx.fill();
	ctx.fillStyle = COLOR.red;
	circlePath(ctx, 0, 0, 7);
	ctx.fill();
	ctx.restore();
}

/** The magnet: a ring that pulls inwards (attracting) or pushes outwards. */
export function drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, attracting: boolean, time: number, hit = 0): void {
	const main = attracting ? COLOR.violet : COLOR.red;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(1 + 0.12 * hit, 1 + 0.12 * hit);
	halo(ctx, 0, 0, r * 1.8, attracting ? "rgba(124,58,237,0.5)" : "rgba(255,77,94,0.5)");
	// waves going in or out
	ctx.strokeStyle = main;
	ctx.lineWidth = 2;
	for (let i = 0; i < 2; i++) {
		const p = ((time * 0.8 + i / 2) % 1);
		const k = attracting ? 1 - p : p;
		ctx.globalAlpha = 0.5 * Math.sin(p * Math.PI);
		circlePath(ctx, 0, 0, r * (1.0 + 0.9 * k));
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
	ctx.fillStyle = sphere(ctx, 0, 0, r, attracting ? ["#D5C2FF", "#7C3AED", "#3B1A8A"] : ["#FFB3BB", "#FF4D5E", "#A5122E"]);
	circlePath(ctx, 0, 0, r);
	ctx.fill();
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-r * 0.4, 0);
	ctx.lineTo(r * 0.4, 0);
	if (attracting) {
		ctx.moveTo(0, -r * 0.4);
		ctx.lineTo(0, r * 0.4);
	}
	ctx.stroke();
	ctx.restore();
}

/** The invisible bumper, as faint as `alpha`. */
export function drawGhostBumper(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, hit = 0): void {
	if (alpha <= 0)
		return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.translate(x, y);
	ctx.scale(1 + 0.1 * hit, 1 + 0.1 * hit);
	ctx.fillStyle = "rgba(124,58,237,0.25)";
	circlePath(ctx, 0, 0, r);
	ctx.fill();
	ctx.strokeStyle = COLOR.violet;
	ctx.lineWidth = 2.5;
	ctx.setLineDash([5, 5]);
	circlePath(ctx, 0, 0, r - 1.5);
	ctx.stroke();
	ctx.restore();
}

// ----- blocks -----

const BLOCK_RADIUS = 11;

/** Colours of a solid block: gradient ends and edge. */
export interface BlockPalette { light: string; dark: string; edge: string }
export const VIOLET_BLOCK: BlockPalette = { light: COLOR.wallLight, dark: COLOR.wallDark, edge: COLOR.wallEdge };
export const PINK_BLOCK: BlockPalette = { light: "#FF9CC4", dark: "#E0307A", edge: "#9C1456" };
export const BLUE_BLOCK: BlockPalette = { light: "#9CDCFF", dark: "#2F8FE0", edge: "#1A5CA0" };

/**
 * A block of the 40 x 40 grid. `neighbours` says which sides touch another
 * block (1 left, 2 up, 4 right, 8 down): those sides stay open so that a
 * group reads as one shape, and only outer corners are rounded.
 */
export function drawBlock(ctx: CanvasRenderingContext2D, left: number, top: number, neighbours: number, palette: BlockPalette = VIOLET_BLOCK): void {
	const l = !!(neighbours & 1), u = !!(neighbours & 2), r = !!(neighbours & 4), d = !!(neighbours & 8);
	const R = BLOCK_RADIUS;
	const radii: [number, number, number, number] = [l || u ? 0 : R, u || r ? 0 : R, r || d ? 0 : R, d || l ? 0 : R];
	const g = ctx.createLinearGradient(left, top, left + TILE, top + TILE);
	g.addColorStop(0, palette.light);
	g.addColorStop(1, palette.dark);
	ctx.fillStyle = g;
	// (1 px of overlap toward neighbours hides the seams)
	roundedRect(ctx, left - (l ? 1 : 0), top - (u ? 1 : 0), TILE + (l ? 1 : 0) + (r ? 1 : 0), TILE + (u ? 1 : 0) + (d ? 1 : 0), radii);
	ctx.fill();

	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.strokeStyle = palette.edge;
	const x0 = left + 1, y0 = top + 1, x1 = left + TILE - 1, y1 = top + TILE - 1;
	const line = (ax: number, ay: number, bx: number, by: number) => {
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
	};
	const arc = (cx: number, cy: number, from: number) => {
		ctx.beginPath();
		ctx.arc(cx, cy, R - 1, from, from + Math.PI / 2);
		ctx.stroke();
	};
	if (!u) line(x0 + (radii[0] ? R - 1 : 0), y0, x1 - (radii[1] ? R - 1 : 0), y0);
	if (!d) line(x0 + (radii[3] ? R - 1 : 0), y1, x1 - (radii[2] ? R - 1 : 0), y1);
	if (!l) line(x0, y0 + (radii[0] ? R - 1 : 0), x0, y1 - (radii[3] ? R - 1 : 0));
	if (!r) line(x1, y0 + (radii[1] ? R - 1 : 0), x1, y1 - (radii[2] ? R - 1 : 0));
	if (radii[0]) arc(x0 + R - 1, y0 + R - 1, Math.PI);
	if (radii[1]) arc(x1 - R + 1, y0 + R - 1, -Math.PI / 2);
	if (radii[2]) arc(x1 - R + 1, y1 - R + 1, 0);
	if (radii[3]) arc(x0 + R - 1, y1 - R + 1, Math.PI / 2);

	// the light on the upper edge
	if (!u) {
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		line(x0 + (radii[0] ? R : 3), y0 + 2, x1 - (radii[1] ? R : 3), y0 + 2);
	}
}

/** A block that is lowered into the floor: only its outline, tinted. */
export function drawLoweredBlock(ctx: CanvasRenderingContext2D, left: number, top: number, palette: BlockPalette): void {
	ctx.save();
	ctx.fillStyle = palette.dark;
	ctx.globalAlpha = 0.22;
	roundedRect(ctx, left + 2, top + 2, TILE - 4, TILE - 4, 9);
	ctx.fill();
	ctx.globalAlpha = 0.7;
	ctx.strokeStyle = palette.dark;
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 4]);
	ctx.stroke();
	ctx.restore();
}

/** The soft shadow of a group of blocks. */
export function blockShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
	ctx.fillStyle = "rgba(60,40,140,0.25)";
	roundedRect(ctx, x + 2, y + 6, w, h, 12);
	ctx.fill();
}

/** The switch of the pink / blue blocks. */
export function drawSwitch(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, press: number): void {
	const color = on ? PINK_BLOCK : BLUE_BLOCK;
	ctx.save();
	ctx.translate(x, y);
	dropShadow(ctx, 2, 5, 22, 18);
	ctx.fillStyle = "#2A1B6B";
	circlePath(ctx, 0, 0, 19);
	ctx.fill();
	ctx.strokeStyle = COLOR.wallEdge;
	ctx.lineWidth = 2;
	ctx.stroke();
	const down = press * 2;
	halo(ctx, 0, 0, 30, on ? "rgba(255,46,126,0.5)" : "rgba(77,163,255,0.5)", 0.7);
	ctx.fillStyle = sphere(ctx, 0, down, 13, [color.light, color.dark, color.edge]);
	circlePath(ctx, 0, down, 13 - press);
	ctx.fill();
	ctx.restore();
}

// ----- holes -----

export interface HoleTile { tx: number; ty: number }

/** The holes: translucent hollows, the floor stays visible. Adjacent holes merge. */
export function drawHoles(ctx: CanvasRenderingContext2D, holes: HoleTile[]): void {
	if (!holes.length)
		return;
	const has = (tx: number, ty: number) => holes.some(h => h.tx === tx && h.ty === ty);
	const R = 16;
	ctx.save();
	ctx.beginPath();
	for (const h of holes) {
		const l = has(h.tx - 1, h.ty), u = has(h.tx, h.ty - 1), r = has(h.tx + 1, h.ty), d = has(h.tx, h.ty + 1);
		addRoundedRect(ctx, TILE_ORIGIN + h.tx * TILE - (l ? 0.5 : 0), TILE_ORIGIN + h.ty * TILE - (u ? 0.5 : 0),
			TILE + (l ? 0.5 : 0) + (r ? 0.5 : 0), TILE + (u ? 0.5 : 0) + (d ? 0.5 : 0),
			[l || u ? 0 : R, u || r ? 0 : R, r || d ? 0 : R, d || l ? 0 : R]);
	}
	ctx.fillStyle = "rgba(70,40,150,0.32)";
	ctx.fill();
	ctx.clip();
	// the inner shadow, along the upper and side edges
	for (const h of holes) {
		const x = TILE_ORIGIN + h.tx * TILE, y = TILE_ORIGIN + h.ty * TILE;
		if (!has(h.tx, h.ty - 1)) {
			const g = ctx.createLinearGradient(0, y, 0, y + 16);
			g.addColorStop(0, "rgba(50,25,120,0.4)");
			g.addColorStop(1, "rgba(50,25,120,0)");
			ctx.fillStyle = g;
			ctx.fillRect(x, y, TILE, 16);
		}
		if (!has(h.tx - 1, h.ty)) {
			const g = ctx.createLinearGradient(x, 0, x + 10, 0);
			g.addColorStop(0, "rgba(50,25,120,0.25)");
			g.addColorStop(1, "rgba(50,25,120,0)");
			ctx.fillStyle = g;
			ctx.fillRect(x, y, 10, TILE);
		}
		if (!has(h.tx + 1, h.ty)) {
			const g = ctx.createLinearGradient(x + TILE, 0, x + TILE - 10, 0);
			g.addColorStop(0, "rgba(50,25,120,0.25)");
			g.addColorStop(1, "rgba(50,25,120,0)");
			ctx.fillStyle = g;
			ctx.fillRect(x + TILE - 10, y, 10, TILE);
		}
	}
	ctx.restore();
	// the lower lip catches the light
	ctx.save();
	ctx.strokeStyle = "rgba(255,255,255,0.35)";
	ctx.lineWidth = 1;
	for (const h of holes) {
		if (has(h.tx, h.ty + 1))
			continue;
		const x = TILE_ORIGIN + h.tx * TILE, y = TILE_ORIGIN + (h.ty + 1) * TILE + 0.5;
		ctx.beginPath();
		ctx.moveTo(x + (has(h.tx - 1, h.ty) ? 0 : R), y);
		ctx.lineTo(x + TILE - (has(h.tx + 1, h.ty) ? 0 : R), y);
		ctx.stroke();
	}
	ctx.restore();
}

/** Like roundedRect but without starting a new path (to build one shape from several). */
export function addRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: [number, number, number, number]): void {
	const [tl, tr, br, bl] = r;
	ctx.moveTo(x + tl, y);
	ctx.lineTo(x + w - tr, y);
	if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr);
	ctx.lineTo(x + w, y + h - br);
	if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
	ctx.lineTo(x + bl, y + h);
	if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl);
	ctx.lineTo(x, y + tl);
	if (tl) ctx.arcTo(x, y, x + tl, y, tl);
	ctx.closePath();
}

// ----- zappers, teleports, hatch -----

/** A laser post of the colour of the ball that can cross its beams (or a white checkpoint). */
export function drawZapper(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number, checkpoint: boolean, time: number): void {
	const [main, dark, light] = checkpoint ? ["#FFFFFF", "#8F82C9", "#FFFFFF"] : BALL_PALETTE[phase];
	ctx.save();
	ctx.translate(x, y);
	halo(ctx, 0, 0, 30, main, 0.35 + 0.15 * Math.sin(time * 5));
	ctx.fillStyle = "#2A1B6B";
	circlePath(ctx, 0, 0, 15);
	ctx.fill();
	ctx.strokeStyle = main;
	ctx.lineWidth = 3;
	ctx.stroke();
	drawSphere(ctx, 0, 0, 7, [light, main, dark]);
	ctx.restore();
}

/** One end of a teleport: violet rings turning around a bright centre. */
export function drawTeleportBase(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
	halo(ctx, x, y, 34, "rgba(124,58,237,0.55)");
	ctx.fillStyle = "rgba(26,18,64,0.85)";
	circlePath(ctx, x, y, 16 + Math.sin(time * 3) * 1.5);
	ctx.fill();
	ctx.strokeStyle = COLOR.violet;
	ctx.lineWidth = 2;
	ctx.stroke();
}

/** A ring of a teleport (already transformed by the caller). */
export function drawTeleportRing(ctx: CanvasRenderingContext2D, index: number): void {
	ctx.strokeStyle = index % 2 ? COLOR.cyan : "#D5C2FF";
	ctx.lineWidth = 1.5;
	ctx.globalAlpha *= 0.85;
	ctx.beginPath();
	ctx.ellipse(0, 0, 14, 6, 0, 0, TAU);
	ctx.stroke();
}

/** The hatch of the Classique rooms: `open` goes 0 -> 1. */
export function drawHatch(ctx: CanvasRenderingContext2D, x: number, y: number, open: number, time: number): void {
	ctx.save();
	ctx.translate(x, y);
	const color = open >= 1 ? COLOR.green : COLOR.magenta;
	halo(ctx, 0, 0, 36, open >= 1 ? "rgba(95,203,43,0.5)" : "rgba(255,46,126,0.35)", 0.6 + 0.2 * Math.sin(time * 4));
	ctx.fillStyle = "#1A1240";
	circlePath(ctx, 0, 0, 18);
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 3;
	ctx.stroke();
	// the lid slides away
	ctx.save();
	circlePath(ctx, 0, 0, 16);
	ctx.clip();
	ctx.fillStyle = "#6B4BDB";
	ctx.fillRect(-16 - open * 32, -16, 32, 32);
	ctx.fillRect(16 - 16 + open * 0, -16, 0, 0);
	ctx.restore();
	ctx.restore();
}

// ----- pickups -----

/** A ball waiting to be found: it floats inside a glowing ring. `leave` goes 0 -> 1 when taken. */
export function drawBallBox(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, time: number, leave = 0): void {
	const alpha = 1 - leave;
	if (alpha <= 0)
		return;
	const [main, dark, light] = BALL_PALETTE[type];
	ctx.save();
	ctx.globalAlpha *= alpha;
	const bob = Math.sin(time * 3) * 2;
	halo(ctx, x, y, 40 + leave * 30, main, 0.4);
	ctx.strokeStyle = main;
	ctx.lineWidth = 2;
	ctx.setLineDash([6, 5]);
	ctx.lineDashOffset = -time * 14;
	circlePath(ctx, x, y, 21 + leave * 14);
	ctx.stroke();
	ctx.setLineDash([]);
	dropShadow(ctx, x + 2, y + 12, 10, 4);
	drawSphere(ctx, x, y + bob, 11, [light, main, dark]);
	ctx.restore();
}

/** The icons of the item boxes (Icon enum): map, radar, small time, big time, key. */
export function drawItemIcon(ctx: CanvasRenderingContext2D, icon: number, x: number, y: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.lineWidth = 2.5;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.strokeStyle = COLOR.ink;
	ctx.fillStyle = COLOR.ink;
	switch (icon) {
	case 0: // map
		ctx.beginPath();
		ctx.moveTo(-10, -7); ctx.lineTo(-4, -10); ctx.lineTo(4, -7); ctx.lineTo(10, -10);
		ctx.lineTo(10, 7); ctx.lineTo(4, 10); ctx.lineTo(-4, 7); ctx.lineTo(-10, 10); ctx.closePath();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-4, -10); ctx.lineTo(-4, 7);
		ctx.moveTo(4, -7); ctx.lineTo(4, 10);
		ctx.stroke();
		break;
	case 1: // radar
		circlePath(ctx, 0, 0, 10);
		ctx.stroke();
		circlePath(ctx, 0, 0, 5);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, 0); ctx.lineTo(8, -7);
		ctx.stroke();
		ctx.fillStyle = COLOR.green;
		circlePath(ctx, 5, 3, 2);
		ctx.fill();
		break;
	case 2:
	case 3: // time
		ctx.strokeStyle = COLOR.cyanInk;
		circlePath(ctx, 0, 1, 9);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, 1); ctx.lineTo(0, -4);
		ctx.moveTo(0, 1); ctx.lineTo(4, 3);
		ctx.stroke();
		ctx.fillStyle = COLOR.cyanInk;
		ctx.font = `800 9px ${"'Outfit Variable', system-ui, sans-serif"}`;
		ctx.textAlign = "center";
		ctx.fillText(icon === 2 ? "+1" : "+3", 8, -9);
		break;
	default: // key
		ctx.strokeStyle = COLOR.amberInk;
		circlePath(ctx, -5, -3, 5);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-1, 1); ctx.lineTo(9, 11);
		ctx.moveTo(5, 7); ctx.lineTo(8, 4);
		ctx.stroke();
	}
	ctx.restore();
}

/** An item box: a white card with an icon. `burst` goes 0 -> 1 when opened. */
export function drawItemBox(ctx: CanvasRenderingContext2D, x: number, y: number, icon: number, time: number, burst = 0): void {
	const alpha = 1 - burst;
	if (alpha <= 0)
		return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.translate(x, y + Math.sin(time * 2.5) * 1.5);
	const s = 1 + burst * 0.8;
	ctx.scale(s, s);
	dropShadow(ctx, 2, 18, 22, 7);
	halo(ctx, 0, 0, 46, "rgba(255,176,32,0.5)", 0.7);
	roundedRect(ctx, -20, -20, 40, 40, 11);
	ctx.fillStyle = "#FFFFFF";
	ctx.fill();
	ctx.strokeStyle = COLOR.amber;
	ctx.lineWidth = 2.5;
	ctx.stroke();
	drawItemIcon(ctx, icon, 0, 0);
	ctx.restore();
}

// ----- effects -----

/** The little burst where the ball hits something. `t` goes 0 -> 1. */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
	ctx.save();
	ctx.globalAlpha *= 1 - t;
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 2.5 * (1 - t) + 0.5;
	ctx.lineCap = "round";
	for (let i = 0; i < 6; i++) {
		const a = i * TAU / 6 + 0.4;
		ctx.beginPath();
		ctx.moveTo(x + Math.cos(a) * (3 + t * 6), y + Math.sin(a) * (3 + t * 6));
		ctx.lineTo(x + Math.cos(a) * (6 + t * 14), y + Math.sin(a) * (6 + t * 14));
		ctx.stroke();
	}
	ctx.strokeStyle = COLOR.cyan;
	ctx.lineWidth = 1.5;
	circlePath(ctx, x, y, 4 + t * 12);
	ctx.stroke();
	ctx.restore();
}

/** A piece of a broken block. */
export function drawDebris(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, scale: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	roundedRect(ctx, -6, -6, 12, 12, 3);
	ctx.fillStyle = COLOR.wallDark;
	ctx.fill();
	ctx.strokeStyle = COLOR.wallEdge;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();
}

/** The bright line left by a laser beam that killed the ball. */
export function drawBeamFlash(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string, t: number): void {
	ctx.save();
	ctx.globalAlpha *= 1 - t;
	ctx.lineCap = "round";
	ctx.strokeStyle = color;
	ctx.lineWidth = 12 * (1 - t) + 2;
	ctx.save();
	ctx.globalAlpha *= 0.4;
	ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
	ctx.restore();
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 3 * (1 - t) + 1;
	ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
	ctx.restore();
}

/** A laser beam between two posts. */
export function drawBeam(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string, time: number): void {
	ctx.save();
	ctx.lineCap = "round";
	ctx.strokeStyle = color;
	ctx.globalAlpha = 0.18;
	ctx.lineWidth = 8;
	ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
	ctx.globalAlpha = 0.5 + 0.15 * Math.sin(time * 40);
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 6]);
	ctx.lineDashOffset = -time * 14;
	ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
	ctx.restore();
}

// ----- the ball -----

/** Visual radius of the ball (the collision radius is a little smaller). */
export const BALL_VISUAL_RADIUS = 10.5;

/**
 * A ball centred on (x, y): a glossy sphere in the colour of its type, with
 * a halo. `trail` is a list of recent positions, newest first.
 */
export function drawBallSprite(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, scale = 1,
	trail: readonly { x: number; y: number }[] = []): void {
	const [main, dark, light] = BALL_PALETTE[type];
	const r = BALL_VISUAL_RADIUS * scale;
	// the speed trail: three fading discs, smaller and fainter the older they are
	for (let i = trail.length - 1; i >= 0; i--) {
		const p = trail[i];
		const k = 1 - (i + 1) / (trail.length + 1);
		ctx.save();
		ctx.globalAlpha *= 0.4 * k;
		ctx.fillStyle = main;
		circlePath(ctx, p.x, p.y, r * (0.45 + 0.4 * k));
		ctx.fill();
		ctx.restore();
	}
	halo(ctx, x, y, r * 2.4, type === 5 ? "rgba(184,191,208,0.6)" : main, 0.55);
	drawSphere(ctx, x, y, r, [light, main, dark]);
	// the specular spot
	ctx.fillStyle = "rgba(255,255,255,0.65)";
	ctx.beginPath();
	ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.18, -0.6, 0, TAU);
	ctx.fill();
}

/** The soft shadow of the ball (offset toward the lower right). */
export function drawBallShadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
	dropShadow(ctx, x + 3, y + 5 + 2 * scale, BALL_VISUAL_RADIUS * 1.1 * scale, BALL_VISUAL_RADIUS * 0.6 * scale, 0.4);
}

export { lighten };
