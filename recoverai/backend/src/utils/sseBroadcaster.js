/**
 * Server-Sent Events (SSE) Broadcaster
 *
 * Manages active HTTP SSE client connections and broadcasts real-time
 * pipeline events (classification, action dispatch, recoveries, chaos injections).
 *
 * FIX #7 security hardening:
 *   - Max 50 concurrent SSE connections (prevents file-descriptor exhaustion)
 *   - 30-second heartbeat keeps connections alive and detects dead clients
 *   - Interval cleanup on disconnect prevents memory leaks
 */

const MAX_SSE_CLIENTS = 50;
const HEARTBEAT_INTERVAL_MS = 30_000;

class SSEBroadcaster {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    // FIX #7 — Reject connection if at capacity
    if (this.clients.size >= MAX_SSE_CLIENTS) {
      res.status(503).json({ error: 'SSE connection limit reached. Try again later.' });
      return;
    }

    this.clients.add(res);

    // Heartbeat: send a comment every 30s to keep TCP alive and detect dead sockets
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
        this.clients.delete(res);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });
  }

  broadcast(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

const sseBroadcaster = new SSEBroadcaster();

module.exports = { sseBroadcaster };

