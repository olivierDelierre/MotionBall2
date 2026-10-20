/**
 * The look of the game: palette, font, and the small drawing primitives
 * (glows, gradients, rounded shapes) shared by every sprite and screen.
 *
 * The palette comes from the "Refonte graphique" design: a light lavender
 * backdrop, a violet floor, and one vivid colour per function (green for the
 * player, red for the goals, cyan for time, magenta for danger).
 */

export const FONT = "'Outfit Variable', 'Outfit', system-ui, sans-serif";

export const COLOR = {
	ink: "#1E1545",
	muted: "#5B4F94",
	backdrop: "#EFE9FF",
	backdropLight: "#FFFFFF",
	card: "#F3EEFF",

	violet: "#7C3AED",
	green: "#5FCB2B",
	cyan: "#4DE1FF",
	cyanInk: "#07698F",
	red: "#FF4D5E",
	magenta: "#FF2E7E",
	amber: "#FFB020",
	amberInk: "#B45309",

	wallLight: "#A48CFF",
	wallDark: "#6B4BDB",
	wallEdge: "#4B2FB5",
	floorLight: "#C6B6F3",
	floorDark: "#AD99E6",
	roomOn: "#5B45C8"
} as const;

/** Main, dark and light colour of each ball (indexed by BallType). */
export const BALL_PALETTE: readonly [string, string, string][] = [
	["#FFC21E", "#C98A00", "#FFF3C2"],   // yellow
	["#5FCB2B", "#3A8F14", "#E3FFC7"],   // green
	["#FF4D5E", "#C81E3A", "#FFD0D5"],   // red
	["#FF8A1A", "#C25200", "#FFE0BF"],   // orange
	["#3A8DFF", "#1E58C9", "#CFE4FF"],   // blue
	["#B8BFD0", "#6B7388", "#FFFFFF"],   // metal
	["#A64DFF", "#6A1FC2", "#EBD3FF"]    // violet
];

export const TAU = Math.PI * 2;

/** Starts a new path with a circle. */
export function circlePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	ctx.beginPath();
	ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

/** Starts a new path with a rounded rectangle (one radius, or one per corner: tl, tr, br, bl). */
export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
	r: number | [number, number, number, number]): void {
	const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
	ctx.beginPath();
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

/** A sphere-like radial gradient lit from the upper left. */
export function sphere(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [string, string, string]): CanvasGradient {
	const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.05, x, y, r);
	g.addColorStop(0, stops[0]);
	g.addColorStop(0.55, stops[1]);
	g.addColorStop(1, stops[2]);
	return g;
}

const haloCache = new Map<string, HTMLCanvasElement>();

/**
 * A soft coloured halo around a point. The gradient is painted once per
 * colour, size and resolution, then copied: much cheaper than building a
 * gradient for each of the dozens of halos of a frame.
 */
export function halo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
	if (alpha <= 0)
		return;
	const scale = ctx.getTransform?.()?.a || 1;
	const rr = Math.max(1, Math.round(r / 2) * 2);
	const key = color + "|" + rr + "|" + scale.toFixed(2);
	let sprite = haloCache.get(key);
	if (!sprite) {
		sprite = document.createElement("canvas");
		const size = Math.ceil(rr * 2 * scale);
		sprite.width = size;
		sprite.height = size;
		const c = sprite.getContext("2d");
		if (c) {
			const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
			g.addColorStop(0, color);
			g.addColorStop(1, "rgba(255,255,255,0)");
			c.fillStyle = g;
			c.fillRect(0, 0, size, size);
		}
		haloCache.set(key, sprite);
	}
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** A soft elliptical drop shadow under an object. */
export function dropShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry = rx, alpha = 0.28): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(1, ry / rx);
	const g = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
	g.addColorStop(0, `rgba(60,40,140,${alpha})`);
	g.addColorStop(1, "rgba(60,40,140,0)");
	ctx.fillStyle = g;
	circlePath(ctx, 0, 0, rx);
	ctx.fill();
	ctx.restore();
}

/** Mixes a colour with white (amount 0..1). Works on #rrggbb. */
export function lighten(hex: string, amount: number): string {
	const n = parseInt(hex.slice(1), 16);
	const mix = (c: number) => Math.round(c + (255 - c) * amount);
	return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
