import { redirect, notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { RoomClient } from '@/components/room/RoomClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { roomId } = await params;
  return {
    title: `Room ${roomId} — WatchParty`,
    description: `Join room ${roomId} on WatchParty to watch YouTube videos in sync.`,
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { userId } = await auth();
  const user = await currentUser();
  const { roomId } = await params;

  if (!userId) {
    redirect(`/sign-in?redirect_url=/room/${roomId}`);
  }

  await connectToDatabase();
  const room = await Room.findOne({ code: roomId.toUpperCase() });
  if (!room) {
    notFound();
  }

  // Register current user into User collection and Room.members
  const username =
    user?.username ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
    'User';
  const imageUrl = user?.imageUrl || '';

  await User.findOneAndUpdate(
    { clerkId: userId },
    { username, imageUrl },
    { upsert: true, new: true }
  ).catch(() => {});

  let isModified = false;
  const memberIdx = room.members.findIndex((m: { userId: string }) => m.userId === userId);
  if (memberIdx === -1) {
    const role = room.hostId === userId || room.members.length === 0 ? 'Host' : 'Participant';
    room.members.push({ userId, role });
    if (role === 'Host' || !room.hostId) {
      room.hostId = userId;
    }
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
    room.lastActiveAt = new Date();
    await room.save().catch(() => {});
  }

  // Fetch all participant profiles from database
  const memberIds = room.members.map((m: { userId: string }) => m.userId);
  const users = await User.find({ clerkId: { $in: memberIds } }).lean();
  const userMap = new Map(users.map((u: any) => [u.clerkId, u]));

  const initialParticipants = room.members.map((m: { userId: string; role: string }) => {
    const isHost = m.userId === room.hostId || m.role === 'Host';
    const profile = userMap.get(m.userId);
    const uname =
      profile?.username ||
      (m.userId === userId ? username : isHost ? 'Host' : `User ${m.userId.slice(-4)}`);

    return {
      userId: m.userId,
      username: uname,
      imageUrl: profile?.imageUrl || (m.userId === userId ? imageUrl : ''),
      role: isHost ? ('Host' as const) : ((m.role as any) || ('Participant' as const)),
      joinedAt: room.createdAt ? new Date(room.createdAt).getTime() : Date.now(),
    };
  });

  const initialSyncState = {
    videoId: room.currentVideoId || 'VuG7ge_8I2Y',
    playState: (room.playState as 'playing' | 'paused') || 'paused',
    currentTime: room.currentTime || 0,
    updatedAt: room.updatedAt || Date.now(),
  };

  const initialMessages = (room.messages || []).map((m: any) => ({
    userId: m.userId,
    username: m.username,
    text: m.text,
    timestamp: m.timestamp,
  }));

  return (
    <RoomClient
      roomId={roomId.toUpperCase()}
      initialHostId={room.hostId}
      initialVideoId={room.currentVideoId || 'VuG7ge_8I2Y'}
      initialSyncState={initialSyncState}
      initialParticipants={initialParticipants}
      initialMessages={initialMessages}
      isCreator={room.hostId === userId}
      currentUserId={userId}
    />
  );
}
