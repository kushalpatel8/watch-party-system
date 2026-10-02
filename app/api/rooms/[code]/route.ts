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
      if (role === 'Host' || !room.hostId) {
        room.hostId = userId;
      }
      isModified = true;
    }
    room.lastActiveAt = new Date();
    isModified = true;
  }

  // Self-healing automated succession: If host left or is not in members, transfer to Moderator 1 or next viewer
  const hostExists = room.members.some((m: { userId: string; role: string }) => m.userId === room.hostId);
  if (!hostExists && room.members.length > 0) {
    const mods = room.members.filter((m: any) => m.role === 'Moderator');
    const viewers = room.members.filter((m: any) => m.role === 'Participant');
    const newHostMember = mods[0] || viewers[0] || room.members[0];
    if (newHostMember) {
      newHostMember.role = 'Host';
      room.hostId = newHostMember.userId;
      isModified = true;
    }
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

  const syncState = {
    videoId: room.currentVideoId || 'VuG7ge_8I2Y',
    playState: room.playState || 'paused',
    currentTime: room.currentTime || 0,
    updatedAt: room.updatedAt || Date.now(),
  };

  const messages = (room.messages || []).map((m: any) => ({
    id: m.id || `${m.userId}-${m.timestamp}`,
    userId: m.userId,
    username: m.username,
    text: m.text,
    timestamp: m.timestamp,
  }));

  return NextResponse.json({
    code: room.code,
    hostId: room.hostId,
    currentVideoId: room.currentVideoId,
    memberCount: room.members.length,
    participants,
    syncState,
    messages,
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

    let room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (body.videoId) {
      room.currentVideoId = body.videoId;
    }
    if (body.playState && (body.playState === 'playing' || body.playState === 'paused')) {
      room.playState = body.playState;
      room.updatedAt = Date.now();
    }
    if (typeof body.currentTime === 'number') {
      room.currentTime = body.currentTime;
      room.updatedAt = Date.now();
    }
    if (body.hostId) {
      room.hostId = body.hostId;
      const hostMember = room.members.find((m: any) => m.userId === body.hostId);
      if (hostMember) hostMember.role = 'Host';
    }
    if (body.transferHostTo) {
      const oldHost = room.members.find((m: any) => m.userId === room.hostId);
      if (oldHost) oldHost.role = 'Moderator';
      let newHost = room.members.find((m: any) => m.userId === body.transferHostTo);
      if (newHost) {
        newHost.role = 'Host';
      } else {
        room.members.push({ userId: body.transferHostTo, role: 'Host' });
      }
      room.hostId = body.transferHostTo;
    }
    if (body.assignRole && body.targetUserId) {
      const target = room.members.find((m: any) => m.userId === body.targetUserId);
      if (target) {
        target.role = body.assignRole;
        if (body.assignRole === 'Host') {
          const oldHost = room.members.find((m: any) => m.userId === room.hostId && m.userId !== body.targetUserId);
          if (oldHost) oldHost.role = 'Moderator';
          room.hostId = body.targetUserId;
        }
      }
    }
    if (body.leaveUserId || body.removeUserId) {
      const targetId = body.leaveUserId || body.removeUserId;
      const wasHost = room.hostId === targetId;
      room.members = room.members.filter((m: any) => m.userId !== targetId);

      // Automated host succession: If the leaving user was the Host, transfer to Moderator 1, then next viewer
      if (wasHost && room.members.length > 0) {
        const mods = room.members.filter((m: any) => m.role === 'Moderator');
        const viewers = room.members.filter((m: any) => m.role === 'Participant');
        const nextHost = mods[0] || viewers[0] || room.members[0];
        if (nextHost) {
          nextHost.role = 'Host';
          room.hostId = nextHost.userId;
        }
      }
    }

    // Handle chat message persistence with deduplication
    if (body.chatMessage && body.chatMessage.text) {
      const trimmed = String(body.chatMessage.text).trim().slice(0, 500);
      if (trimmed) {
        if (!room.messages) room.messages = [];
        const msgId = body.chatMessage.id || `${body.chatMessage.userId}-${body.chatMessage.timestamp || Date.now()}`;
        const msgTs = body.chatMessage.timestamp || Date.now();

        const isDuplicateInDb = room.messages.some(
          (m: any) =>
            (Boolean(m.id && msgId) && m.id === msgId) ||
            (m.userId === body.chatMessage.userId &&
              m.text === trimmed &&
              Math.abs((m.timestamp || 0) - msgTs) < 5000)
        );

        if (!isDuplicateInDb) {
          room.messages.push({
            id: msgId,
            userId: body.chatMessage.userId || 'user',
            username: body.chatMessage.username || 'User',
            text: trimmed,
            timestamp: msgTs,
          });
          if (room.messages.length > 200) {
            room.messages = room.messages.slice(-200);
          }
        }
      }
    }

    // Self-healing automated succession fallback: If host is not in members and members exist
    const hostExists = room.members.some((m: any) => m.userId === room.hostId);
    if (!hostExists && room.members.length > 0) {
      const mods = room.members.filter((m: any) => m.role === 'Moderator');
      const viewers = room.members.filter((m: any) => m.role === 'Participant');
      const nextHost = mods[0] || viewers[0] || room.members[0];
      if (nextHost) {
        nextHost.role = 'Host';
        room.hostId = nextHost.userId;
      }
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

    const syncState = {
      videoId: room.currentVideoId || 'VuG7ge_8I2Y',
      playState: room.playState || 'paused',
      currentTime: room.currentTime || 0,
      updatedAt: room.updatedAt || Date.now(),
    };

    const messages = (room.messages || []).map((m: any) => ({
      id: m.id || `${m.userId}-${m.timestamp}`,
      userId: m.userId,
      username: m.username,
      text: m.text,
      timestamp: m.timestamp,
    }));

    return NextResponse.json({
      code: room.code,
      hostId: room.hostId,
      currentVideoId: room.currentVideoId,
      memberCount: room.members.length,
      participants,
      syncState,
      messages,
      lastActiveAt: room.lastActiveAt,
    });
  } catch (err) {
    console.error('[PATCH /api/rooms/[code]] Error:', err);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  return PATCH(req, context);
}

