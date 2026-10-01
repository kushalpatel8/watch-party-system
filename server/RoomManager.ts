import { Room } from './Room';
import type { Server } from 'socket.io';
import type { ServerToClientEvents } from '../types/events';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room> = new Map();
  private io!: Server<any, ServerToClientEvents>;

  private constructor() {}

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  setIO(io: Server<any, ServerToClientEvents>) {
    this.io = io;
  }

  getOrCreate(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Room(roomId, this.io));
    }
    return this.rooms.get(roomId)!;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  delete(roomId: string) {
    this.rooms.delete(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}
