import type { Role } from './roles';

// ── Participant shape shared in events ──────────────────────────────────────
export interface ParticipantInfo {
  userId: string;
  username: string;
  imageUrl?: string;
  role: Role;
  joinedAt: number;
}

// ── Playback state ───────────────────────────────────────────────────────────
export interface SyncState {
  playState: 'playing' | 'paused';
  currentTime: number;
  videoId: string | null;
  updatedAt: number;
}

// ── Change request ───────────────────────────────────────────────────────────
export interface ChangeRequest {
  requestId: string;
  requesterUserId: string;
  requesterUsername: string;
  type: 'play' | 'pause' | 'seek' | 'change_video';
  payload: Record<string, unknown>;
  createdAt: number;
}

// ── Client → Server events ───────────────────────────────────────────────────
export interface ClientToServerEvents {
  join_room: (data: { roomId: string }, ack?: (err: string | null) => void) => void;
  leave_room: (data: { roomId: string }) => void;
  play: (data: Record<string, never>) => void;
  pause: (data: Record<string, never>) => void;
  seek: (data: { time: number }) => void;
  change_video: (data: { videoId: string }) => void;
  assign_role: (data: { userId: string; role: Role }) => void;
  remove_participant: (data: { userId: string }) => void;
  transfer_host: (data: { userId: string }) => void;
  request_change: (data: { type: ChangeRequest['type']; payload: Record<string, unknown> }) => void;
  resolve_request: (data: { requestId: string; approve: boolean }) => void;
  chat_message: (data: { text: string }) => void;
  reaction: (data: { emoji: string }) => void;
}

// ── Server → Client events ───────────────────────────────────────────────────
export interface ServerToClientEvents {
  sync_state: (data: SyncState) => void;
  user_joined: (data: { username: string; userId: string; role: Role; participants: ParticipantInfo[] }) => void;
  user_left: (data: { username: string; userId: string; participants: ParticipantInfo[] }) => void;
  role_assigned: (data: { userId: string; username: string; role: Role; participants: ParticipantInfo[] }) => void;
  participant_removed: (data: { userId: string; participants: ParticipantInfo[] }) => void;
  host_transferred: (data: { newHostId: string; newHostUsername: string; participants: ParticipantInfo[] }) => void;
  change_requested: (data: ChangeRequest) => void;
  request_sent: (data: { requestId: string; type: ChangeRequest['type']; payload?: Record<string, unknown> }) => void;
  request_resolved: (data: {
    requestId: string;
    approve: boolean;
    resolverUsername: string;
    requesterUserId?: string;
    requesterUsername?: string;
    type?: ChangeRequest['type'];
    payload?: Record<string, unknown>;
  }) => void;
  chat_message: (data: { userId: string; username: string; text: string; timestamp: number }) => void;
  reaction: (data: { userId: string; username: string; emoji: string; timestamp: number }) => void;
  error: (data: { code: string; message: string }) => void;
}

// ── Socket data (server-side per-socket) ────────────────────────────────────
export interface SocketData {
  userId: string;
  username: string;
  imageUrl?: string;
  roomId?: string;
}
