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
    // Strict Content-Security-Policy — no CDN, no third-party. SvelteKit hashes
    // its own inline bootstrap script so `script-src 'self'` stays strict.
    csp: {
      mode: "hash",
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:"],
        "font-src": ["self"],
        // Network egress is limited to the price proxy only (ISIN in, price out).
        // Add your Cloudflare Worker origin here when you deploy one.
        "connect-src": ["self", "http://localhost:8787"],
        "base-uri": ["self"],
        "form-action": ["none"],
        "object-src": ["none"],
      },
    },
  },
};
