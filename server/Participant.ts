import type { Role } from '../types/roles';
import type { ParticipantInfo } from '../types/events';

export class Participant {
  public readonly userId: string;
  public readonly username: string;
  public readonly imageUrl: string;
  public role: Role;
  public readonly joinedAt: number;
  public socketId: string;

  constructor(opts: {
    userId: string;
    username: string;
    imageUrl?: string;
    role: Role;
    socketId: string;
    joinedAt?: number;
  }) {
    this.userId = opts.userId;
    this.username = opts.username;
    this.imageUrl = opts.imageUrl ?? '';
    this.role = opts.role;
    this.socketId = opts.socketId;
    this.joinedAt = opts.joinedAt ?? Date.now();
  }

  toInfo(): ParticipantInfo {
    return {
      userId: this.userId,
      username: this.username,
      imageUrl: this.imageUrl,
      role: this.role,
      joinedAt: this.joinedAt,
    };
  }
}
