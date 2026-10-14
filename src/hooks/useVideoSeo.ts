import { useEffect } from 'react';
import { Video } from '../types';
import { updatePageSeoMetadata } from '../utils/seoUtils';

/**
 * Custom hook to dynamically inject Open Graph, Twitter Cards,
 * and Schema.org VideoObject JSON-LD structured data into the document head
 * whenever an individual video page is active.
 *
 * Automatically restores default site metadata upon closing or switching away.
 */
export function useVideoSeo(video: Video | null): void {
  useEffect(() => {
    updatePageSeoMetadata(video);

    return () => {
      // If unmounting with an active video, reset to default
      if (video) {
        updatePageSeoMetadata(null);
      }
    };
  }, [
    video?.id,
    video?.title,
    video?.description,
    video?.thumbnailUrl,
    video?.viewsCount,
    video?.likes,
    video?.channel,
    video?.durationSeconds
  ]);
}
