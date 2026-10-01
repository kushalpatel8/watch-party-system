import { Server } from 'socket.io';
import type { ServerToClientEvents, SyncState, ChangeRequest, ParticipantInfo } from '@/types/events';
import type { Role } from '@/types/roles';
import { Participant } from './Participant';

export class Room {
  public readonly roomId: string; // the room code
  private participants: Map<string, Participant> = new Map(); // userId → Participant
  private io: Server<any, ServerToClientEvents>;

  // Playback state
  public playState: 'playing' | 'paused' = 'paused';
  public currentTime: number = 0;
  public videoId: string | null = 'VuG7ge_8I2Y'; // default: "Maan Meri Jaan" by KING (Hindi) — replace via VideoUrlInput
  public updatedAt: number = Date.now();

  // Pending change requests
  public pendingRequests: Map<string, ChangeRequest> = new Map();

  // Host-disconnect timer
  private hostDisconnectTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, io: Server<any, ServerToClientEvents>) {
    this.roomId = roomId;
    this.io = io;
  }

  // ── Participants ─────────────────────────────────────────────────────────
  addParticipant(p: Participant) {
    this.participants.set(p.userId, p);
  }

  removeParticipant(userId: string): Participant | undefined {
    const p = this.participants.get(userId);
    this.participants.delete(userId);
    return p;
  }

  getParticipant(userId: string): Participant | undefined {
    return this.participants.get(userId);
  }

  getParticipantBySocketId(socketId: string): Participant | undefined {
    return Array.from(this.participants.values()).find(p => p.socketId === socketId);
  }

  getAllParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getParticipantInfos(): ParticipantInfo[] {
    return this.getAllParticipants().map(p => p.toInfo());
  }

  getHost(): Participant | undefined {
    return this.getAllParticipants().find(p => p.role === 'Host');
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  // ── Broadcast ────────────────────────────────────────────────────────────
  broadcast<K extends keyof ServerToClientEvents>(
    event: K,
    payload: Parameters<ServerToClientEvents[K]>[0]
  ) {
    (this.io.to(this.roomId) as any).emit(event, payload);
  }

  broadcastToRoles<K extends keyof ServerToClientEvents>(
    roles: Role[],
    event: K,
    payload: Parameters<ServerToClientEvents[K]>[0]
  ) {
    const targets = this.getAllParticipants().filter(p => roles.includes(p.role));
    for (const t of targets) {
      (this.io.to(t.socketId) as any).emit(event, payload);
    }
  }

  // ── Playback state ────────────────────────────────────────────────────────
  getSyncState(): SyncState {
    return {
      playState: this.playState,
      currentTime: this.currentTime,
      videoId: this.videoId,
      updatedAt: this.updatedAt,
    };
  }

  applyPlay(time: number) {
    this.playState = 'playing';
    this.currentTime = time;
    this.updatedAt = Date.now();
  }

  applyPause(time: number) {
    this.playState = 'paused';
    this.currentTime = time;
    this.updatedAt = Date.now();
  }

  applySeek(time: number) {
    this.currentTime = time;
    this.updatedAt = Date.now();
  }

  applyChangeVideo(videoId: string) {
    this.videoId = videoId;
    this.currentTime = 0;
    this.playState = 'paused';
    this.updatedAt = Date.now();
  }

  // ── Live position for late joiners ───────────────────────────────────────
  getLivePosition(): number {
    if (this.playState === 'playing') {
      return this.currentTime + (Date.now() - this.updatedAt) / 1000;
    }
    return this.currentTime;
  }

  // ── Host disconnect grace period ─────────────────────────────────────────
  startHostDisconnectTimer(onExpire: () => void) {
    this.clearHostDisconnectTimer();
    this.hostDisconnectTimer = setTimeout(onExpire, 60_000);
  }

  clearHostDisconnectTimer() {
    if (this.hostDisconnectTimer) {
      clearTimeout(this.hostDisconnectTimer);
      this.hostDisconnectTimer = null;
    }
  }
}
