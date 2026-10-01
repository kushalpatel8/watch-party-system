import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';
import type { Role } from '@/types/roles';
import { RoomManager } from '../RoomManager';
import { PermissionPolicy } from '../PermissionPolicy';
import { connectToDatabase } from '@/lib/db';
import { Room as RoomModel } from '@/models/Room';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerRoleHandlers(
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

  // ── assign_role ───────────────────────────────────────────────────────────
  socket.on('assign_role', async ({ userId, role }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'assign_role')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only hosts can assign roles.' });
      return;
    }
    // Host role must be transferred via transfer_host
    if (role === 'Host') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Use transfer_host to assign the Host role.' });
      return;
    }
    const target = ctx.room.getParticipant(userId);
    if (!target) {
      socket.emit('error', { code: 'NOT_FOUND', message: 'Participant not found.' });
      return;
    }
    // Cannot change the Host's role
    if (target.role === 'Host') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot change the host role.' });
      return;
    }
    target.role = role as Role;
    ctx.room.broadcast('role_assigned', {
      userId,
      username: target.username,
      role: target.role,
      participants: ctx.room.getParticipantInfos(),
    });

    // Persist to DB
    try {
      await connectToDatabase();
      await RoomModel.updateOne(
        { code: ctx.room.roomId, 'members.userId': userId },
        { $set: { 'members.$.role': role } }
      );
    } catch (err) {
      console.error('[assign_role] DB update failed:', err);
    }
  });

  // ── remove_participant ────────────────────────────────────────────────────
  socket.on('remove_participant', ({ userId }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'remove_participant')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only hosts can remove participants.' });
      return;
    }
    const target = ctx.room.getParticipant(userId);
    if (!target) {
      socket.emit('error', { code: 'NOT_FOUND', message: 'Participant not found.' });
      return;
    }
    if (target.role === 'Host') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot remove the host.' });
      return;
    }
    ctx.room.removeParticipant(userId);
    // Kick target socket from room
    io.to(target.socketId).emit('error', { code: 'REMOVED', message: 'You have been removed from the room.' });
    io.sockets.sockets.get(target.socketId)?.leave(ctx.room.roomId);

    ctx.room.broadcast('participant_removed', {
      userId,
      participants: ctx.room.getParticipantInfos(),
    });
  });

  // ── transfer_host ─────────────────────────────────────────────────────────
  socket.on('transfer_host', async ({ userId }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'transfer_host')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only hosts can transfer the host role.' });
      return;
    }
    const target = ctx.room.getParticipant(userId);
    if (!target) {
      socket.emit('error', { code: 'NOT_FOUND', message: 'Participant not found.' });
      return;
    }
    // Old host becomes Moderator
    ctx.participant.role = 'Moderator';
    target.role = 'Host';

    ctx.room.broadcast('host_transferred', {
      newHostId: target.userId,
      newHostUsername: target.username,
      participants: ctx.room.getParticipantInfos(),
    });

    // Persist to DB
    try {
      await connectToDatabase();
      await RoomModel.updateOne(
        { code: ctx.room.roomId },
        {
          $set: {
            hostId: userId,
            'members.$[newHost].role': 'Host',
            'members.$[oldHost].role': 'Moderator',
          },
        },
        {
          arrayFilters: [
            { 'newHost.userId': userId },
            { 'oldHost.userId': ctx.participant.userId },
          ],
        }
      );
    } catch (err) {
      console.error('[transfer_host] DB update failed:', err);
    }
  });
}
