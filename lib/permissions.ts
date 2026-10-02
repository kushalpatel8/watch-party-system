import type { Role, Action } from '../types/roles';

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

export async function copyToClipboard(text: string): Promise<boolean> {
  const cleanText = String(text || '').trim();
  if (!cleanText) return false;

  // 1. Try modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch (_) {
      // Fall through to fallback
    }
  }

  // 2. Fallback with textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = cleanText;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, cleanText.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[clipboard] copy failed', err);
    return false;
  }
}
