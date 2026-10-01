import type { Role, Action } from '@/types/roles';

// Client-side mirror of the server PermissionPolicy
// Used to disable UI controls for unauthorized users
const PERMISSIONS: Record<Role, Action[]> = {
  Host: ['play', 'pause', 'seek', 'change_video', 'assign_role', 'remove_participant', 'transfer_host', 'approve_request', 'chat', 'react'],
  Moderator: ['play', 'pause', 'seek', 'change_video', 'approve_request', 'chat', 'react'],
  Participant: ['request_change', 'chat', 'react'],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}
