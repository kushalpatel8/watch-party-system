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
