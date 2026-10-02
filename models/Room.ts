import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomMessage {
  id?: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface IRoom extends Document {
  code: string;
  hostId: string;
  currentVideoId: string | null;
  playState: 'playing' | 'paused';
  currentTime: number;
  updatedAt: number;
  createdAt: Date;
  lastActiveAt: Date;
  members: Array<{ userId: string; role: string }>;
  messages: Array<IRoomMessage>;
}

const RoomSchema = new Schema<IRoom>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  hostId: { type: String, required: true },
  currentVideoId: { type: String, default: null },
  playState: { type: String, enum: ['playing', 'paused'], default: 'paused' },
  currentTime: { type: Number, default: 0 },
  updatedAt: { type: Number, default: () => Date.now() },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  members: [
    {
      userId: { type: String, required: true },
      role: { type: String, enum: ['Host', 'Moderator', 'Participant'], default: 'Participant' },
    },
  ],
  messages: [
    {
      id: { type: String, default: '' },
      userId: { type: String, required: true },
      username: { type: String, required: true },
      text: { type: String, required: true },
      timestamp: { type: Number, required: true },
    },
  ],
});

RoomSchema.index({ code: 1 });

export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

