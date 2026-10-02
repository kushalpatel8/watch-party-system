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

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const rooms = await Room.find({
      $or: [{ hostId: userId }, { 'members.userId': userId }],
    })
      .sort({ lastActiveAt: -1 })
      .limit(30)
      .lean();

    const formatted = rooms.map((r: any) => {
      const isHost = r.hostId === userId;
      const member = r.members?.find((m: any) => m.userId === userId);
      const role = isHost ? 'Host' : member?.role || 'Participant';
      return {
        id: r._id.toString(),
        code: r.code,
        role,
        lastActiveAt: r.lastActiveAt || r.createdAt,
        membersCount: r.members?.length || 1,
        currentVideoId: r.currentVideoId,
      };
    });

    return NextResponse.json({ rooms: formatted });
  } catch (err) {
    console.error('[GET /api/rooms] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // 1. Delete rooms hosted by this user
    await Room.deleteMany({ hostId: userId });

    // 2. Remove user from members in other rooms
    await Room.updateMany(
      { 'members.userId': userId },
      { $pull: { members: { userId } } }
    );

    return NextResponse.json({ success: true, message: 'Past room history cleared' });
  } catch (err) {
    console.error('[DELETE /api/rooms] Error:', err);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
