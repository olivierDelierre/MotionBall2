/**
 * The canvas : keeps it as large as the window allows (keeping the aspect
 * ratio of the game), sharp on high density screens, and converts pointer
 * positions to game coordinates.
 *
 * All the drawing code works in game coordinates (WIDTH x HEIGHT) : call
 * `begin()` at the start of each frame to set the matching transform.
 */

import { WIDTH, VIEW_HEIGHT as HEIGHT } from "../config.js";
import { view } from "../gfx/theme.js";

/** Largest canvas, in pixels: bigger screens are drawn smaller and scaled up by the browser. */
const MAX_PIXELS = 1_600_000;

export class Screen {
	declare canvas: any;
	declare ctx: any;
	declare scale: number;
	declare pixelRatio: number;
	/** 0.5 .. 1: lowered when the device cannot keep up (see `lowerQuality`) */
	declare quality: number;
	declare pending: number;

	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.scale = 1;
		this.pixelRatio = 1;
		this.quality = 1;
		this.pending = 0;
		this.resize = this.resize.bind(this);
		// (phones fire many resize events while the browser bars move: handle them once per frame)
		window.addEventListener("resize", () => {
			if (!this.pending)
				this.pending = requestAnimationFrame(() => {
					this.pending = 0;
					this.resize();
				});
		});
		this.resize();
	}

	resize() {
		const parent = this.canvas.parentElement;
		const reserved = parseFloat(getComputedStyle(this.canvas).getPropertyValue("--reserved-height")) || 0;
		const availableW = parent.clientWidth;
		const availableH = window.innerHeight - reserved;
		const scale = Math.max(0.3, Math.min(availableW / WIDTH, availableH / HEIGHT));
		const cssW = Math.floor(WIDTH * scale), cssH = Math.floor(HEIGHT * scale);

		// the backing store: the device resolution, up to 1.5x, never more than MAX_PIXELS
		let ratio = Math.min(1.5, window.devicePixelRatio || 1) * this.quality;
		ratio = Math.min(ratio, Math.sqrt(MAX_PIXELS / (cssW * cssH)));
		const w = Math.max(1, Math.floor(cssW * ratio)), h = Math.max(1, Math.floor(cssH * ratio));

		this.scale = scale;
		this.pixelRatio = ratio;
		// (resizing a canvas reallocates it: only when something really changed)
		if (this.canvas.style.width !== cssW + "px")
			this.canvas.style.width = cssW + "px";
		if (this.canvas.style.height !== cssH + "px")
			this.canvas.style.height = cssH + "px";
		if (this.canvas.width !== w)
			this.canvas.width = w;
		if (this.canvas.height !== h)
			this.canvas.height = h;
	}

	/** Draws fewer pixels (the browser scales the canvas up): used when frames take too long. */
	lowerQuality(): boolean {
		if (this.quality <= 0.55)
			return false;
		this.quality = Math.max(0.5, this.quality * 0.85);
		this.resize();
		return true;
	}

	/** Resets the context for a new frame, in game coordinates. */
	begin() {
		const ctx = this.ctx;
		ctx.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / HEIGHT, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
		view.scale = this.canvas.width / WIDTH;
		return ctx;
	}

	/** Number of device pixels per game pixel (to render sprites at the right resolution). */
	get resolution() {
		return this.canvas.width / WIDTH;
	}

	/** Converts a pointer event position to game coordinates. */
	toGame(clientX, clientY) {
		const r = this.canvas.getBoundingClientRect();
		return {
			x: (clientX - r.left) * WIDTH / r.width,
			y: (clientY - r.top) * HEIGHT / r.height
		};
	}
}
