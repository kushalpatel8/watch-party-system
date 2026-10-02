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
    // Add protocol if missing
    const formatted = str.startsWith('http') ? str : `https://${str}`;
    const url = new URL(formatted);

    // youtube.com/watch?v=...
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

      const m = url.pathname.match(/\/(embed|shorts|v|live)\/([A-Za-z0-9_-]{11})/);
      if (m && m[2]) return m[2];
    }

    // youtu.be/<id>
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace(/^\//, '').split(/[/?#&]/)[0];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // regex fallback if URL constructor fails
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }

  return null;
}
