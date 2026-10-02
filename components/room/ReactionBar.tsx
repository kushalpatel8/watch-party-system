'use client';

import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '🎉', '👎', '💯'];

export function ReactionBar() {
  const { reactions } = useRoom();
  const socket = getSocket();

  return (
    <div className="relative max-w-full">
      {/* Floating reactions */}
      <div className="absolute bottom-10 sm:bottom-12 left-0 right-0 pointer-events-none overflow-hidden h-20 sm:h-24">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute text-xl sm:text-3xl animate-float-up"
            style={{ left: `${(r.userId.charCodeAt(0) % 80) + 5}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Emoji buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            id={`reaction-${emoji}`}
            onClick={() => socket.emit('reaction', { emoji })}
            className="text-base sm:text-xl hover:scale-125 active:scale-125 transition-transform duration-100 p-1 sm:p-1 rounded-lg hover:bg-amber-100/50 dark:hover:bg-white/5 cursor-pointer shrink-0"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
