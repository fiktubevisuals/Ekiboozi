import { Video } from '../types';

export interface SavedOfflineVideo {
  video: Video;
  savedAt: string;
  sizeBytes: number;
}

const CACHE_NAME = 'ekiboozi-offline-videos-v1';
const CATALOG_KEY = 'ekiboozi_offline_catalog';

/**
 * Get catalog of offline saved videos metadata
 */
export function getOfflineCatalog(): SavedOfflineVideo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific video is saved offline
 */
export function isVideoOfflineSync(videoId: string): boolean {
  const catalog = getOfflineCatalog();
  return catalog.some((item) => item.video.id === videoId);
}

/**
 * Save catalog metadata to localStorage
 */
function saveOfflineCatalog(catalog: SavedOfflineVideo[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.warn('Could not update offline catalog in localStorage:', e);
  }
}

/**
 * Save video media and thumbnail into CacheStorage for offline viewing
 */
export async function saveVideoOffline(
  video: Video,
  onProgress?: (progressPercent: number) => void
): Promise<boolean> {
  if (!('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser environment.');
  }

  const cache = await caches.open(CACHE_NAME);
  let totalBytes = 0;

  try {
    // 1. Fetch & Cache Video Media File
    if (video.videoUrl) {
      onProgress?.(10);
      const response = await fetch(video.videoUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to download video file: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (response.body && total > 0) {
        const reader = response.body.getReader();
        let loaded = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            const pct = Math.min(90, Math.round(10 + (loaded / total) * 80));
            onProgress?.(pct);
          }
        }

        const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
        totalBytes = blob.size;
        const blobResponse = new Response(blob, {
          status: 200,
          headers: response.headers,
        });

        await cache.put(video.videoUrl, blobResponse);
      } else {
        // Fallback standard response cache if streaming body reader unavailable
        await cache.put(video.videoUrl, response.clone());
        const blob = await response.blob();
        totalBytes = blob.size;
      }
    }

    // 2. Fetch & Cache Thumbnail Image
    if (video.thumbnailUrl) {
      try {
        const thumbResponse = await fetch(video.thumbnailUrl, { mode: 'cors' });
        if (thumbResponse.ok) {
          await cache.put(video.thumbnailUrl, thumbResponse);
        }
      } catch {
        // Thumbnail cache optional failure
      }
    }

    // 3. Update Catalog
    const existing = getOfflineCatalog().filter((item) => item.video.id !== video.id);
    const newItem: SavedOfflineVideo = {
      video,
      savedAt: new Date().toISOString(),
      sizeBytes: totalBytes,
    };
    saveOfflineCatalog([newItem, ...existing]);

    onProgress?.(100);
    return true;
  } catch (error: any) {
    console.error('Error caching video offline:', error);
    throw new Error(error.message || 'Failed to cache video for offline playback.');
  }
}

/**
 * Remove a cached video from CacheStorage
 */
export async function removeOfflineVideo(videoId: string): Promise<boolean> {
  if (!('caches' in window)) return false;

  const catalog = getOfflineCatalog();
  const target = catalog.find((item) => item.video.id === videoId);

  if (target) {
    try {
      const cache = await caches.open(CACHE_NAME);
      if (target.video.videoUrl) {
        await cache.delete(target.video.videoUrl);
      }
      if (target.video.thumbnailUrl) {
        await cache.delete(target.video.thumbnailUrl);
      }
    } catch {
      // Ignore cache deletion errors
    }

    const updated = catalog.filter((item) => item.video.id !== videoId);
    saveOfflineCatalog(updated);
    return true;
  }

  return false;
}

/**
 * Retrieve cached blob URL for offline video playback
 */
export async function getOfflineVideoBlobUrl(videoUrl: string): Promise<string | null> {
  if (!('caches' in window) || !videoUrl) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(videoUrl);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Could not match offline video cache:', err);
  }

  return null;
}

/**
 * Calculate human-readable storage size (e.g. "45.2 MB")
 */
export function formatStorageSize(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Total size of all offline saved videos
 */
export function getTotalOfflineStorageUsed(): string {
  const catalog = getOfflineCatalog();
  const totalBytes = catalog.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
  return formatStorageSize(totalBytes);
}
