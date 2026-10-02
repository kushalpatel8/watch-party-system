import { redirect, notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
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
  const { roomId } = await params;

  if (!userId) {
    redirect(`/sign-in?redirect_url=/room/${roomId}`);
  }

  await connectToDatabase();
  const room = await Room.findOne({ code: roomId.toUpperCase() });
  if (!room) {
    notFound();
  }

  return (
    <RoomClient
      roomId={roomId.toUpperCase()}
      initialHostId={room.hostId}
      initialVideoId={room.currentVideoId || 'VuG7ge_8I2Y'}
      isCreator={room.hostId === userId}
      currentUserId={userId}
    />
  );
}
