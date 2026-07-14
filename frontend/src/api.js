const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'REQUEST_FAILED');
    err.code = data.error;
    throw err;
  }
  return data;
}

export const api = {
  getConfig: () => request('/api/config'),
  createOrder: (wallet, quantity = 1) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify({ wallet, quantity }) }),
  confirmOrder: (orderId, { signature, wallet }) =>
    request(`/api/orders/${orderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ signature, wallet }),
    }),
  watchOrder: (orderId, signature) =>
    request(`/api/orders/${orderId}/watch`, { method: 'POST', body: JSON.stringify({ signature }) }),
  getOrderTickets: (orderId) => request(`/api/orders/${orderId}/tickets`),
  revealTicket: (ticketUuid, wallet) =>
    request(`/api/tickets/${ticketUuid}/reveal`, { method: 'POST', body: JSON.stringify({ wallet }) }),
  getMyTickets: (wallet) => request(`/api/tickets/mine?wallet=${encodeURIComponent(wallet)}`),
};

export function subscribeOrderUpdates(orderId, onMessage) {
  const ws = new WebSocket(`${WS_BASE}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', orderId }));
  ws.onmessage = (evt) => {
    try {
      onMessage(JSON.parse(evt.data));
    } catch {
      // ignore malformed frames
    }
  };
  return () => ws.close();
}
