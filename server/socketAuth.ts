import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/events';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function socketAuth(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  next: (err?: Error) => void
) {
  try {
    const token: string =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ?? '');

    if (!token) {
      console.warn('[socketAuth] Handshake rejected: No auth token provided');
      return next(new Error('No token provided'));
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    const jwtKey = process.env.CLERK_JWT_KEY;

    let payload: any;
    try {
      payload = await verifyToken(token, {
        secretKey: secretKey || undefined,
        jwtKey: jwtKey || undefined,
      });
    } catch (verifyErr: any) {
      console.error('[socketAuth] verifyToken failed:', verifyErr?.message || verifyErr);
      return next(new Error(`Authentication failed: ${verifyErr?.message || 'Invalid token'}`));
    }

    const clerkUserId = payload?.sub;
    if (!clerkUserId) {
      return next(new Error('Invalid token: missing sub'));
    }

    let username = 'User';
    let imageUrl = '';

    // Attempt to fetch full user info from Clerk backend, with fallback
    try {
      if (secretKey) {
        const user = await clerk.users.getUser(clerkUserId);
        username =
          user.username ||
          `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
          user.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
          'Anonymous';
        imageUrl = user.imageUrl || '';
      }
    } catch (userFetchErr: any) {
      console.warn('[socketAuth] Could not fetch user profile from Clerk API, using claims fallback:', userFetchErr?.message);
      username =
        payload?.username ||
        payload?.name ||
        (payload?.email ? payload.email.split('@')[0] : null) ||
        `User_${clerkUserId.slice(-4)}`;
      imageUrl = payload?.picture || payload?.image_url || '';
    }

    socket.data.userId = clerkUserId;
    socket.data.username = username || `User_${clerkUserId.slice(-4)}`;
    socket.data.imageUrl = imageUrl;

    next();
  } catch (err: any) {
    console.error('[socketAuth] Unexpected auth error:', err?.message || err);
    next(new Error('Unauthorized'));
  }
}
