'use client';

import { useRoom } from '@/hooks/useRoom';
import { useRoomStore } from '@/store/roomStore';
import { toast } from '@/store/toastStore';
import { getSocket } from '@/lib/socket-client';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ChangeRequest } from '@/types/events';

export function ChangeRequestPanel() {
  const { pendingRequests, canControl } = useRoom();
  const socket = getSocket();

  if (!canControl || pendingRequests.length === 0) return null;

  function resolve(requestId: string, approve: boolean, requesterUsername: string, type: string) {
    useRoomStore.getState().removeRequest(requestId);
    const label = type === 'change_video' ? 'video change' : type;
    if (approve) {
      toast.success('Request Approved', `You approved ${requesterUsername}'s ${label} request.`);
    } else {
      toast.warning('Request Rejected', `You declined ${requesterUsername}'s ${label} request.`);
    }
    socket.emit('resolve_request', { requestId, approve });
  }

  return (
    <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#d97706] dark:text-amber-400" />
        <p className="text-xs font-bold text-[#b45309] dark:text-amber-400">Pending Requests</p>
      </div>
      {pendingRequests.map((req: ChangeRequest) => (
        <div key={req.requestId} className="flex items-start gap-2.5 bg-white dark:bg-[#1e293b] border border-amber-200/60 dark:border-white/10 rounded-xl p-2.5 shadow-xs">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-700 dark:text-white/80">
              <span className="text-stone-900 dark:text-white font-bold">{req.requesterUsername}</span> requests{' '}
              <span className="text-[#b45309] dark:text-amber-400 font-mono font-bold">{req.type}</span>
              {req.type === 'change_video' && (
                <span className="text-[#d97706] dark:text-amber-300"> · {String(req.payload.videoId ?? '').slice(0, 20)}</span>
              )}
              {req.type === 'seek' && (
                <span className="text-[#d97706] dark:text-amber-300"> to {Math.round(Number(req.payload.time ?? 0))}s</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id={`approve-${req.requestId}`}
              onClick={() => resolve(req.requestId, true, req.requesterUsername, req.type)}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 transition-colors cursor-pointer active:scale-95"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              id={`reject-${req.requestId}`}
              onClick={() => resolve(req.requestId, false, req.requesterUsername, req.type)}
              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-colors cursor-pointer active:scale-95"
              title="Reject"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
