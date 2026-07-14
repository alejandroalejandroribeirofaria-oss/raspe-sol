import { WebSocketServer } from 'ws';

// orderId -> Set<ws>
const subscribers = new Map();

export function initWsHub(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && msg.orderId) {
          if (!subscribers.has(msg.orderId)) subscribers.set(msg.orderId, new Set());
          subscribers.get(msg.orderId).add(ws);
          ws._orderId = msg.orderId;
        }
      } catch {
        // ignore malformed client messages
      }
    });

    ws.on('close', () => {
      if (ws._orderId) subscribers.get(ws._orderId)?.delete(ws);
    });
  });

  return wss;
}

export function broadcastOrderUpdate(orderId, payload) {
  const set = subscribers.get(orderId);
  if (!set) return;
  const message = JSON.stringify({ orderId, ...payload });
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

