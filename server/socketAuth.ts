import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function socketAuth(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  next: (err?: Error) => void
) {
  try {
    const token: string = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No token provided'));
    }

    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUserId = payload.sub;

    // Get user info from Clerk
    const user = await clerk.users.getUser(clerkUserId);
    const username =
      user.username ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
      user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
      'Anonymous';

    socket.data.userId = clerkUserId;
    socket.data.username = username;
    socket.data.imageUrl = user.imageUrl;

    next();
  } catch (err) {
    console.error('[socketAuth] Token verification failed:', err);
    next(new Error('Unauthorized'));
  }
}
