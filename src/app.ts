/**
 * The services shared by the whole game, set up once by main.js :
 *
 *   app.screen   the canvas (engine/screen.js)
 *   app.input    keyboard / gamepad / touch (engine/input.js)
 *   app.audio    sounds and music (engine/audio.js)
 *   app.save     the saved progression and settings (progress.js)
 *   app.achievements   the achievements (achievements.js)
 *   app.scenes   the current screen (engine/scenes.js)
 *   app.time     seconds since the start (for idle animations)
 *   app.alpha    0..1, how far the frame is between two simulation steps
 *
 * Game code imports `app` instead of passing these objects around.
 */

export const app = {
	screen: null,
	input: null,
	audio: null,
	save: null,
	achievements: null,
	scenes: null,
	time: 0,
	/** interpolation factor between the last two simulation steps, set before each draw */
	alpha: 1
};
