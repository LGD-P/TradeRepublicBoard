import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Fully static output — deployable to Cloudflare Pages / any static host.
    adapter: adapter({ fallback: "index.html" }),
    // The shared TS core (sibling package) is consumed straight from source.
    alias: { "@tr/core": "../core/src/index.ts" },
  },
};
