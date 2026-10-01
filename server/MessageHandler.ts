import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerPlaybackHandlers } from './handlers/playbackHandlers';
import { registerRoleHandlers } from './handlers/roleHandlers';
import { registerRequestHandlers } from './handlers/requestHandlers';
import { registerChatHandlers } from './handlers/chatHandlers';

/**
 * MessageHandler wires all event handlers onto a socket.
 * Keeping this class lets us reference it in tests and keeps socketServer.ts thin.
 */
export class MessageHandler {
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
    private socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
  ) {}

  register() {
    registerRoomHandlers(this.io, this.socket);
    registerPlaybackHandlers(this.io, this.socket);
    registerRoleHandlers(this.io, this.socket);
    registerRequestHandlers(this.io, this.socket);
    registerChatHandlers(this.io, this.socket);
  }
}
