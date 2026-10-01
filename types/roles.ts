export type Role = 'Host' | 'Moderator' | 'Participant';

export const ROLES = {
  HOST: 'Host' as Role,
  MODERATOR: 'Moderator' as Role,
  PARTICIPANT: 'Participant' as Role,
};

export type Action =
  | 'play'
  | 'pause'
  | 'seek'
  | 'change_video'
  | 'assign_role'
  | 'remove_participant'
  | 'transfer_host'
  | 'approve_request'
  | 'request_change'
  | 'chat'
  | 'react';
