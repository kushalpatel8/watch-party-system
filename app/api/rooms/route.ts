import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { generateRoomCode } from '@/lib/roomCode';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  // Upsert user record
  const username =
    (sessionClaims?.username as string) ||
    ((sessionClaims?.firstName as string) && `${sessionClaims.firstName} ${sessionClaims.lastName ?? ''}`.trim()) ||
    'Anonymous';

  await User.findOneAndUpdate(
    { clerkId: userId },
    { username, imageUrl: (sessionClaims?.imageUrl as string) ?? '' },
    { upsert: true, new: true }
  );

  const code = await generateRoomCode();

  const room = await Room.create({
    code,
    hostId: userId,
    members: [{ userId, role: 'Host' }],
  });

  return NextResponse.json({
    code: room.code,
    roomId: room.code,
    url: `/room/${room.code}`,
  }, { status: 201 });
}
