import { useState, useEffect, useRef, useCallback } from 'react';
import { SAMPLE_IMA_AD_TAGS, buildAdTagUrl } from '../utils/imaConstants';

export interface UseImaAdsOptions {
  videoElement: HTMLVideoElement | null;
  adContainerElement: HTMLElement | null;
  adTagUrl?: string;
  enablePreroll?: boolean;
  enableMidroll?: boolean;
  midrollCuepoints?: number[];
  onContentPauseRequested?: () => void;
  onContentResumeRequested?: () => void;
}

export interface ImaAdState {
  isAdPlaying: boolean;
  adTitle: string;
  adAdvertiser: string;
  adDuration: number;
  adCurrentTime: number;
  remainingTime: number;
  isSkippable: boolean;
  skipTimeRemaining: number;
  adPodIndex: number;
  adPodTotal: number;
  adError: string | null;
  isSdkLoaded: boolean;
  isSimulation: boolean;
}

export function useImaAds({
  videoElement,
  adContainerElement,
  adTagUrl = SAMPLE_IMA_AD_TAGS[0].url,
  enablePreroll = true,
  enableMidroll = true,
  midrollCuepoints = [],
  onContentPauseRequested,
  onContentResumeRequested,
}: UseImaAdsOptions) {
  const [adState, setAdState] = useState<ImaAdState>({
    isAdPlaying: false,
    adTitle: '',
    adAdvertiser: '',
    adDuration: 0,
    adCurrentTime: 0,
    remainingTime: 0,
    isSkippable: false,
    skipTimeRemaining: 0,
    adPodIndex: 1,
    adPodTotal: 1,
    adError: null,
    isSdkLoaded: false,
    isSimulation: false,
  });

  const adDisplayContainerRef = useRef<google.ima.AdDisplayContainer | null>(null);
  const adsLoaderRef = useRef<google.ima.AdsLoader | null>(null);
  const adsManagerRef = useRef<google.ima.AdsManager | null>(null);
  const isInitializedRef = useRef(false);
  const playedCuepointsRef = useRef<Set<number>>(new Set());
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if IMA SDK is loaded on the window
  useEffect(() => {
    const checkSdk = () => {
      if (typeof window !== 'undefined' && (window as any).google?.ima) {
        setAdState((prev) => ({ ...prev, isSdkLoaded: true }));
      }
    };

    checkSdk();
    const interval = setInterval(checkSdk, 500);
    return () => clearInterval(interval);
  }, []);

  // Cleanup Ads Manager
  const destroyAdsManager = useCallback(() => {
    if (adsManagerRef.current) {
      try {
        adsManagerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying ads manager:', e);
      }
      adsManagerRef.current = null;
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  // Initialize Container and Loader
  const initializeIma = useCallback(() => {
    if (typeof window === 'undefined') return;
    const ima = (window as any).google?.ima;

    if (!ima || !adContainerElement || !videoElement) {
      return false;
    }

    try {
      if (!adDisplayContainerRef.current) {
        adDisplayContainerRef.current = new ima.AdDisplayContainer(adContainerElement, videoElement);
      }

      if (!adsLoaderRef.current) {
        adsLoaderRef.current = new ima.AdsLoader(adDisplayContainerRef.current);

        // AdsManager Loaded listener
        adsLoaderRef.current.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: google.ima.AdsManagerLoadedEvent) => {
            const adsRenderingSettings = new ima.AdsRenderingSettings();
            adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

            const manager = event.getAdsManager(videoElement, adsRenderingSettings);
            adsManagerRef.current = manager;

            // Register Event Listeners
            manager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
              setAdState((prev) => ({ ...prev, isAdPlaying: true, adError: null }));
              onContentPauseRequested?.();
            });

            manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
              setAdState((prev) => ({ ...prev, isAdPlaying: false }));
              onContentResumeRequested?.();
            });

            manager.addEventListener(ima.AdEvent.Type.STARTED, (adEvent: google.ima.AdEvent) => {
              const ad = adEvent.getAd();
              const podInfo = ad.getAdPodInfo();
              setAdState((prev) => ({
                ...prev,
                isAdPlaying: true,
                adTitle: ad.getTitle() || 'Sponsored Video Ad',
                adAdvertiser: ad.getAdvertiserName() || 'Google AdSense Partner',
                adDuration: ad.getDuration() || 15,
                remainingTime: ad.getDuration() || 15,
                isSkippable: ad.isSkippable(),
                skipTimeRemaining: ad.getSkipTimeOffset() || 5,
                adPodIndex: podInfo?.getAdPosition() || 1,
                adPodTotal: podInfo?.getTotalAds() || 1,
                isSimulation: false,
              }));
            });

            manager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, () => {
              if (!manager) return;
              const remaining = manager.getRemainingTime();
              setAdState((prev) => {
                const elapsed = Math.max(0, prev.adDuration - remaining);
                const skipRem = Math.max(0, Math.ceil(5 - elapsed));
                return {
                  ...prev,
                  remainingTime: Math.ceil(remaining),
                  adCurrentTime: elapsed,
                  skipTimeRemaining: skipRem,
                };
              });
            });

            manager.addEventListener(ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, () => {
              setAdState((prev) => ({ ...prev, isSkippable: true, skipTimeRemaining: 0 }));
            });

            manager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
              setAdState((prev) => ({ ...prev, isAdPlaying: false }));
            });

            manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
              setAdState((prev) => ({ ...prev, isAdPlaying: false }));
              destroyAdsManager();
            });

            manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: google.ima.AdErrorEvent) => {
              console.warn('IMA AdsManager Error:', errorEvent.getError()?.getErrorMessage());
              setAdState((prev) => ({
                ...prev,
                isAdPlaying: false,
                adError: errorEvent.getError()?.getErrorMessage() || 'Ad failed to render',
              }));
              destroyAdsManager();
              onContentResumeRequested?.();
            });

            // Initialize and start ads
            try {
              const width = adContainerElement.clientWidth || 640;
              const height = adContainerElement.clientHeight || 360;
              manager.init(width, height, ima.ViewMode.NORMAL);
              manager.start();
            } catch (adError) {
              console.warn('Error starting AdsManager:', adError);
              onContentResumeRequested?.();
            }
          },
          false
        );

        // AdsLoader Error listener
        adsLoaderRef.current.addEventListener(
          ima.AdErrorEvent.Type.AD_ERROR,
          (errorEvent: google.ima.AdErrorEvent) => {
            console.warn('IMA AdsLoader Error:', errorEvent.getError()?.getErrorMessage());
            setAdState((prev) => ({
              ...prev,
              isAdPlaying: false,
              adError: errorEvent.getError()?.getErrorMessage() || 'Ad tag load error',
            }));
            onContentResumeRequested?.();
          },
          false
        );
      }

      return true;
    } catch (err) {
      console.warn('Error during IMA initialization:', err);
      return false;
    }
  }, [adContainerElement, videoElement, onContentPauseRequested, onContentResumeRequested, destroyAdsManager]);

  // Request an Ad Break
  const requestAds = useCallback(
    (customTagUrl?: string, simulationFallback = false) => {
      const targetTag = customTagUrl || adTagUrl;
      const ima = (window as any).google?.ima;

      if (!ima) {
        if (simulationFallback) {
          // Trigger simulation mode only when explicitly requested
          startSimulatedAd('Pre-roll / Mid-roll Simulation');
          return;
        }
        onContentResumeRequested?.();
        return;
      }

      const initialized = initializeIma();
      if (!initialized || !adDisplayContainerRef.current || !adsLoaderRef.current) {
        return;
      }

      try {
        if (!isInitializedRef.current) {
          adDisplayContainerRef.current.initialize();
          isInitializedRef.current = true;
        }

        const adsRequest = new ima.AdsRequest();
        adsRequest.adTagUrl = buildAdTagUrl(targetTag);
        adsRequest.linearAdSlotWidth = adContainerElement?.clientWidth || 640;
        adsRequest.linearAdSlotHeight = adContainerElement?.clientHeight || 360;
        adsRequest.nonLinearAdSlotWidth = adContainerElement?.clientWidth || 640;
        adsRequest.nonLinearAdSlotHeight = 150;
        adsRequest.setAdWillAutoPlay(true);
        adsRequest.setAdWillPlayMuted(false);

        adsLoaderRef.current.requestAds(adsRequest);
      } catch (e) {
        console.warn('Failed to request ads:', e);
        onContentResumeRequested?.();
      }
    },
    [adTagUrl, initializeIma, adContainerElement, onContentResumeRequested]
  );

  // Simulated Ad helper for local development & manual demonstration
  const startSimulatedAd = useCallback(
    (title = 'Sample Sponsored Video Ad (Simulation)') => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      onContentPauseRequested?.();

      let elapsed = 0;
      const duration = 15;

      setAdState({
        isAdPlaying: true,
        adTitle: title,
        adAdvertiser: 'Ekiboozi Partner Brand',
        adDuration: duration,
        adCurrentTime: 0,
        remainingTime: duration,
        isSkippable: true,
        skipTimeRemaining: 5,
        adPodIndex: 1,
        adPodTotal: 1,
        adError: null,
        isSdkLoaded: !!(window as any).google?.ima,
        isSimulation: true,
      });

      simTimerRef.current = setInterval(() => {
        elapsed += 1;
        const remaining = Math.max(0, duration - elapsed);
        const skipRem = Math.max(0, 5 - elapsed);

        if (remaining <= 0) {
          if (simTimerRef.current) clearInterval(simTimerRef.current);
          setAdState((prev) => ({ ...prev, isAdPlaying: false, isSimulation: false }));
          onContentResumeRequested?.();
        } else {
          setAdState((prev) => ({
            ...prev,
            remainingTime: remaining,
            adCurrentTime: elapsed,
            skipTimeRemaining: skipRem,
          }));
        }
      }, 1000);
    },
    [onContentPauseRequested, onContentResumeRequested]
  );

  // Skip Current Ad
  const skipAd = useCallback(() => {
    if (adState.isSimulation) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setAdState((prev) => ({ ...prev, isAdPlaying: false, isSimulation: false }));
      onContentResumeRequested?.();
      return;
    }

    if (adsManagerRef.current) {
      try {
        adsManagerRef.current.skip();
      } catch (e) {
        console.warn('Error skipping ad:', e);
        setAdState((prev) => ({ ...prev, isAdPlaying: false }));
        onContentResumeRequested?.();
      }
    }
  }, [adState.isSimulation, onContentResumeRequested]);

  // Monitor Content Video playback for Mid-roll cue points
  const checkMidroll = useCallback(
    (currentSeconds: number) => {
      if (!enableMidroll || adState.isAdPlaying || midrollCuepoints.length === 0) {
        return;
      }

      for (const cuepoint of midrollCuepoints) {
        if (!playedCuepointsRef.current.has(cuepoint) && Math.abs(currentSeconds - cuepoint) <= 1) {
          playedCuepointsRef.current.add(cuepoint);
          requestAds(adTagUrl, false);
          break;
        }
      }
    },
    [enableMidroll, adState.isAdPlaying, midrollCuepoints, requestAds, adTagUrl]
  );

  // Resize AdsManager when container resizes
  useEffect(() => {
    if (!adsManagerRef.current || !adContainerElement) return;
    const handleResize = () => {
      try {
        const ima = (window as any).google?.ima;
        if (ima && adsManagerRef.current && adContainerElement) {
          adsManagerRef.current.resize(
            adContainerElement.clientWidth,
            adContainerElement.clientHeight,
            ima.ViewMode.NORMAL
          );
        }
      } catch (e) {
        // ignore resize errors
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adContainerElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyAdsManager();
      if (adDisplayContainerRef.current) {
        try {
          adDisplayContainerRef.current.destroy();
        } catch (e) {}
      }
      if (adsLoaderRef.current) {
        try {
          adsLoaderRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [destroyAdsManager]);

  return {
    adState,
    requestAds,
    startSimulatedAd,
    skipAd,
    checkMidroll,
    destroyAdsManager,
    resetPlayedCuepoints: () => {
      playedCuepointsRef.current.clear();
    },
  };
}
