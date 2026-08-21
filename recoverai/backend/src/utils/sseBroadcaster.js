/**
 * Server-Sent Events (SSE) Broadcaster
 * 
 * Manages active HTTP SSE client connections and broadcasts real-time
 * pipeline events (classification, action dispatch, recoveries, chaos injections).
 */

class SSEBroadcaster {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
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
