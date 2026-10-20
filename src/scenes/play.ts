/**
 * The play screen : runs a Game, and shows the pause (with the map) and the
 * end of the game panel over it, with the original symbols : the game tinted
 * and "pause" (Pause.as), "panGameOver" (GameOver.as, GameOverCourse.as).
 */

import { WIDTH as W, VIEW_HEIGHT as H } from "../config.js";
import { Mode } from "../data/enums.js";
import { Game } from "../game/game.js";
import { button, panel, Pop } from "../gfx/ui.js";
import { text, circle } from "../gfx/draw.js";
import { COLOR, BALL_PALETTE, roundedRect, circlePath, sphere } from "../gfx/theme.js";
import { formatTime } from "../engine/math.js";
import { MUSIC_VOLUME } from "../sounds.js";
import { app } from "../app.js";
import { ButtonGroup } from "./widgets.js";
import { drawMap } from "./map_view.js";
import { MenuScene } from "./menu.js";

export class PlayScene {
	declare mode: any;
	declare param: any;
	declare game: any;
	declare paused: any;
	declare ending: any;
	declare time: number;


	constructor(mode, param = 0) {
		this.mode = mode;
		this.param = param;
		this.game = null;
		this.paused = null;      // { group, time }
		this.ending = null;      // { result, lines, pop, time }
		this.time = 0;
	}

	enter() {
		this.game = new Game(this.mode, this.param, {
			onPause: () => this.pause(),
			onEnd: result => this.end(result)
		});
	}

	// ----- pause -----

	pause() {
		if (this.paused || this.ending)
			return;
		const withMap = this.game.inventory.map || this.game.inventory.radar;
		// (for the touch screens and the gamepads : the original only had Escape)
		const y = H - 40;
		const buttons = [
			{ x: W / 2 - 80, y, w: 140, h: 34, action: () => this.resume(),
				draw: (ctx, f) => button(ctx, "Continuer", W / 2 - 80, y, 140, 34, f ? "focus" : "idle") },
			{ x: W / 2 + 80, y, w: 140, h: 34, action: () => this.quit(),
				draw: (ctx, f) => button(ctx, "Abandonner", W / 2 + 80, y, 140, 34, f ? "focus" : "idle") }
		];
		this.paused = { group: new ButtonGroup(buttons, () => this.resume()), withMap, time: 0 };
		if (this.game.boss && this.game.boss.onPause)
			this.game.boss.onPause(true);
	}

	resume() {
		this.paused = null;
		if (this.game.boss && this.game.boss.onPause)
			this.game.boss.onPause(false);
	}

	quit() {
		// (the counters of the achievements)
		app.save.save();
		app.audio.stopLayers(0.5);
		app.audio.playMusic("musicMenu", MUSIC_VOLUME);
		app.scenes.goto(new MenuScene());
	}

	// ----- end of the game -----

	/** Saves the result, and prepares the lines of the end panel. */
	end(result) {
		const save = app.save;
		const win = result.cause === "win";
		const lines = [];
		// (the panel shows "victory" or "game over" ; the heading tells why)
		let heading = win ? "Victoire !" : result.cause === "time" ? "Temps écoulé !" : "Plus de billes !";
		let table = null;
		let courseRank = -1;

		switch (result.mode) {
		case Mode.CHALLENGE:
		case Mode.ADVENTURE: {
			// the explored part of the dungeon, + the seconds left when the boss is beaten
			const score = result.explored + (win ? Math.floor(result.time) : 0);
			lines.push("Donjon exploré : " + result.explored + " %");
			if (win)
				lines.push("Temps restant : " + formatTime(result.time));
			lines.push("Score : " + score);
			const previous = result.mode === Mode.CHALLENGE
				? save.best("challengeBest", score)
				: (win ? save.winAdventure(result.param, score) : save.adventureScore(result.param, score));
			lines.push(score > previous ? "Nouveau record !" : "Record : " + previous);
			if (win && result.mode === Mode.ADVENTURE && result.param < 4 && save.adventureUnlocked(4))
				lines.push("Le donjon final est ouvert !");
			break;
		}
		case Mode.COURSE: {
			if (win) {
				heading = "Arrivée !";
				const r = save.courseTime(result.param, result.time);
				courseRank = r.rank;
				table = r.table;
				lines.push("Temps : " + formatTime(result.time, true));
				lines.push(r.rank < 0 ? "Pas de record..." : "Record battu !");
				if (r.unlockedNext)
					lines.push("Circuit " + (result.param + 2) + " ouvert !");
			}
			break;
		}
		case Mode.CLASSIC: {
			const previous = save.best("classicBest", result.level);
			lines.push("Niveau atteint : " + result.level);
			lines.push(result.level > previous ? "Nouveau record !" : "Record : niveau " + Math.max(previous, result.level));
			break;
		}
		case Mode.TUTORIAL:
			heading = win ? "Bravo !" : heading;
			lines.push(win ? "Tu connais les bases : à toi de jouer !" : "Essaie encore !");
			break;
		}
		if (app.achievements)
			app.achievements.event("end", this.game, { ...result, courseRank });
		this.ending = { heading, lines, table, win, pop: new Pop(), scale: 0, time: 0 };
		if (win)
			app.audio.playMusic("musicMenu", MUSIC_VOLUME);
	}

	// ----- every step -----

	update(dt) {
		this.time += dt;
		const input = app.input;

		if (this.ending) {
			const e = this.ending;
			e.time += dt;
			e.scale = e.pop.update(dt);
			this.game.update(dt);
			if (e.time > 0.8 && (input.pressed("confirm") || input.pressed("back") || input.pointer)) {
				this.ending.time = -1000;
				this.quit();
			}
			return;
		}

		if (this.paused) {
			this.paused.time += dt;
			if (input.pressed("pause"))
				this.resume();
			else
				this.paused.group.update();
			return;
		}

		if (input.pressed("pause") && this.game.state === "play") {
			this.pause();
			return;
		}
		this.game.update(dt);
	}

	// ----- drawing -----

	render(ctx) {
		if (!this.game)
			return;
		this.game.render(ctx);
		this.renderStick(ctx);
		if (this.paused)
			this.renderPause(ctx);
		if (this.ending)
			this.renderEnd(ctx);
	}

	/** The virtual joystick, while a finger drives the ball. */
	renderStick(ctx) {
		const s = app.input.stick;
		if (!s || this.paused || this.ending)
			return;
		ctx.fillStyle = "rgba(30,21,69,0.12)";
		circle(ctx, s.x0, s.y0, 40);
		ctx.fill();
		const dx = s.x - s.x0;
		const dy = s.y - s.y0;
		const k = Math.min(1, 40 / (Math.hypot(dx, dy) || 1));
		ctx.fillStyle = "rgba(95,203,43,0.6)";
		circle(ctx, s.x0 + dx * k, s.y0 + dy * k, 16);
		ctx.fill();
	}

	renderPause(ctx) {
		const p = this.paused;
		ctx.fillStyle = "rgba(30,21,69,0.55)";
		ctx.fillRect(0, 0, W, H);
		if (p.withMap)
			drawMap(ctx, this.game);
		else
			text(ctx, "Pause", W / 2, H / 2 - 20, { size: 40, color: "#FFFFFF", weight: "800" });
		p.group.render(ctx);
	}

	renderEnd(ctx) {
		const e = this.ending;
		ctx.fillStyle = "rgba(30,21,69,0.45)";
		ctx.fillRect(0, 0, W, H);
		const w = 380, h = e.table ? 300 : 120 + e.lines.length * 26 + 20;
		ctx.save();
		ctx.translate(W / 2, H / 2);
		ctx.scale(Math.max(0.01, e.scale), Math.max(0.01, e.scale));
		panel(ctx, -w / 2, -h / 2, w, h, 24);
		text(ctx, e.heading, 0, -h / 2 + 44, { size: 32, color: e.win ? COLOR.green : COLOR.magenta, weight: "800" });
		if (e.table) {
			let cpu = 0;
			e.table.forEach((row, i) => {
				const y = -h / 2 + 96 + i * 34;
				if (row.mine) {
					roundedRect(ctx, -w / 2 + 24, y - 15, w - 48, 30, 15);
					ctx.fillStyle = "rgba(95,203,43,0.18)";
					ctx.fill();
				}
				const type = row.cpu ? cpu++ : row.mine ? 1 : 3;
				const c = BALL_PALETTE[type];
				ctx.fillStyle = sphere(ctx, -w / 2 + 52, y, 9, [c[2], c[0], c[1]]);
				circlePath(ctx, -w / 2 + 52, y, 9);
				ctx.fill();
				text(ctx, String(i + 1), -w / 2 + 80, y, { size: 15, color: COLOR.muted, weight: "600" });
				text(ctx, formatTime(row.time, true), w / 2 - 40, y, { size: 18, color: COLOR.ink, align: "right", weight: "700" });
			});
			text(ctx, e.lines[e.lines.length - 1], 0, h / 2 - 34, { size: 15, color: COLOR.muted, weight: "600" });
		} else {
			e.lines.forEach((line, i) => text(ctx, line, 0, -h / 2 + 90 + i * 26, { size: 16, color: i === 0 ? COLOR.ink : COLOR.muted, weight: i === 0 ? "700" : "500" }));
		}
		ctx.restore();
		if (e.time > 0.8) {
			ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.time * 4);
			text(ctx, "Clique ou appuie sur une touche", W / 2, H - 22, { size: 14, color: "#FFFFFF", weight: "600" });
			ctx.globalAlpha = 1;
		}
	}
}
