'use client';

import { useState, useRef, useEffect } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';
import { Send, MessageCircle } from 'lucide-react';

export function Chat() {
  const { chatMessages, me } = useRoom();
  const socket = getSocket();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setText('');
    socket.emit('chat_message', { text: trimmed });

    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 400);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-cyan-400" />
        <p className="text-sm font-semibold text-cyan-400">Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0" style={{ maxHeight: 240 }}>
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4 opacity-60">
            No messages yet…
          </p>
        )}
        {chatMessages.map((m, i) => {
          const isMe = m.userId === me?.userId;
          return (
            <div key={`${m.userId}-${m.timestamp}-${i}`} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                {m.username.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.username}</p>
                )}
                <div className={`px-3 py-1.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-violet-600/60 text-white rounded-tr-sm'
                    : 'bg-white/8 text-foreground rounded-tl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2 mt-3">
        <input
          id="chat-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          maxLength={500}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          id="chat-send-btn"
          className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
