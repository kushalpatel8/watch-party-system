import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await connectToDatabase();

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    hostId: room.hostId,
    currentVideoId: room.currentVideoId,
    memberCount: room.members.length,
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const body = await req.json();
    await connectToDatabase();

    const update: any = { lastActiveAt: new Date() };
    if (body.videoId) {
      update.currentVideoId = body.videoId;
    }
    if (body.hostId) {
      update.hostId = body.hostId;
    }

    const room = await Room.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: update },
      { new: true }
    );

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      code: room.code,
      hostId: room.hostId,
      currentVideoId: room.currentVideoId,
      memberCount: room.members.length,
      lastActiveAt: room.lastActiveAt,
    });
  } catch (err) {
    console.error('[PATCH /api/rooms/[code]] Error:', err);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
