'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/gtag';

type Msg = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'iron-chat-history-v1';
const WELCOME: Msg = {
  role: 'assistant',
  content:
    'Ahoj! Jsem asistent IRON. Poradím s hledáním posilovny, odpovím na otázky o webu nebo vysvětlím možnosti pro majitele gymů. S čím můžu pomoct?',
};

/** Autolink https URLs and IRON route paths. Allowlisted prefixes to avoid false positives on Czech text like "Kč/měsíc". */
function renderContent(text: string) {
  const parts = text.split(
    /(https?:\/\/\S+|\/(?:posilovny|kategorie|pro-majitele|treneri|kontakt|o-projektu|obchodni-podminky|podminky-pouziti|ochrana-soukromi|prihlaseni|profil)(?:\/[a-z0-9-]+)*\/?)/gi
  );
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
          {part}
        </a>
      );
    }
    if (/^\/[a-z0-9]/i.test(part)) {
      return (
        <a key={i} href={part} style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput('');

    const nextMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setLoading(true);
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    // GA4: track chat usage (respektuje cookie consent v GA4Loader)
    trackEvent('chat_message_sent', {
      message_length: text.length,
      turn_index: nextMessages.filter((m) => m.role === 'user').length,
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        let msg = 'Něco se pokazilo, zkus to znovu.';
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        setMessages((m) => m.slice(0, -1));
        setError(msg);
        return;
      }

      if (!res.body) {
        setMessages((m) => m.slice(0, -1));
        setError('Prázdná odpověď serveru.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setError('Chyba připojení. Zkus to znovu.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Zavřít chat' : 'Otevřít chat'}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--lime, #C8FF00)',
          color: 'var(--black, #080808)',
          border: 'none',
          boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
          cursor: 'pointer',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="IRON chatbot"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 90,
            width: 'min(380px, calc(100vw - 40px))',
            height: 'min(560px, calc(100vh - 120px))',
            background: 'var(--card-bg, #161616)',
            border: '1px solid var(--border, #2a2a2a)',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            fontFamily: 'var(--font-barlow), system-ui, sans-serif',
          }}
        >
          <div
            style={{
              background: 'var(--off-black, #111111)',
              color: 'var(--text, #f0f0f0)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border, #2a2a2a)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, letterSpacing: 0.5, color: 'var(--lime, #C8FF00)' }}>IRON asistent</div>
              <div style={{ fontSize: 12, color: 'var(--muted, #888888)' }}>Obvykle odpovídá během pár vteřin</div>
            </div>
            <button
              onClick={reset}
              title="Nová konverzace"
              style={{
                background: 'transparent',
                color: 'var(--text, #f0f0f0)',
                border: '1px solid var(--border-mid, #3a3a3a)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Nová
            </button>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              background: 'var(--black, #080808)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--lime, #C8FF00)' : 'var(--card-bg, #161616)',
                  color: m.role === 'user' ? 'var(--black, #080808)' : 'var(--text, #f0f0f0)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border, #2a2a2a)',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.role === 'assistant' ? renderContent(m.content || (loading ? '...' : '')) : m.content}
              </div>
            ))}
            {error && (
              <div style={{ alignSelf: 'center', fontSize: 12, color: '#ff6a6a', marginTop: 4 }}>{error}</div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border, #2a2a2a)', padding: 8, background: 'var(--off-black, #111111)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Napiš zprávu..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '1px solid var(--border, #2a2a2a)',
                  background: 'var(--card-bg, #161616)',
                  color: 'var(--text, #f0f0f0)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  maxHeight: 120,
                  outline: 'none',
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Odeslat"
                style={{
                  background: loading || !input.trim() ? 'var(--border, #2a2a2a)' : 'var(--lime, #C8FF00)',
                  color: loading || !input.trim() ? 'var(--muted, #888888)' : 'var(--black, #080808)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {loading ? '...' : 'Poslat'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted, #888888)', marginTop: 6, textAlign: 'center' }}>
              AI asistent může chybovat. Ověř si důležité informace.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
