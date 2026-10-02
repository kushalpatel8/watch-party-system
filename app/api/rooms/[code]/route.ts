import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const username = searchParams.get('username');
  const imageUrl = searchParams.get('imageUrl') || '';

  await connectToDatabase();

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // If userId is provided, ensure user is registered in room members & User collection
  let isModified = false;
  if (userId) {
    if (username) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        { username, imageUrl },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    const memberIdx = room.members.findIndex((m: { userId: string }) => m.userId === userId);
    if (memberIdx === -1) {
      const role = room.hostId === userId || room.members.length === 0 ? 'Host' : 'Participant';
      room.members.push({ userId, role });
      isModified = true;
    }
    room.lastActiveAt = new Date();
    isModified = true;
  }

  if (isModified) {
    await room.save().catch(() => {});
  }

  // Fetch user profiles for all members to build rich participant list
  const memberIds = room.members.map((m: { userId: string }) => m.userId);
  const users = await User.find({ clerkId: { $in: memberIds } }).lean();
  const userMap = new Map(users.map((u: any) => [u.clerkId, u]));

  const participants = room.members.map((m: { userId: string; role: string }) => {
    const isHost = m.userId === room.hostId || m.role === 'Host';
    const profile = userMap.get(m.userId);
    const uname =
      profile?.username ||
      (isHost ? 'Host' : `User ${m.userId.slice(-4)}`);

    return {
      userId: m.userId,
      username: uname,
      imageUrl: profile?.imageUrl || '',
      role: isHost ? 'Host' : m.role || 'Participant',
      joinedAt: room.createdAt ? new Date(room.createdAt).getTime() : Date.now(),
    };
  });

  return NextResponse.json({
    code: room.code,
    hostId: room.hostId,
    currentVideoId: room.currentVideoId,
    memberCount: room.members.length,
    participants,
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

    // Role assignment or removal
    let room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (body.videoId) {
      room.currentVideoId = body.videoId;
    }
    if (body.hostId) {
      room.hostId = body.hostId;
      const hostMember = room.members.find((m: any) => m.userId === body.hostId);
      if (hostMember) hostMember.role = 'Host';
    }
    if (body.assignRole && body.targetUserId) {
      const target = room.members.find((m: any) => m.userId === body.targetUserId);
      if (target) target.role = body.assignRole;
    }
    if (body.removeUserId) {
      room.members = room.members.filter((m: any) => m.userId !== body.removeUserId);
    }
    room.lastActiveAt = new Date();
    await room.save();

    const memberIds = room.members.map((m: { userId: string }) => m.userId);
    const users = await User.find({ clerkId: { $in: memberIds } }).lean();
    const userMap = new Map(users.map((u: any) => [u.clerkId, u]));

    const participants = room.members.map((m: { userId: string; role: string }) => {
      const isHost = m.userId === room.hostId || m.role === 'Host';
      const profile = userMap.get(m.userId);
      const uname = profile?.username || (isHost ? 'Host' : `User ${m.userId.slice(-4)}`);
      return {
        userId: m.userId,
        username: uname,
        imageUrl: profile?.imageUrl || '',
        role: isHost ? 'Host' : m.role || 'Participant',
        joinedAt: room.createdAt ? new Date(room.createdAt).getTime() : Date.now(),
      };
    });

    return NextResponse.json({
      code: room.code,
      hostId: room.hostId,
      currentVideoId: room.currentVideoId,
      memberCount: room.members.length,
      participants,
      lastActiveAt: room.lastActiveAt,
    });
  } catch (err) {
    console.error('[PATCH /api/rooms/[code]] Error:', err);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
