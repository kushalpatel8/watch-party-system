/**
 * Parse a YouTube URL or bare video ID and return the videoId.
 * Supports: watch?v=, youtu.be/, embed/, shorts/
 */
export function parseYouTubeUrl(input: string): string | null {
  if (!input) return null;
  const str = input.trim();

  // Already a bare video ID (11 chars alphanumeric + _ -)
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;

  try {
    const url = new URL(str);

    // youtube.com/watch?v=
    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      return url.searchParams.get('v');
    }

    // youtu.be/<id>
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('?')[0];
      return id || null;
    }

    // youtube.com/embed/<id>
    // youtube.com/shorts/<id>
    if (url.hostname.includes('youtube.com')) {
      const m = url.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // not a valid URL — fall through
  }

  return null;
}
