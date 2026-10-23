const BUFFER_CACHE_NAME = 'ekiboozi-media-buffer-v1';
const activePrebuffers = new Set<string>();

/**
 * Background prebuffers a video media stream into CacheStorage as it plays,
 * ensuring continuous stutter-free playback and offline buffer completion.
 */
export async function prebufferVideoInBackground(
  videoUrl: string,
  onBufferedPercent?: (pct: number) => void
): Promise<void> {
  if (!videoUrl || activePrebuffers.has(videoUrl)) return;
  if (!('caches' in window)) return;

  activePrebuffers.add(videoUrl);

  try {
    const cache = await caches.open(BUFFER_CACHE_NAME);
    const existing = await cache.match(videoUrl);

    // If already fully cached in CacheStorage, notify 100% and finish
    if (existing) {
      onBufferedPercent?.(100);
      activePrebuffers.delete(videoUrl);
      return;
    }

    // Fetch video in background with stream reading
    const response = await fetch(videoUrl, { mode: 'cors' });
    if (!response.ok) {
      activePrebuffers.delete(videoUrl);
      return;
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (response.body && totalBytes > 0) {
      const reader = response.body.getReader();
      let loadedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const pct = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
          onBufferedPercent?.(pct);
        }
      }

      // Store complete response in cache
      const fullBlob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
      const cachedResponse = new Response(fullBlob, {
        status: 200,
        headers: response.headers,
      });
      await cache.put(videoUrl, cachedResponse);
    } else {
      // Fallback cache put
      await cache.put(videoUrl, response.clone());
    }

    onBufferedPercent?.(100);
  } catch (err) {
    console.warn('Background prebuffer info:', err);
  } finally {
    activePrebuffers.delete(videoUrl);
  }
}

/**
 * Low-priority background prebuffer for the upcoming video in playlist/queue
 */
export function prebufferNextUpVideo(nextVideoUrl?: string): void {
  if (!nextVideoUrl) return;

  const scheduleTask = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
  scheduleTask(() => {
    prebufferVideoInBackground(nextVideoUrl).catch(() => {});
  });
}
