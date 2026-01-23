import { serve } from "@hono/node-server";
import app from "./app.js";
import { env, serverPort } from "./config/env.js";

console.log(`
╔═══════════════════════════════════════════╗
║             MAIA API SERVER               ║
╠═══════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(26)}║
║  Port: ${serverPort.toString().padEnd(33)}║
╚═══════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port: serverPort,
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
  console.log(`Health check: http://localhost:${info.port}/health`);
});
