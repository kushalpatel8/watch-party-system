'use client';

import { useState, useRef, useEffect } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';
import { Send, Sparkles } from 'lucide-react';

function formatTimestamp(ts: number): string {
  if (!ts) return '12:00';
  const d = new Date(ts);
  const hrs = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}

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
    <div className="flex flex-col h-full min-h-0 text-stone-900 dark:text-white">
      <div className="flex items-center justify-between mb-1 sm:mb-2 px-1 flex-shrink-0">
        <h3 className="text-xs sm:text-base font-extrabold text-stone-900 dark:text-white tracking-wide">Live Chat</h3>
      </div>

      {/* Messages (Internal Scroll Only) */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 sm:gap-2 pr-0.5 sm:pr-1 min-h-0">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center my-auto py-4 sm:py-6 text-stone-400 dark:text-white/40 text-xs">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 opacity-60 text-amber-600 dark:text-amber-400" />
            <p className="font-semibold text-stone-600 dark:text-white/70">Welcome to the room!</p>
            <p className="text-[10px] sm:text-[11px] mt-0.5">Start the conversation below.</p>
          </div>
        )}
        {chatMessages.map((m, i) => {
          const isSystem = m.username === 'System' || m.userId === 'system';
          const isMe = m.userId === me?.userId;

          return (
            <div
              key={`${m.userId}-${m.timestamp}-${i}`}
              className={`rounded-xl p-2 sm:p-2.5 border transition-all ${
                isSystem
                  ? 'bg-amber-100/70 dark:bg-amber-500/10 border-amber-300/80 dark:border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-xs'
                  : isMe
                  ? 'bg-amber-50/80 dark:bg-amber-500/15 border-amber-200/90 dark:border-amber-500/25 text-stone-900 dark:text-white shadow-xs'
                  : 'bg-[#faf8f4] dark:bg-[#1e293b] border-stone-200/80 dark:border-white/5 text-stone-900 dark:text-white'
              }`}
            >
              {/* Header: [14:30] Username */}
              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-[11px] font-mono text-stone-400 dark:text-white/40">
                  [{formatTimestamp(m.timestamp)}]
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-bold ${
                    isSystem
                      ? 'text-[#b45309] dark:text-amber-400'
                      : isMe
                      ? 'text-[#d97706] dark:text-amber-300'
                      : 'text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {m.username}
                </span>
              </div>

              {/* Message text */}
              <p className="text-[11px] sm:text-xs text-stone-700 dark:text-white/80 leading-relaxed break-words pl-0.5">
                {m.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="relative mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-stone-200 dark:border-white/10 flex-shrink-0">
        <input
          id="chat-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message…"
          maxLength={500}
          className="w-full pl-3 sm:pl-3.5 pr-10 sm:pr-11 py-2 sm:py-2.5 rounded-xl bg-[#f8f6f0] dark:bg-[#1e293b] border border-stone-300/80 dark:border-white/10 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-white/40 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:shadow-[0_0_12px_rgba(232,137,12,0.2)] transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          id="chat-send-btn"
          className="absolute right-1 top-1/2 -translate-y-1/2 mt-1 p-1.5 sm:p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d97706] dark:text-amber-400" />
        </button>
      </form>
    </div>
  );
}
