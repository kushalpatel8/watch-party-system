'use client';

import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '🎉', '👎', '💯'];

export function ReactionBar() {
  const { reactions } = useRoom();
  const socket = getSocket();

  return (
    <div className="relative">
      {/* Floating reactions */}
      <div className="absolute bottom-12 left-0 right-0 pointer-events-none overflow-hidden h-20">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute text-2xl animate-float-up"
            style={{ left: `${(r.userId.charCodeAt(0) % 80) + 5}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Emoji buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            id={`reaction-${emoji}`}
            onClick={() => socket.emit('reaction', { emoji })}
            className="text-xl hover:scale-125 active:scale-110 transition-transform duration-100 p-1"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
