import { customAlphabet } from 'nanoid';
import { connectToDatabase } from './db';
import { Room } from '../models/Room';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

/**
 * Generate a unique 6-char alphanumeric room code that doesn't collide with existing ones.
 * Retries up to 5 times on collision.
 */
export async function generateRoomCode(): Promise<string> {
  await connectToDatabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = nanoid();
    const exists = await Room.findOne({ code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique room code after 5 attempts');
}
