import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
	base: "./",
	// one self-contained index.html (script, style and font inlined): it opens from the disk
	plugins: [viteSingleFile()],
	build: {
		target: "es2022",
		outDir: "dist",
		sourcemap: true
	},
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node"
	}
});
