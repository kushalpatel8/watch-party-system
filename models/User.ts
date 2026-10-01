import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  username: string;
  imageUrl: string;
}

const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  imageUrl: { type: String, default: '' },
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
