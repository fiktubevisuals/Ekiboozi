import { Video } from '../types';

/**
 * Formats seconds into ISO 8601 duration format (e.g., PT1M30S, PT4M15S)
 * Required by Schema.org VideoObject specification for Google Search & AdSense.
 */
export function formatIsoDuration(seconds?: number, durationStr?: string): string {
  let totalSeconds = Number(seconds) || 0;

  // If seconds is 0 or missing, try parsing duration string like "04:15" or "1:02:30"
  if (totalSeconds <= 0 && durationStr) {
    const parts = durationStr.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      totalSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  if (totalSeconds <= 0) {
    totalSeconds = 60; // Safe default 1 min
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0 || hours > 0) result += `${minutes}M`;
  result += `${remainingSeconds}S`;
  return result;
}

/**
 * Normalizes an upload/published date to valid ISO 8601 string.
 */
export function formatUploadDateIso(dateInput?: string): string {
  if (!dateInput) return new Date().toISOString();

  // If it's already an ISO string or valid parseable date
  const parsed = new Date(dateInput);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Fallback to current time if relative string like "3 days ago"
  return new Date().toISOString();
}

/**
 * Resolves absolute URL for canonical paths, images, and videos.
 */
export function getAbsoluteUrl(pathOrUrl?: string, defaultOrigin?: string): string {
  const origin = defaultOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://ekiboozi.com');
  if (!pathOrUrl) return `${origin}/pwa-512x512.png`;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Generates Schema.org/VideoObject JSON-LD structured data for a video.
 * AdSense and Google Search crawlers use this to index video content, duration, author, and thumbnails.
 */
export function generateVideoJsonLd(video: Video, customOrigin?: string): Record<string, any> {
  const origin = customOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://ekiboozi.com');
  const canonicalUrl = `${origin}/?v=${encodeURIComponent(video.id)}`;
  const thumbnailUrl = getAbsoluteUrl(video.thumbnailUrl || '/pwa-512x512.png', origin);
  const uploadDate = formatUploadDateIso(video.createdAt || video.publishedAt || video.timestamp);
  const duration = formatIsoDuration(video.durationSeconds, video.duration);
  const description = video.description?.trim() || `Watch ${video.title} by ${video.channel} on Ekiboozi — the premier stage for authentic African creators and stories.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${canonicalUrl}#video`,
    name: video.title,
    description: description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate: uploadDate,
    duration: duration,
    contentUrl: video.videoUrl ? getAbsoluteUrl(video.videoUrl, origin) : canonicalUrl,
    embedUrl: canonicalUrl,
    genre: video.category || 'Entertainment',
    inLanguage: 'en',
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'https://schema.org/WatchAction' },
        userInteractionCount: video.viewsCount || (parseInt(video.views) || 0)
      },
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'https://schema.org/LikeAction' },
        userInteractionCount: video.likes || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'https://schema.org/CommentAction' },
        userInteractionCount: video.commentsCount || 0
      }
    ],
    author: {
      '@type': 'Person',
      name: video.channel,
      url: `${origin}/?creator=${encodeURIComponent(video.creatorId || '')}`
    },
    creator: {
      '@type': 'Person',
      name: video.channel
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ekiboozi',
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/pwa-512x512.png`,
        width: 512,
        height: 512
      }
    }
  };
}

/**
 * Generates the default Schema.org WebSite & WebApplication structured data when no video is active.
 */
export function generateDefaultSiteJsonLd(customOrigin?: string): Record<string, any> {
  const origin = customOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://ekiboozi.com');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: 'Ekiboozi',
        description: 'Every story has a stage — The video platform for trending stories, authentic creators, and live streams.',
        publisher: {
          '@type': 'Organization',
          name: 'Ekiboozi',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/pwa-512x512.png`
          }
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'WebApplication',
        '@id': `${origin}/#webapp`,
        name: 'Ekiboozi',
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'All',
        url: `${origin}/`,
        description: 'The video platform for trending stories, authentic creators, and live streams in Uganda and East Africa.'
      }
    ]
  };
}

/**
 * Helper to update or create a <meta> element in <head>.
 */
function setOrUpdateMetaTag(keyType: 'name' | 'property', keyName: string, content: string): void {
  if (typeof document === 'undefined') return;

  let meta = document.head.querySelector(`meta[${keyType}="${keyName}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(keyType, keyName);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Helper to update or create a <link> element in <head>.
 */
function setOrUpdateLink(rel: string, href: string): void {
  if (typeof document === 'undefined') return;

  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Helper to set JSON-LD script content in <head>.
 */
function setJsonLdScript(scriptId: string, data: Record<string, any>): void {
  if (typeof document === 'undefined') return;

  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

/**
 * Dynamically updates DOM <head> tags (Title, Description, Canonical URL, Open Graph,
 * Twitter Cards, and Schema.org VideoObject JSON-LD) when viewing an individual video,
 * and restores default app metadata when no video is active.
 */
export function updatePageSeoMetadata(video: Video | null): void {
  if (typeof document === 'undefined') return;

  const origin = window.location.origin;

  if (video) {
    const videoTitle = `${video.title} – Ekiboozi`;
    const cleanDesc = video.description?.trim() 
      ? (video.description.length > 160 ? `${video.description.substring(0, 157)}...` : video.description)
      : `Watch "${video.title}" by ${video.channel} on Ekiboozi — The video platform for trending stories and authentic creators.`;
    const canonicalUrl = `${origin}/?v=${encodeURIComponent(video.id)}`;
    const imageUrl = getAbsoluteUrl(video.thumbnailUrl || '/pwa-512x512.png', origin);
    const uploadDate = formatUploadDateIso(video.createdAt || video.publishedAt || video.timestamp);

    // 1. Basic Page Title & Meta Description
    document.title = videoTitle;
    setOrUpdateMetaTag('name', 'description', cleanDesc);
    setOrUpdateLink('canonical', canonicalUrl);

    // 2. OpenGraph Meta Tags
    setOrUpdateMetaTag('property', 'og:title', videoTitle);
    setOrUpdateMetaTag('property', 'og:description', cleanDesc);
    setOrUpdateMetaTag('property', 'og:type', 'video.other');
    setOrUpdateMetaTag('property', 'og:url', canonicalUrl);
    setOrUpdateMetaTag('property', 'og:image', imageUrl);
    setOrUpdateMetaTag('property', 'og:image:secure_url', imageUrl);
    setOrUpdateMetaTag('property', 'og:image:alt', `${video.title} video thumbnail`);
    setOrUpdateMetaTag('property', 'og:site_name', 'Ekiboozi');

    // Video-specific OpenGraph properties
    if (video.videoUrl) {
      setOrUpdateMetaTag('property', 'og:video', getAbsoluteUrl(video.videoUrl, origin));
      setOrUpdateMetaTag('property', 'og:video:type', 'video/mp4');
    }
    setOrUpdateMetaTag('property', 'video:duration', String(video.durationSeconds || 60));
    setOrUpdateMetaTag('property', 'video:release_date', uploadDate);
    setOrUpdateMetaTag('property', 'video:actor', video.channel);
    setOrUpdateMetaTag('property', 'video:director', video.channel);

    // 3. Twitter / X Cards
    setOrUpdateMetaTag('name', 'twitter:card', 'summary_large_image');
    setOrUpdateMetaTag('name', 'twitter:title', videoTitle);
    setOrUpdateMetaTag('name', 'twitter:description', cleanDesc);
    setOrUpdateMetaTag('name', 'twitter:image', imageUrl);
    setOrUpdateMetaTag('name', 'twitter:image:alt', `${video.title} video thumbnail`);

    // 4. Schema.org JSON-LD VideoObject Structured Data
    const videoJsonLd = generateVideoJsonLd(video, origin);
    setJsonLdScript('schema-video-object', videoJsonLd);

  } else {
    // Restore default site SEO & social metadata
    const defaultTitle = 'Ekiboozi – Every Story Has a Stage';
    const defaultDesc = 'Every story has a stage — The video platform for trending stories, authentic creators, and live streams.';
    const defaultUrl = `${origin}/`;
    const defaultImage = `${origin}/pwa-512x512.png`;

    document.title = defaultTitle;
    setOrUpdateMetaTag('name', 'description', defaultDesc);
    setOrUpdateLink('canonical', defaultUrl);

    setOrUpdateMetaTag('property', 'og:title', 'Ekiboozi');
    setOrUpdateMetaTag('property', 'og:description', defaultDesc);
    setOrUpdateMetaTag('property', 'og:type', 'website');
    setOrUpdateMetaTag('property', 'og:url', defaultUrl);
    setOrUpdateMetaTag('property', 'og:image', defaultImage);
    setOrUpdateMetaTag('property', 'og:image:secure_url', defaultImage);
    setOrUpdateMetaTag('property', 'og:image:alt', 'Ekiboozi Logo and Banner');
    setOrUpdateMetaTag('property', 'og:site_name', 'Ekiboozi');

    // Remove video specific meta tags
    const videoProps = ['og:video', 'og:video:type', 'video:duration', 'video:release_date', 'video:actor', 'video:director'];
    videoProps.forEach((prop) => {
      const el = document.head.querySelector(`meta[property="${prop}"]`);
      if (el) el.remove();
    });

    setOrUpdateMetaTag('name', 'twitter:card', 'summary_large_image');
    setOrUpdateMetaTag('name', 'twitter:title', 'Ekiboozi');
    setOrUpdateMetaTag('name', 'twitter:description', defaultDesc);
    setOrUpdateMetaTag('name', 'twitter:image', defaultImage);

    // Restore WebSite / WebApplication schema
    const siteJsonLd = generateDefaultSiteJsonLd(origin);
    setJsonLdScript('schema-video-object', siteJsonLd);
  }
}
