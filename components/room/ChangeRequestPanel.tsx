'use client';

import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ChangeRequest } from '@/types/events';

export function ChangeRequestPanel() {
  const { pendingRequests, canControl } = useRoom();
  const socket = getSocket();

  if (!canControl || pendingRequests.length === 0) return null;

  function resolve(requestId: string, approve: boolean) {
    socket.emit('resolve_request', { requestId, approve });
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" />
        <p className="text-sm font-semibold text-amber-400">Pending Requests</p>
      </div>
      {pendingRequests.map((req: ChangeRequest) => (
        <div key={req.requestId} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{req.requesterUsername}</span> requests{' '}
              <span className="text-violet-400 font-mono">{req.type}</span>
              {req.type === 'change_video' && (
                <span className="text-cyan-400"> · {String(req.payload.videoId ?? '').slice(0, 20)}</span>
              )}
              {req.type === 'seek' && (
                <span className="text-cyan-400"> to {Math.round(Number(req.payload.time ?? 0))}s</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id={`approve-${req.requestId}`}
              onClick={() => resolve(req.requestId, true)}
              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              id={`reject-${req.requestId}`}
              onClick={() => resolve(req.requestId, false)}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
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
