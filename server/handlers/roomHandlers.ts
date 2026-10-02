import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/events';
import { RoomManager } from '../RoomManager';
import { Participant } from '../Participant';
import { connectToDatabase } from '../../lib/db';
import { Room as RoomModel } from '../../models/Room';

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

      // Determine role: host if creator or if room is empty, else check existing membership
      let role: 'Host' | 'Moderator' | 'Participant' = 'Participant';
      if (dbRoom.hostId === userId || room.isEmpty()) {
        role = 'Host';
      } else {
        const existing = dbRoom.members.find((m: { userId: string; role: string }) => m.userId === userId);
        if (existing) {
          role = existing.role as 'Host' | 'Moderator' | 'Participant';
        }
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

      // Restore video from DB if memory room has no video yet
      if (!room.videoId && dbRoom.currentVideoId) {
        room.videoId = dbRoom.currentVideoId;
        room.playState = 'paused';
        room.currentTime = 0;
        room.updatedAt = Date.now();
      }

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

      // If joining user is Host or Moderator, send any existing pending change requests
      if (role === 'Host' || role === 'Moderator') {
        for (const req of room.pendingRequests.values()) {
          socket.emit('change_requested', req);
        }
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
  socket.on('leave_room', async ({ roomId }) => {
    await handleLeave(io, socket, roomId.toUpperCase(), manager);
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const roomId = socket.data.roomId;
    if (roomId) await handleLeave(io, socket, roomId, manager);
  });
}

async function handleLeave(
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

  // Broadcast user_left
  room.broadcast('user_left', {
    username,
    userId,
    participants: room.getParticipantInfos(),
  });

  // If the leaving user was the Host and room is not empty,
  // automatically transfer host to Moderator 1, then Moderator 2, then next viewer in line
  if (participant.role === 'Host' && !room.isEmpty()) {
    await autoTransferHost(room, io, userId);
  }

  if (room.isEmpty()) {
    manager.delete(roomId);
  }
}

async function autoTransferHost(
  room: Room,
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  oldHostUserId?: string
) {
  const remaining = room.getAllParticipants();
  if (remaining.length === 0) return;

  // 1. Check for Moderators sorted by joinedAt (Moderator 1, then Moderator 2...)
  const mods = remaining
    .filter((p) => p.role === 'Moderator')
    .sort((a, b) => a.joinedAt - b.joinedAt);

  // 2. If no moderators, pick the earliest joined viewer
  const viewers = remaining
    .filter((p) => p.role === 'Participant')
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const newHost = mods[0] ?? viewers[0] ?? remaining[0];
  if (!newHost) return;

  newHost.role = 'Host';

  // Broadcast host transfer to all clients
  room.broadcast('host_transferred', {
    newHostId: newHost.userId,
    newHostUsername: newHost.username,
    participants: room.getParticipantInfos(),
  });

  // Announce in chat
  room.broadcast('chat_message', {
    userId: 'system',
    username: 'System',
    text: `${newHost.username} is now the Host.`,
    timestamp: Date.now(),
  });

  // Persist new Host in MongoDB
  try {
    await connectToDatabase();
    const updateOps: any = {
      $set: {
        hostId: newHost.userId,
        'members.$[newHost].role': 'Host',
      },
    };
    const arrayFilters: any[] = [{ 'newHost.userId': newHost.userId }];

    if (oldHostUserId) {
      updateOps.$set['members.$[oldHost].role'] = 'Participant';
      arrayFilters.push({ 'oldHost.userId': oldHostUserId });
    }

    await RoomModel.updateOne(
      { code: room.roomId },
      updateOps,
      { arrayFilters }
    );
  } catch (err) {
    console.error('[autoTransferHost] DB update failed:', err);
  }
}

import { Room } from '../Room';
