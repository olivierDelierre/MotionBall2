/**
 * The menu: a page of cards (modes, courses, adventures, options), drawn
 * on the lavender backdrop. Mouse and touch: hover and click. Keyboard and
 * gamepad: arrows move the focus, "confirm" enters, "back" goes back.
 *
 * The options page has a slider on the music and sound cards: left / right
 * change the volume of the focused card, a click or a drag sets it, a click
 * on the rest of the card switches it on or off.
 *
 * Everything moves with the real time (cards slide in, the focused one
 * grows), so it stays smooth at any frame rate.
 */

import { WIDTH as W, VIEW_HEIGHT as H } from "../config.js";
import { Mode } from "../data/enums.js";
import { COLOR, BALL_PALETTE } from "../gfx/theme.js";
import { text } from "../gfx/draw.js";
import { card, slider, backdrop } from "../gfx/ui.js";
import { formatTime } from "../engine/math.js";
import { app } from "../app.js";
import { ButtonGroup } from "./widgets.js";
import { PlayScene } from "./play.js";
import { AchievementsScene } from "./achievements.js";

const VOLUME_STEP = 0.1;
const CARD_H = 58;
const ENTER_DELAY = 0.04;
const ENTER_TIME = 0.35;

/** A card of the menu. */
interface Entry {
	name: string;
	title: string;
	subtitle?: string;
	ball: number;                 // colour of its orb (a BallType)
	enabled: boolean;
	action: () => void;
	info?: () => string;          // shown in the card (a record...)
	hint?: string;                // shown under the cards when focused
	slider?: "music" | "sounds";
	x: number; y: number; w: number; h: number;
	focus: number;                // animated 0..1
	draw: (ctx: CanvasRenderingContext2D, focused: boolean) => void;
}

/** Left / right change the volume of a focused slider card; otherwise the focus moves. */
class MenuGroup extends ButtonGroup {
	declare adjust: ((way: number) => boolean) | null;

	move(dx, dy) {
		if (dx && this.adjust && this.adjust(dx))
			return;
		super.move(dx, dy);
	}
}

export class MenuScene {
	declare time: number;
	declare enterTime: number;
	declare page: string;
	declare group: any;
	declare mainFocus: number;
	declare dragging: any;
	declare leaving: boolean;
	declare title: string;
	declare lastFocus: number;

	/** @param focus  the name of the card to focus on the main page (e.g. coming back from a screen) */
	constructor(page = "main", focus = null) {
		this.time = 0;
		this.enterTime = 0;
		this.leaving = false;
		this.dragging = null;
		this.mainFocus = 0;
		if (focus)
			this.mainFocus = Math.max(0, this.mainPage().findIndex(b => b.name === focus));
		this.open(page);
	}

	/** Shows the cards of a page. */
	open(page) {
		// back on the main page, the focus stays on the mode that was opened
		const mainFocus = this.page === "main" ? this.group.focus : this.mainFocus;
		this.mainFocus = mainFocus;
		this.page = page;
		const entries: Entry[] = this[page + "Page"]();
		this.title = { main: "Choisis ton mode", course: "Circuits", adventure: "Aventures", options: "Options" }[page];
		this.group = new MenuGroup(entries, page === "main" ? null : () => this.goto("main"));
		this.group.adjust = null;
		this.dragging = null;
		this.enterTime = 0;
		this.layout(entries, page === "options" ? 1 : 2);
		if (page === "main")
			this.group.focus = mainFocus;
		this.lastFocus = this.group.focus;
		if (page === "options")
			this.group.adjust = way => {
				const e = this.group.focused;
				if (!e.slider)
					return false;
				this.setVolume(e.slider, app.save.settings[e.slider + "Volume"] + way * VOLUME_STEP, true);
				return true;
			};
	}

	/** Places the cards in `columns` columns. */
	layout(entries: Entry[], columns: number) {
		const w = columns === 1 ? 420 : 262;
		const gapY = 12, gapX = 14;
		const rows = Math.ceil(entries.length / columns);
		const top = 112;
		entries.forEach((e, i) => {
			const col = i % columns, row = Math.floor(i / columns);
			e.w = w;
			e.h = CARD_H;
			e.x = W / 2 + (col - (columns - 1) / 2) * (w + gapX);
			e.y = top + row * (CARD_H + gapY) + CARD_H / 2;
			e.focus = 0;
		});
		void rows;
	}

	entry(name: string, title: string, ball: number, action: () => void, extra: Partial<Entry> = {}): Entry {
		const e: Entry = {
			name, title, ball, action, enabled: true,
			x: 0, y: 0, w: 0, h: 0, focus: 0,
			draw: (ctx, focused) => this.drawEntry(ctx, e, focused),
			...extra
		};
		return e;
	}

	// ----- pages -----

	mainPage(): Entry[] {
		return [
			this.entry("challenge", "Challenge", 0, () => this.play(Mode.CHALLENGE),
				{ subtitle: "Un donjon au hasard", hint: "Explore un donjon tiré au hasard et vaincs le poulpe avant la fin du chrono." }),
			this.entry("course", "Course", 3, () => this.goto("course"),
				{ subtitle: "7 circuits chronométrés", hint: "Fais le plus de tours possible et bats les records." }),
			this.entry("aventure", "Aventure", 1, () => this.goto("adventure"),
				{ subtitle: "5 donjons, 5 boss", hint: "Les donjons faits main : quatre éléments, puis le boss final." }),
			this.entry("classique", "Classique", 4, () => this.play(Mode.CLASSIC),
				{ subtitle: "Descends le plus loin", hint: "Passe de trappe en trappe : jusqu'où iras-tu ?" }),
			this.entry("options", "Options", 5, () => this.goto("options"),
				{ subtitle: "Musique et sons", hint: "Règle le volume de la musique et des effets." }),
			this.entry("aide", "Aide", 6, () => this.play(Mode.TUTORIAL),
				{ subtitle: "Le tutoriel", hint: "Apprends les bases : bumpers, orbes, portes et trous." }),
			this.entry("succes", "Succès", 2, () => this.leave(() => new AchievementsScene()),
				{ subtitle: "Tes défis", hint: "Les succès débloqués et ceux qui restent à décrocher." })
		];
	}

	coursePage(): Entry[] {
		const entries: Entry[] = [];
		for (let i = 0; i < 7; i++) {
			const unlocked = app.save.courseUnlocked(i);
			entries.push(this.entry("course" + i, "Circuit " + (i + 1), i % 7, () => this.play(Mode.COURSE, i), {
				enabled: unlocked,
				subtitle: unlocked ? "Record" : "Verrouillé",
				info: () => formatTime(app.save.data.courses.records[i][0].time, true),
				hint: unlocked ? "Trois tours, le plus vite possible." : "Termine le circuit précédent pour l'ouvrir."
			}));
		}
		entries.push(this.entry("back", "Retour", 5, () => this.goto("main")));
		return entries;
	}

	adventurePage(): Entry[] {
		const names = ["Eau", "Feu", "Vent", "Terre", "Le dernier donjon"];
		const entries: Entry[] = [];
		const adventures = app.save.data.adventures;
		for (let i = 0; i < 5; i++) {
			const unlocked = app.save.adventureUnlocked(i);
			const won = adventures.won[i];
			entries.push(this.entry("adventure" + i, i < 4 ? "Aventure " + (i + 1) : "Finale", i, () => this.play(Mode.ADVENTURE, i), {
				enabled: unlocked,
				subtitle: unlocked ? names[i] : "Gagne les quatre autres",
				info: won ? () => "Gagné " + adventures.best[i] + " %" : undefined,
				hint: unlocked ? "Un donjon fait main, gardé par un boss." : "Gagne les quatre premières aventures pour l'ouvrir."
			}));
		}
		entries.push(this.entry("back", "Retour", 5, () => this.goto("main")));
		return entries;
	}

	optionsPage(): Entry[] {
		const s = app.save.settings;
		const toggle = key => {
			s[key] = !s[key];
			app.save.save();
			applySettings();
		};
		const volume = key => s[key] ? Math.round(s[key + "Volume"] * 100) + " %" : "Coupé";
		return [
			this.entry("music", "Musique", 3, () => toggle("music"), {
				slider: "music", subtitle: "Cliquer pour couper", info: () => volume("music"),
				hint: "Gauche / droite : volume. Entrée : activer ou couper."
			}),
			this.entry("sounds", "Sons", 4, () => toggle("sounds"), {
				slider: "sounds", subtitle: "Cliquer pour couper", info: () => volume("sounds"),
				hint: "Gauche / droite : volume. Entrée : activer ou couper."
			}),
			this.entry("back", "Retour", 5, () => this.goto("main"))
		];
	}

	/**
	 * Sets the volume of the music or of the sounds (0 .. 1). `done` : saves it
	 * (and plays a sound, to hear the new volume of the sounds).
	 */
	setVolume(key, v, done) {
		const s = app.save.settings;
		s[key + "Volume"] = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
		applySettings();
		if (done) {
			app.save.save();
			if (key === "sounds")
				app.audio.play("menuMove");
		}
	}

	/** Where the slider of a card is: the right part of the card. */
	sliderBox(e: Entry) {
		return { x: e.x + 20, w: e.w / 2 - 44 };
	}

	/** Dragging a slider (the mouse or a finger). Returns true when it took the input. */
	updateSliders(): boolean {
		if (this.page !== "options")
			return false;
		const input = app.input;
		const d = input.drag ? input.drag() : null;
		if (!d) {
			if (this.dragging)
				this.setVolume(this.dragging, app.save.settings[this.dragging + "Volume"], true);
			this.dragging = null;
			// (a tap on a slider sets its volume and nothing else)
			return false;
		}
		const entries: Entry[] = this.group.buttons;
		if (!this.dragging) {
			const hit = entries.find(e => {
				if (!e.slider)
					return false;
				const box = this.sliderBox(e);
				return Math.abs(d.y - e.y) < 18 && d.x > box.x - 12 && d.x < box.x + box.w + 12;
			});
			if (!hit)
				return false;
			this.dragging = hit.slider;
			this.group.focus = entries.indexOf(hit);
		}
		const e = entries.find(x => x.slider === this.dragging);
		const box = this.sliderBox(e);
		this.setVolume(this.dragging, (d.x - box.x) / box.w, false);
		return true;
	}

	// ----- transitions -----

	/** Starts a game (the scene manager fades out and in). */
	play(mode, param = 0) {
		if (this.leaving)
			return;
		this.leaving = true;
		app.scenes.goto(new PlayScene(mode, param));
	}

	/** Goes to another screen. */
	leave(scene) {
		if (this.leaving)
			return;
		this.leaving = true;
		app.scenes.goto(scene());
	}

	/** Shows another page of the menu. */
	goto(page) {
		if (this.leaving)
			return;
		this.open(page);
	}

	// ----- every step -----

	update(dt) {
		this.time += dt;
		this.enterTime += dt;
		if (!this.leaving && !app.scenes.busy) {
			const sliding = this.updateSliders() || this.dragging;
			if (!sliding)
				this.group.update();
		}
		// the focused card grows, the others shrink back (frame-rate independent)
		const k = 1 - Math.exp(-dt * 18);
		this.group.buttons.forEach((e: Entry, i: number) => {
			e.focus += ((i === this.group.focus ? 1 : 0) - e.focus) * k;
		});
	}

	// ----- drawing -----

	render(ctx: CanvasRenderingContext2D) {
		backdrop(ctx, W, H, this.time);
		text(ctx, "MotionBall 2", W / 2, 38, { size: 30, color: COLOR.ink, weight: "800" });
		text(ctx, this.title, W / 2, 70, { size: 15, color: COLOR.muted, weight: "500" });
		this.group.render(ctx);

		const e: Entry = this.group.focused;
		if (e?.hint)
			text(ctx, e.hint, W / 2, H - 38, { size: 13, color: COLOR.muted, weight: "500" });
	}

	drawEntry(ctx: CanvasRenderingContext2D, e: Entry, focused: boolean) {
		const i = this.group.buttons.indexOf(e);
		const t = Math.max(0, Math.min(1, (this.enterTime - i * ENTER_DELAY) / ENTER_TIME));
		const ease = 1 - Math.pow(1 - t, 3);
		if (t <= 0)
			return;
		ctx.save();
		ctx.globalAlpha *= ease;
		const c = BALL_PALETTE[e.ball];
		const light = c[2], main = c[0], dark = c[1];
		card(ctx, e.x, e.y + (1 - ease) * 18, e.w, e.h, {
			title: e.title,
			subtitle: e.slider ? undefined : e.subtitle,
			orb: [light, main, dark],
			focus: e.focus,
			enabled: e.enabled,
			badge: e.slider ? undefined : e.enabled ? e.info?.() : undefined
		});
		if (e.slider) {
			const s = app.save.settings;
			const box = this.sliderBox(e);
			slider(ctx, box.x, e.y + (1 - ease) * 18, box.w, s[e.slider + "Volume"], focused || this.dragging === e.slider, s[e.slider]);
			text(ctx, e.info?.() ?? "", e.x + e.w / 2 - 16, e.y - 14 + (1 - ease) * 18, { size: 12, color: COLOR.cyanInk, align: "right", weight: "700" });
		}
		ctx.restore();
	}
}

/** Applies the sound settings. */
export function applySettings() {
	const s = app.save.settings;
	app.audio.setMusicEnabled(s.music);
	app.audio.setSoundsEnabled(s.sounds);
	app.audio.setMusicVolume(s.musicVolume);
	app.audio.setSoundsVolume(s.soundsVolume);
}
