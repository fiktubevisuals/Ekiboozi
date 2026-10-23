export type QualityTier = 'auto' | '360p' | '720p' | '1080p';

const QUALITY_KEY = 'ekiboozi_video_quality';

export interface QualityOption {
  id: QualityTier;
  label: string;
  badge: string;
  description: string;
  dataSavings: string;
}

export const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: 'auto',
    label: 'Auto (Adaptive)',
    badge: 'Auto',
    description: 'Adjusts automatically based on connection speed',
    dataSavings: 'Balanced',
  },
  {
    id: '360p',
    label: '360p (Low Data Mode)',
    badge: '360p',
    description: 'Optimized for mobile data savings across Uganda',
    dataSavings: '~80% Data Saved',
  },
  {
    id: '720p',
    label: '720p (HD Balanced)',
    badge: '720p',
    description: 'High definition with balanced mobile data usage',
    dataSavings: '~40% Data Saved',
  },
  {
    id: '1080p',
    label: '1080p (Full HD)',
    badge: '1080p',
    description: 'Crisp Full HD streaming for fast Wi-Fi connections',
    dataSavings: 'Full Quality',
  },
];

export function getVideoQualitySetting(): QualityTier {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(QUALITY_KEY) as QualityTier;
    if (saved && ['auto', '360p', '720p', '1080p'].includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'auto';
}

export function setVideoQualitySetting(quality: QualityTier): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUALITY_KEY, quality);
    window.dispatchEvent(new CustomEvent('ekiboozi_quality_changed', { detail: { quality } }));
  } catch (e) {
    console.warn('Could not save video quality preference:', e);
  }
}

export function isLowDataModeActive(): boolean {
  return getVideoQualitySetting() === '360p';
}
