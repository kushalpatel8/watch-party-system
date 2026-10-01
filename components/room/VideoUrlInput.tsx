'use client';

import { useState } from 'react';
import { getSocket } from '@/lib/socket-client';
import { parseYouTubeUrl } from '@/lib/youtube';
import { Link, X, Check } from 'lucide-react';

interface VideoUrlInputProps {
  disabled?: boolean;
}

export function VideoUrlInput({ disabled }: VideoUrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const videoId = parseYouTubeUrl(url.trim());
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }
    getSocket().emit('change_video', { videoId });
    setUrl('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="video-url-input"
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Paste YouTube URL…"
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {success ? <Check className="w-4 h-4" /> : 'Load'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs px-1">{error}</p>}
    </form>
  );
}
