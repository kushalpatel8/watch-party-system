import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';
import { RoomManager } from '../RoomManager';
import { Participant } from '../Participant';
import { connectToDatabase } from '@/lib/db';
import { Room as RoomModel } from '@/models/Room';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerRoomHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>, socket: Sock) {
  const manager = RoomManager.getInstance();

  // ── join_room ─────────────────────────────────────────────────────────────
  socket.on('join_room', async ({ roomId }) => {
    try {
      const { userId, username, imageUrl } = socket.data;
      await connectToDatabase();
      const dbRoom = await RoomModel.findOne({ code: roomId.toUpperCase() });
      if (!dbRoom) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found.' });
        return;
      }

      const room = manager.getOrCreate(roomId.toUpperCase());
      socket.data.roomId = roomId.toUpperCase();

      // Determine role: host if creator, else check existing membership
      let role: 'Host' | 'Moderator' | 'Participant' = 'Participant';
      if (dbRoom.hostId === userId) {
        role = 'Host';
      } else {
        const existing = dbRoom.members.find((m: { userId: string; role: string }) => m.userId === userId);
        if (existing) role = existing.role as 'Host' | 'Moderator' | 'Participant';
      }

      // If already in room (reconnect), update socketId
      const existing = room.getParticipant(userId);
      if (existing) {
        existing.socketId = socket.id;
        room.clearHostDisconnectTimer();
      } else {
        const participant = new Participant({ userId, username, imageUrl, role, socketId: socket.id });
        room.addParticipant(participant);
      }

      await socket.join(roomId.toUpperCase());

      // Send current sync state to joining user
      if (room.videoId) {
        const livePos = room.getLivePosition();
        socket.emit('sync_state', {
          playState: room.playState,
          currentTime: livePos,
          videoId: room.videoId,
          updatedAt: Date.now(),
        });
      }

      // Broadcast updated participant list
      room.broadcast('user_joined', {
        username,
        userId,
        role,
        participants: room.getParticipantInfos(),
      });

      // Update DB members list
      const memberIndex = dbRoom.members.findIndex((m: { userId: string; role: string }) => m.userId === userId);
      if (memberIndex === -1) {
        dbRoom.members.push({ userId, role });
      }
      dbRoom.lastActiveAt = new Date();
      await dbRoom.save();
    } catch (err) {
      console.error('[join_room] Error:', err);
      socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join room.' });
    }
  });

  // ── leave_room ────────────────────────────────────────────────────────────
  socket.on('leave_room', ({ roomId }) => {
    handleLeave(io, socket, roomId.toUpperCase(), manager);
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) handleLeave(io, socket, roomId, manager);
  });
}

function handleLeave(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: Sock,
  roomId: string,
  manager: RoomManager
) {
  const room = manager.get(roomId);
  if (!room) return;

  const { userId, username } = socket.data;
  const participant = room.removeParticipant(userId);
  if (!participant) return;

  socket.leave(roomId);

  // Host disconnect: start grace period
  if (participant.role === 'Host' && !room.isEmpty()) {
    room.startHostDisconnectTimer(() => {
      autoTransferHost(room, io);
    });
  }

  room.broadcast('user_left', {
    username,
    userId,
    participants: room.getParticipantInfos(),
  });

  if (room.isEmpty()) {
    manager.delete(roomId);
  }
}

function autoTransferHost(
  room: Room,
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
) {
  const participants = room.getAllParticipants();
  if (participants.length === 0) return;

  // Longest-present Moderator, else earliest joiner
  const mods = participants.filter(p => p.role === 'Moderator').sort((a, b) => a.joinedAt - b.joinedAt);
  const newHost = mods[0] ?? participants.sort((a, b) => a.joinedAt - b.joinedAt)[0];

  if (!newHost) return;
  newHost.role = 'Host';

  room.broadcast('host_transferred', {
    newHostId: newHost.userId,
    newHostUsername: newHost.username,
    participants: room.getParticipantInfos(),
  });
}

// Need to import Room for autoTransferHost; works because it's in the same module chain
import { Room } from '../Room';
