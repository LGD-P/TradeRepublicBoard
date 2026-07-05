// Local runtime — `node src/server.js` (Node 18+). Same handler as the Worker.
import { createServer } from "node:http";

import { handle } from "./handler.js";

const PORT = Number(process.env.PORT) || 8787;

createServer(async (req, res) => {
  try {
    const origin = "http://" + (req.headers.host || `localhost:${PORT}`);
    const request = new Request(origin + req.url, { method: req.method, headers: req.headers });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "proxy error" }));
  }
}).listen(PORT, () => console.log(`price-proxy listening on http://localhost:${PORT} (ISIN in, EUR price out)`));
