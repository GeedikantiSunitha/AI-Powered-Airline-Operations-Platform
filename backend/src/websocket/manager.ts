import type { WebSocketServer, WebSocket } from 'ws';

const clients = new Set<WebSocket>();
const DEFAULT_TOPIC = 'flight.status.updated';

interface SubscribableSocket extends WebSocket {
  subscriptions?: Set<string>;
}

export function createWsManager(wss: WebSocketServer): void {
  wss.on('connection', (ws) => {
    const client = ws as SubscribableSocket;
    client.subscriptions = new Set([DEFAULT_TOPIC]);
    clients.add(client);
    client.send(
      JSON.stringify({
        type: 'connected',
        message: 'airline-ops-ws',
        subscriptions: [DEFAULT_TOPIC],
      })
    );

    client.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as {
          action?: 'subscribe' | 'unsubscribe';
          topic?: string;
        };
        if (!message.topic || !message.action) return;
        if (message.action === 'subscribe') client.subscriptions?.add(message.topic);
        if (message.action === 'unsubscribe') client.subscriptions?.delete(message.topic);
      } catch {
        // ignore non-json messages
      }
    });

    client.on('close', () => clients.delete(client));
  });
}

/** Broadcast event to all dashboard clients — Phase 2+ */
export function broadcast(event: { type: string; payload: unknown }): void {
  const message = JSON.stringify(event);
  for (const client of clients) {
    const socket = client as SubscribableSocket;
    if (socket.readyState !== 1) continue;
    const wantsEvent = socket.subscriptions?.has(event.type);
    if (wantsEvent) socket.send(message);
  }
}
