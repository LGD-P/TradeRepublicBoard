// Cloudflare Worker entry — deploy with `wrangler deploy`.
import { handle } from "./handler.js";

export default {
  fetch: (request) => handle(request),
};
