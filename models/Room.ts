import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  code: string;
  hostId: string;
  currentVideoId: string | null;
  createdAt: Date;
  lastActiveAt: Date;
  members: Array<{ userId: string; role: string }>;
}

const RoomSchema = new Schema<IRoom>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  hostId: { type: String, required: true },
  currentVideoId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  members: [
    {
      userId: { type: String, required: true },
      role: { type: String, enum: ['Host', 'Moderator', 'Participant'], default: 'Participant' },
    },
  ],
});

RoomSchema.index({ code: 1 });

export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
