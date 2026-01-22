import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./config/env.js";

console.log(`
╔═══════════════════════════════════════════╗
║             MAIA API SERVER               ║
╠═══════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(26)}║
║  Port: ${env.PORT.toString().padEnd(33)}║
╚═══════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
  console.log(`Health check: http://localhost:${info.port}/health`);
});
