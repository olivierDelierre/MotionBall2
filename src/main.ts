/**
 * Entry point : sets up the services (app.js), loads the assets while
 * showing the original "loading" screen, then starts the main loop on the
 * title screen.
 */

import "@fontsource-variable/outfit";
import { WIDTH as W, VIEW_HEIGHT as H } from "./config.js";
import { app } from "./app.js";
import { Screen } from "./engine/screen.js";
import { Input } from "./engine/input.js";
import { AudioEngine } from "./engine/audio.js";
import { SceneManager } from "./engine/scenes.js";
import { Loop } from "./engine/loop.js";
import { Progress } from "./progress.js";
import { Achievements } from "./achievements.js";
import { SOUND_FILES } from "./sounds.js";
import { TitleScene } from "./scenes/title.js";
import { applySettings } from "./scenes/menu.js";
import { PlayScene } from "./scenes/play.js";
import { COLOR, FONT, roundedRect } from "./gfx/theme.js";
import { backdrop } from "./gfx/ui.js";


function start() {
	const canvas = document.getElementById("game");
	app.screen = new Screen(canvas);
	app.input = new Input(app.screen);
	app.audio = new AudioEngine(SOUND_FILES);
	app.save = new Progress();
	app.achievements = new Achievements(app.save);
	app.scenes = new SceneManager();

	// the on-screen buttons of the touch screens
	const bindButton = (id, action) => {
		const el = document.getElementById(id);
		if (el)
			el.addEventListener("pointerdown", e => {
				e.preventDefault();
				app.audio.unlock();
				app.input.trigger(action);
			});
	};
	bindButton("tbBall", "switchBall");
	bindButton("tbPause", "pause");

	// browsers only allow sound after a user gesture
	const unlock = () => app.audio.unlock();
	window.addEventListener("keydown", unlock);
	window.addEventListener("pointerdown", unlock);

	// ----- loading -----

	let sounds = 0;
	let ready = false;
	let shown = 0;
	let last = performance.now();
	const drawLoading = now => {
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		// the bar eases toward the real progress, and the screen leaves once it is full
		shown += (sounds - shown) * (1 - Math.exp(-dt * 8));
		const ctx = app.screen.begin();
		backdrop(ctx, W, H, now / 1000);
		ctx.font = `800 34px ${FONT}`;
		ctx.fillStyle = COLOR.ink;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("MotionBall 2", W / 2, H / 2 - 40);
		roundedRect(ctx, W / 2 - 110, H / 2, 220, 8, 4);
		ctx.fillStyle = "rgba(30,21,69,0.12)";
		ctx.fill();
		roundedRect(ctx, W / 2 - 110, H / 2, Math.max(8, 220 * shown), 8, 4);
		ctx.fillStyle = COLOR.green;
		ctx.fill();
		if (ready && shown > 0.98) {
			applySettings();
			app.scenes.goto(new TitleScene(), true);
			new Loop(step, render).start();
		} else {
			requestAnimationFrame(drawLoading);
		}
	};
	requestAnimationFrame(drawLoading);

	const fonts = document.fonts ? document.fonts.load(`800 34px ${FONT}`).catch(() => { }) : Promise.resolve();
	Promise.all([
		app.audio.load(p => {
			sounds = p;
		}),
		fonts
	]).then(() => {
		sounds = 1;
		ready = true;
	});
}

/** One simulation step. */
function step(dt) {
	app.time += dt;
	app.audio.update(dt);
	app.scenes.update(dt);
	app.achievements.update(dt);
	app.input.endStep();
}

/** One displayed frame. */
function render(alpha = 1) {
	app.alpha = alpha;
	app.input.poll();
	const ctx = app.screen.begin();
	app.scenes.render(ctx);
	app.achievements.render(ctx);
}

start();

// handy in the browser console, and for the tests :
//   motionball.scenes.current.game                  the game being played
//   motionball.play("adventure", 2)                 starts a game
window.motionball = app;
app.play = (mode, param = 0) => app.scenes.goto(new PlayScene(mode, param), true);
