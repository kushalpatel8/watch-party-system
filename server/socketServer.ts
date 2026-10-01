import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';
import { socketAuth } from './socketAuth';
import { RoomManager } from './RoomManager';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerPlaybackHandlers } from './handlers/playbackHandlers';
import { registerRoleHandlers } from './handlers/roleHandlers';
import { registerRequestHandlers } from './handlers/requestHandlers';
import { registerChatHandlers } from './handlers/chatHandlers';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';

const GLOBAL_KEY = '__socket_io_server__';

export async function initSocketServer(httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>): Promise<Server> {
  // Singleton guard: prevent duplicate instances on hot reload
  if ((global as any)[GLOBAL_KEY]) {
    console.log('[socketServer] Reusing existing Socket.IO instance');
    return (global as any)[GLOBAL_KEY];
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  // Redis adapter for horizontal scaling
  const REDIS_URL = process.env.REDIS_URL;
  if (REDIS_URL) {
    try {
      const pubClient = createClient({ url: REDIS_URL });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.warn('[redis-pub] error:', err.message));
      subClient.on('error', (err) => console.warn('[redis-sub] error:', err.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient as any, subClient as any));
      console.log('[socketServer] Redis adapter attached');
    } catch (err) {
      console.warn('[socketServer] Redis adapter failed, running without it:', err);
    }
  }

  // Auth middleware
  io.use(socketAuth as any);

  // Per-socket handler registration
  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.id} (${socket.data.username})`);

    registerRoomHandlers(io as any, socket as any);
    registerPlaybackHandlers(io as any, socket as any);
    registerRoleHandlers(io as any, socket as any);
    registerRequestHandlers(io as any, socket as any);
    registerChatHandlers(io as any, socket as any);
  });

  // Periodic drift-correction broadcast every 7 seconds (FR-5)
  setInterval(() => {
    const manager = RoomManager.getInstance();
    for (const room of manager.getAllRooms()) {
      if (room.playState === 'playing') {
        room.broadcast('sync_state', room.getSyncState());
      }
    }
  }, 7000);

  // Wire RoomManager to this io instance
  RoomManager.getInstance().setIO(io as any);

  (global as any)[GLOBAL_KEY] = io;
  console.log('[socketServer] Socket.IO server initialized');
  return io;
}
