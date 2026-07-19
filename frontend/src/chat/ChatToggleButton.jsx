import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '../wallet/WalletProvider';
import { chatWsUrl, uploadChatImage } from './chatApi.js';

const ChatContext = createContext(null);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

const TYPING_TIMEOUT_MS = 4000;
const RECONNECT_DELAY_MS = 2000;

export function ChatProvider({ children }) {
  const { address, connected } = useWallet();

  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingWallets, setTypingWallets] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('closed');
  const [lastError, setLastError] = useState(null);

  const wsRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  const clearError = useCallback(() => setLastError(null), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((o) => { const n =!o; if (n) setUnreadCount(0); return n; }), []);

  const clearTypingTimer = useCallback((wallet) => {
    const id = typingTimersRef.current.get(wallet);
    if (id) { clearTimeout(id); typingTimersRef.current.delete(wallet); }
  }, []);

  const markTyping = useCallback((wallet) => {
    setTypingWallets((p) => p.includes(wallet)? p : [...p, wallet]);
    clearTypingTimer(wallet);
    const id = setTimeout(() => {
      setTypingWallets((p) => p.filter((w) => w!== wallet));
      typingTimersRef.current.delete(wallet);
    }, TYPING_TIMEOUT_MS);
    typingTimersRef.current.set(wallet, id);
  }, [clearTypingTimer]);

  useEffect(() => {
    if (!connected ||!address) { setConnectionStatus('closed'); return; }
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setConnectionStatus('connecting');
      const ws = new WebSocket(chatWsUrl(address));
      wsRef.current = ws;

      ws.onopen = () =>!cancelled && setConnectionStatus('open');

      ws.onmessage = (event) => {
        let data; try { data = JSON.parse(event.data); } catch { return; }
        const { type } = data;

        if (type === 'chat:init') {
          setMessages(data.messages.map((m) => ({ kind: 'message',...m })));
          setOnlineCount(data.onlineCount);
        }
        if (type === 'chat:new') {
          setMessages((p) => [...p, { kind: 'message',...data.message }]);
          if (!panelOpenRef.current && data.message.wallet!== address) setUnreadCount((c) => c + 1);
        }
        if (type === 'chat:join' || type === 'chat:leave') {
          setOnlineCount(data.onlineCount);
          setMessages((p) => [...p, {
            kind: 'system',
            type: type === 'chat:join'? 'join' : 'leave',
            id: `${type}-${data.wallet}-${Date.now()}`,
            wallet: data.wallet
          }]);
        }
        if (type === 'chat:presence') setOnlineCount(data.onlineCount);
        if (type === 'chat:typing' && data.wallet!== address) markTyping(data.wallet);
        if (type === 'chat:reaction') setMessages((p) => p.map((m) => m.kind === 'message' && m.id === data.messageId? {...m, reactions: data.reactions } : m));
        if (type === 'chat:hidden') setMessages((p) => p.filter((m) =>!(m.kind === 'message' && m.id === data.messageId)));
        if (type === 'chat:reported') setMessages((p) => p.map((m) => m.kind === 'message' && m.id === data.messageId? {...m, reportedByMe: true } : m));
        if (type === 'chat:expired') setMessages((p) => p.filter((m) =>!(m.kind === 'message' && data.messageIds.includes(m.id))));
        if (type === 'chat:kicked') { setLastError({ code: 'KICKED', message: data.reason }); ws.close(); }
        if (type === 'chat:error') setLastError({ code: data.code, message: data.message });
      };

      ws.onclose = () => { if (cancelled) return; setConnectionStatus('closed'); reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS); };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      typingTimersRef.current.forEach(clearTimeout);
      typingTimersRef.current.clear();
      setMessages([]); setTypingWallets([]); setConnectionStatus('closed');
    };
  }, [connected, address, markTyping]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState!== WebSocket.OPEN) { setLastError({ code: 'NOT_CONNECTED', message: 'Not connected to chat.' }); return; }
    ws.send(JSON.stringify(payload));
  }, []);

  const sendMessage = useCallback((text, opts = {}) => send({ type: 'chat:send', message: text, imagePath: opts.imagePath, replyTo: opts.replyTo }), [send]);
  const sendTyping = useCallback(() => send({ type: 'chat:typing' }), [send]);
  const react = useCallback((messageId, emoji) => send({ type: 'chat:react', messageId, emoji }), [send]);
  const report = useCallback((messageId) => send({ type: 'chat:report', messageId }), [send]);
  const uploadImage = useCallback(async (file) => { if (!address) throw new Error('Connect a wallet before sending images.'); return uploadChatImage(file, address); }, [address]);

  const value = useMemo(() => ({
    panelOpen, unreadCount, togglePanel, closePanel, messages, onlineCount,
    typingWallets, connectionStatus, lastError, clearError,
    sendMessage, sendTyping, react, report, uploadImage,
    walletAddress: address, connected,
  }), [panelOpen, unreadCount, messages, onlineCount, typingWallets, connectionStatus, lastError, address, connected]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export default ChatProvider
