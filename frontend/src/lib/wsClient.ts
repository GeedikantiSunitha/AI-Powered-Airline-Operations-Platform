/**
 * Phase 2 — WebSocket client for live flight/alert updates
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

export function connectWs(
  onMessage: (data: unknown) => void,
  topics: string[] = ['flight.status.updated']
): () => void {
  const ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    for (const topic of topics) {
      ws.send(JSON.stringify({ action: 'subscribe', topic }));
    }
  };
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data as string));
    } catch {
      onMessage(ev.data);
    }
  };
  return () => ws.close();
}
