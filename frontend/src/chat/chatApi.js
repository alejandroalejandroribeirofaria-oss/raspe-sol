const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export async function uploadChatImage(file, wallet) {
  const form = new FormData();
  form.append('image', file);
  form.append('wallet', wallet);

  const res = await fetch(`${API_BASE}/api/chat/upload`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'UPLOAD_FAILED');
    err.code = data.error;
    throw err;
  }
  return data.imagePath;
}

export function chatImageUrl(imagePath) {
  return `${API_BASE}/uploads/chat/${imagePath}`;
}

export function chatWsUrl(wallet) {
  return `${WS_BASE}/ws/chat?wallet=${encodeURIComponent(wallet)}`;
}

