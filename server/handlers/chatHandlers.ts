import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/events';
import { RoomManager } from '../RoomManager';
import { connectToDatabase } from '../../lib/db';
import { Room as RoomModel } from '../../models/Room';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerChatHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: Sock
) {
  const manager = RoomManager.getInstance();

  function getContext() {
    const roomId = socket.data.roomId;
    if (!roomId) return null;
    const room = manager.get(roomId);
    if (!room) return null;
    const participant = room.getParticipant(socket.data.userId);
    if (!participant) return null;
    return { room, participant };
  }

  let lastMessageText = '';
  let lastMessageTime = 0;

  socket.on('chat_message', async ({ text, id, timestamp }) => {
    const ctx = getContext();
    if (!ctx) return;
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length > 500) return;

    const now = typeof timestamp === 'number' ? timestamp : Date.now();
    const msgId = id || `${ctx.participant.userId}-${now}-${Math.random().toString(36).slice(2, 7)}`;

    if (trimmed === lastMessageText && Math.abs(now - lastMessageTime) < 800) {
      return; // Ignore duplicate rapid submission
    }
    lastMessageText = trimmed;
    lastMessageTime = now;

    ctx.room.broadcast('chat_message', {
      id: msgId,
      userId: ctx.participant.userId,
      username: ctx.participant.username,
      text: trimmed,
      timestamp: now,
    });

    try {
      await connectToDatabase();
      const dbRoom = await RoomModel.findOne({ code: ctx.room.roomId });
      if (dbRoom) {
        if (!dbRoom.messages) dbRoom.messages = [];
        const isDuplicate = dbRoom.messages.some(
          (m: any) =>
            (Boolean(m.id && msgId) && m.id === msgId) ||
            (m.userId === ctx.participant.userId &&
              m.text === trimmed &&
              Math.abs((m.timestamp || 0) - now) < 5000)
        );

        if (!isDuplicate) {
          dbRoom.messages.push({
            id: msgId,
            userId: ctx.participant.userId,
            username: ctx.participant.username,
            text: trimmed,
            timestamp: now,
          });
          if (dbRoom.messages.length > 200) {
            dbRoom.messages = dbRoom.messages.slice(-200);
          }
          await dbRoom.save();
        }
      }
    } catch (err) {
      console.error('[chatHandlers] DB save error:', err);
    }
  });

  socket.on('reaction', ({ emoji }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!emoji) return;

    ctx.room.broadcast('reaction', {
      userId: ctx.participant.userId,
      username: ctx.participant.username,
      emoji,
      timestamp: Date.now(),
    });
  });
}
