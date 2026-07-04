import { fileURLToPath, URL } from "node:url";

import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// The @tr/core alias is declared in svelte.config.js (kit.alias); here we only
// widen Vite's fs allow-list so it can read the sibling core package's source.
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
});
