/**
 * src/server/healthServer.js
 * Lightweight HTTP server for uptime monitors, container orchestrators, and 24/7 keep-alive checks.
 *
 * Supported endpoints:
 *   GET /        - Human-readable status banner
 *   GET /health  - JSON status with bot uptime, ping, and memory usage
 *   GET /ping    - Fast 200 OK text response for automated pingers (e.g. UptimeRobot)
 */

import http from 'http';
import { logger } from '../utils/logger.js';

export function startHealthServer(client, port = process.env.PORT || 8080) {
  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    // CORS & JSON headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('pong');
    }

    if (url === '/health' || url === '/') {
      const mem = process.memoryUsage();
      const payload = {
        status: 'healthy',
        service: 'HCC AutoEngage',
        uptimeSeconds: Math.floor(process.uptime()),
        bot: {
          tag: client.user ? client.user.tag : 'connecting',
          readyAt: client.readyAt ? client.readyAt.toISOString() : null,
          guildCount: client.guilds?.cache.size ?? 0,
          pingMs: client.ws?.ping ?? null,
        },
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        },
        timezone: process.env.TZ || 'Asia/Kolkata',
        timestamp: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(payload, null, 2));
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    logger.info(`Production health & keep-alive server listening on port ${port} (ready for 24/7 monitoring) ✅`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Health server port ${port} is in use; continuing bot gateway connection.`);
    } else {
      logger.warn('Health server encounter:', { error: err.message });
    }
  });

  return server;
}

