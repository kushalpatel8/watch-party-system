import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { ArrowLeft, Tv2, Plus, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard — WatchParty',
  description: 'Your WatchParty rooms',
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  await connectToDatabase();
  const rooms = await Room.find({
    $or: [{ hostId: userId }, { 'members.userId': userId }],
  })
    .sort({ lastActiveAt: -1 })
    .limit(20)
    .lean();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </Link>
        <div className="flex-1" />
        <UserButton />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Rooms</h1>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> New Room
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Tv2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">You haven't created or joined any rooms yet.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" /> Create your first room
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room: any) => (
              <Link
                key={room._id.toString()}
                href={`/room/${room.code}`}
                className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-violet-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                  <Tv2 className="w-6 h-6 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-lg text-violet-400">{room.code}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Last active: {new Date(room.lastActiveAt).toLocaleDateString()}
                    {room.hostId === userId && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">Host</span>
                    )}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-violet-400 transition-colors text-sm">
                  Join →
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
