/**
 * Google IMA SDK Constants & Sample VAST Ad Tags
 *
 * Official Google Sample Tags from Google Interactive Media Ads docs:
 * https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
 */

export interface SampleAdTag {
  id: string;
  name: string;
  type: 'preroll-linear' | 'preroll-skippable' | 'midroll-vmap' | 'custom';
  description: string;
  url: string;
}

export const SAMPLE_IMA_AD_TAGS: SampleAdTag[] = [
  {
    id: 'google-skippable-linear',
    name: 'Skippable Linear (Standard 30s, Skip after 5s)',
    type: 'preroll-skippable',
    description: 'Official Google Test skippable video ad with a 5-second countdown to skip.',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
  },
  {
    id: 'google-standard-preroll',
    name: 'Standard Pre-Roll (Non-Skippable 15s)',
    type: 'preroll-linear',
    description: 'Standard single non-skippable linear pre-roll ad.',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
  },
  {
    id: 'google-vmap-preroll-midroll',
    name: 'VMAP (Pre-Roll + Mid-Roll @ 15s)',
    type: 'midroll-vmap',
    description: 'Automated VMAP XML ad schedule featuring a pre-roll and a mid-roll at 15 seconds.',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vmap&unviewed_position_start=1&env=vp&impl=s&correlator=',
  },
  {
    id: 'google-ad-pod',
    name: 'Ad Pod (Two 15s Ads in Series)',
    type: 'preroll-linear',
    description: 'Two consecutive video ads back-to-back ("Ad 1 of 2").',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/ad_rule_samples&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
  }
];

/**
 * Replace common VAST / VMAP macro placeholders in an ad tag URL.
 */
export function buildAdTagUrl(baseUrl: string, customParams?: { descriptionUrl?: string; contentTitle?: string }): string {
  const timestamp = Date.now().toString();
  const pageUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://ekiboozi.com');
  const descriptionUrl = encodeURIComponent(customParams?.descriptionUrl || (typeof window !== 'undefined' ? window.location.href : 'https://ekiboozi.com'));

  let url = baseUrl;

  // Append or replace timestamp/correlator
  if (url.includes('correlator=')) {
    url = url.replace(/correlator=[^&]*/, `correlator=${timestamp}`);
  } else if (!url.includes('correlator')) {
    url += `${url.includes('?') ? '&' : '?'}correlator=${timestamp}`;
  }

  // Replace standard GAM/AdSense macros if present
  url = url.replace(/\[timestamp\]/gi, timestamp);
  url = url.replace(/\[correlator\]/gi, timestamp);
  url = url.replace(/\[pageurl\]/gi, pageUrl);
  url = url.replace(/\[description_url\]/gi, descriptionUrl);

  return url;
}

/**
 * Mid-roll cue points calculation strategy
 * For short videos (< 30s): No mid-roll
 * For medium videos (30s - 3 min): 1 mid-roll at 50%
 * For long videos (> 3 min): Mid-roll cue points at 25%, 50%, 75%
 */
export function calculateMidrollCuepoints(durationSeconds: number): number[] {
  if (!durationSeconds || durationSeconds < 30) return [];
  if (durationSeconds <= 180) {
    return [Math.round(durationSeconds * 0.5)];
  }
  return [
    Math.round(durationSeconds * 0.3),
    Math.round(durationSeconds * 0.7)
  ];
}
