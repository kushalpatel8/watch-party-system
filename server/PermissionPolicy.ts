import type { Role, Action } from '../types/roles';

type PermissionMatrix = Record<Role, Action[]>;

const PERMISSIONS: PermissionMatrix = {
  Host: ['play', 'pause', 'seek', 'change_video', 'assign_role', 'remove_participant', 'transfer_host', 'approve_request', 'chat', 'react'],
  Moderator: ['play', 'pause', 'seek', 'change_video', 'approve_request', 'chat', 'react'],
  Participant: ['request_change', 'chat', 'react'],
};

export class PermissionPolicy {
  static can(role: Role, action: Action): boolean {
    return PERMISSIONS[role]?.includes(action) ?? false;
  }
}
