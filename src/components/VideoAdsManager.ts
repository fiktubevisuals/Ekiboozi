/**
 * VideoAdsManager
 * 
 * Google IMA SDK Manager for VideoPlayerModal
 * Manages the AdDisplayContainer, AdsLoader, AdsManager, and event listeners
 * for all linear in-video ad playback states (Pre-roll, Mid-roll, Skippable)
 * with robust, structured console logging for debugging ad loading & lifecycle.
 */

import { buildAdTagUrl, SAMPLE_IMA_AD_TAGS } from '../utils/imaConstants';

export interface AdInfo {
  title: string;
  advertiser: string;
  duration: number;
  isSkippable: boolean;
  skipTimeOffset: number;
  podIndex: number;
  podTotal: number;
}

export interface AdProgressInfo {
  currentTime: number;
  remainingTime: number;
  skipTimeRemaining: number;
}

export interface VideoAdsManagerCallbacks {
  onAdStart?: (adInfo: AdInfo) => void;
  onAdProgress?: (progress: AdProgressInfo) => void;
  onAdEnd?: () => void;
  onAdError?: (errorMessage: string) => void;
  onContentPauseRequested?: () => void;
  onContentResumeRequested?: () => void;
}

export interface VideoAdsManagerConfig {
  containerElement: HTMLElement;
  videoElement: HTMLVideoElement;
  adTagUrl?: string;
  callbacks?: VideoAdsManagerCallbacks;
}

export class VideoAdsManager {
  private containerElement: HTMLElement;
  private videoElement: HTMLVideoElement;
  private adTagUrl: string;
  private callbacks: VideoAdsManagerCallbacks;

  private adDisplayContainer: google.ima.AdDisplayContainer | null = null;
  private adsLoader: google.ima.AdsLoader | null = null;
  private adsManager: google.ima.AdsManager | null = null;

  private isInitialized = false;
  private isAdPlaying = false;
  private currentAdDuration = 0;
  private lastLoggedSecond = -1;
  private resizeHandler: (() => void) | null = null;
  private simulationTimer: NodeJS.Timeout | null = null;

  constructor(config: VideoAdsManagerConfig) {
    this.containerElement = config.containerElement;
    this.videoElement = config.videoElement;
    this.adTagUrl = config.adTagUrl || SAMPLE_IMA_AD_TAGS[0].url;
    this.callbacks = config.callbacks || {};

    console.log(
      '%c[Google IMA SDK] %cInitialized VideoAdsManager instance. Default VAST tag: %s',
      'color: #F2B705; font-weight: bold;',
      'color: #9BA1A8;',
      this.adTagUrl
    );

    this.setupResizeListener();
  }

  /**
   * Initializes the Google IMA SDK AdDisplayContainer and AdsLoader.
   * Call when user interaction starts or when player is ready.
   */
  public initialize(): boolean {
    if (this.isInitialized) {
      console.log('%c[Google IMA SDK] %cAdDisplayContainer already initialized.', 'color: #F2B705; font-weight: bold;', 'color: #9BA1A8;');
      return true;
    }
    if (typeof window === 'undefined') return false;

    const ima = (window as any).google?.ima;
    if (!ima) {
      console.warn(
        '%c[Google IMA SDK] %cgoogle.ima script not found on window. Will fall back to simulator if requested.',
        'color: #E14545; font-weight: bold;',
        'color: #D1D5DB;'
      );
      return false;
    }

    try {
      console.log(
        '%c[Google IMA SDK] %cCreating AdDisplayContainer and AdsLoader...',
        'color: #F2B705; font-weight: bold;',
        'color: #F3F1EA;'
      );

      this.adDisplayContainer = new ima.AdDisplayContainer(this.containerElement, this.videoElement);
      this.adsLoader = new ima.AdsLoader(this.adDisplayContainer);

      // AdsManager Loaded Listener
      this.adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event: google.ima.AdsManagerLoadedEvent) => this.onAdsManagerLoaded(event),
        false
      );

      // AdsLoader Error Listener
      this.adsLoader.addEventListener(
        ima.AdErrorEvent.Type.AD_ERROR,
        (errorEvent: google.ima.AdErrorEvent) => this.onAdsLoaderError(errorEvent),
        false
      );

      this.isInitialized = true;
      console.log(
        '%c[Google IMA SDK] %cAdDisplayContainer and AdsLoader successfully initialized.',
        'color: #21A8A3; font-weight: bold;',
        'color: #F3F1EA;'
      );
      return true;
    } catch (error) {
      console.error(
        '%c[Google IMA SDK] %cInitialization Error:',
        'color: #E14545; font-weight: bold;',
        'color: #D1D5DB;',
        error
      );
      return false;
    }
  }

  /**
   * Requests an ad break (Pre-roll, Mid-roll, or custom VAST/VMAP URL).
   */
  public requestAds(customTagUrl?: string, simulationFallback = false): void {
    const targetTag = customTagUrl || this.adTagUrl;
    console.log(
      '%c[Google IMA SDK] %cRequesting Ad Break with Tag: %s',
      'color: #F2B705; font-weight: bold;',
      'color: #F3F1EA;',
      targetTag
    );

    const ima = (window as any).google?.ima;

    if (!ima) {
      if (simulationFallback) {
        console.log(
          '%c[Google IMA SDK] %cStarting manual simulation test.',
          'color: #F2B705; font-weight: bold;',
          'color: #9BA1A8;'
        );
        this.startSimulation('Sponsored Video Commercial');
      } else {
        console.log(
          '%c[Google IMA SDK] %cIMA SDK offline/unavailable. Continuing content video without ads.',
          'color: #9BA1A8;',
          'color: #9BA1A8;'
        );
        this.callbacks.onContentResumeRequested?.();
      }
      return;
    }

    if (!this.isInitialized) {
      const initialized = this.initialize();
      if (!initialized) {
        if (simulationFallback) {
          this.startSimulation('Sponsored Video Commercial');
        } else {
          this.callbacks.onContentResumeRequested?.();
        }
        return;
      }
    }

    try {
      // Initialize container on user gesture
      if (this.adDisplayContainer) {
        try {
          this.adDisplayContainer.initialize();
          console.log('%c[Google IMA SDK] %cAdDisplayContainer initialized with user gesture.', 'color: #21A8A3; font-weight: bold;', 'color: #9BA1A8;');
        } catch (e) {
          // Already initialized
        }
      }

      const adsRequest = new ima.AdsRequest();
      adsRequest.adTagUrl = buildAdTagUrl(targetTag);
      adsRequest.linearAdSlotWidth = this.containerElement.clientWidth || 640;
      adsRequest.linearAdSlotHeight = this.containerElement.clientHeight || 360;
      adsRequest.nonLinearAdSlotWidth = this.containerElement.clientWidth || 640;
      adsRequest.nonLinearAdSlotHeight = 150;
      adsRequest.setAdWillAutoPlay(true);
      adsRequest.setAdWillPlayMuted(this.videoElement.muted);

      console.log(
        '%c[Google IMA SDK] %cSending AdsRequest to Google Pubads (Dimensions: %dx%d, Muted: %s)',
        'color: #F2B705; font-weight: bold;',
        'color: #9BA1A8;',
        adsRequest.linearAdSlotWidth,
        adsRequest.linearAdSlotHeight,
        String(this.videoElement.muted)
      );

      if (this.adsLoader) {
        this.adsLoader.requestAds(adsRequest);
      }
    } catch (err) {
      console.error(
        '%c[Google IMA SDK] %cError during requestAds:',
        'color: #E14545; font-weight: bold;',
        'color: #D1D5DB;',
        err
      );
      this.callbacks.onContentResumeRequested?.();
    }
  }

  /**
   * Invoked when AdsManager is loaded by the AdsLoader.
   */
  private onAdsManagerLoaded(event: google.ima.AdsManagerLoadedEvent): void {
    console.log(
      '%c[Google IMA SDK] %cEvent: ADS_MANAGER_LOADED (VAST XML received and parsed)',
      'color: #21A8A3; font-weight: bold;',
      'color: #F3F1EA;'
    );

    const ima = (window as any).google?.ima;
    if (!ima) return;

    try {
      const adsRenderingSettings = new ima.AdsRenderingSettings();
      adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

      this.adsManager = event.getAdsManager(this.videoElement, adsRenderingSettings);

      const cuePoints = this.adsManager.getCuePoints?.() || [];
      console.log(
        '%c[Google IMA SDK] %cAdsManager initialized. Scheduled CuePoints: [%s]',
        'color: #F2B705; font-weight: bold;',
        'color: #9BA1A8;',
        cuePoints.join(', ') || '0 (Pre-roll)'
      );

      // Event: Request to pause content video
      this.adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
        console.log(
          '%c[Google IMA SDK] %cEvent: CONTENT_PAUSE_REQUESTED -> Pausing main content video.',
          'color: #F2B705; font-weight: bold;',
          'color: #F3F1EA;'
        );
        this.isAdPlaying = true;
        this.callbacks.onContentPauseRequested?.();
      });

      // Event: Request to resume content video
      this.adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
        console.log(
          '%c[Google IMA SDK] %cEvent: CONTENT_RESUME_REQUESTED -> Resuming main content video.',
          'color: #21A8A3; font-weight: bold;',
          'color: #F3F1EA;'
        );
        this.isAdPlaying = false;
        this.callbacks.onContentResumeRequested?.();
        this.callbacks.onAdEnd?.();
      });

      // Event: Ad Started
      this.adsManager.addEventListener(ima.AdEvent.Type.STARTED, (adEvent: google.ima.AdEvent) => {
        const ad = adEvent.getAd();
        const podInfo = ad?.getAdPodInfo();
        const duration = ad?.getDuration() || 15;
        this.currentAdDuration = duration;
        this.isAdPlaying = true;
        this.lastLoggedSecond = -1;

        const adDetails: AdInfo = {
          title: ad?.getTitle() || 'Sponsored Advertisement',
          advertiser: ad?.getAdvertiserName() || 'AdSense Partner',
          duration,
          isSkippable: ad?.isSkippable() ?? true,
          skipTimeOffset: ad?.getSkipTimeOffset() || 5,
          podIndex: podInfo?.getAdPosition() || 1,
          podTotal: podInfo?.getTotalAds() || 1,
        };

        console.log(
          '%c[Google IMA SDK] %cEvent: STARTED\n  - Title: %s\n  - Advertiser: %s\n  - Duration: %ds\n  - Skippable: %s (Offset: %ds)\n  - Pod: %d of %d',
          'color: #21A8A3; font-weight: bold;',
          'color: #F3F1EA;',
          adDetails.title,
          adDetails.advertiser,
          adDetails.duration,
          String(adDetails.isSkippable),
          adDetails.skipTimeOffset,
          adDetails.podIndex,
          adDetails.podTotal
        );

        this.callbacks.onAdStart?.(adDetails);
      });

      // Quartile Milestone Events
      this.adsManager.addEventListener(ima.AdEvent.Type.FIRST_QUARTILE, () => {
        console.log('%c[Google IMA SDK] %cEvent: FIRST_QUARTILE (25% watched)', 'color: #F2B705; font-weight: bold;', 'color: #9BA1A8;');
      });

      this.adsManager.addEventListener(ima.AdEvent.Type.MIDPOINT, () => {
        console.log('%c[Google IMA SDK] %cEvent: MIDPOINT (50% watched)', 'color: #F2B705; font-weight: bold;', 'color: #9BA1A8;');
      });

      this.adsManager.addEventListener(ima.AdEvent.Type.THIRD_QUARTILE, () => {
        console.log('%c[Google IMA SDK] %cEvent: THIRD_QUARTILE (75% watched)', 'color: #F2B705; font-weight: bold;', 'color: #9BA1A8;');
      });

      // Event: Ad Progress
      this.adsManager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, () => {
        if (!this.adsManager) return;
        const remaining = Math.ceil(this.adsManager.getRemainingTime());
        const elapsed = Math.max(0, this.currentAdDuration - remaining);
        const skipRemaining = Math.max(0, Math.ceil(5 - elapsed));

        // Throttle console logging to once per second to keep console clean
        if (Math.floor(elapsed) !== this.lastLoggedSecond) {
          this.lastLoggedSecond = Math.floor(elapsed);
          console.log(
            '%c[Google IMA SDK] %cPlayback Progress: %ds / %ds (Remaining: %ds, Skip in: %ds)',
            'color: #F2B705;',
            'color: #9BA1A8;',
            elapsed,
            this.currentAdDuration,
            remaining,
            skipRemaining
          );
        }

        this.callbacks.onAdProgress?.({
          currentTime: elapsed,
          remainingTime: remaining,
          skipTimeRemaining: skipRemaining,
        });
      });

      // Event: Skippable state changed
      this.adsManager.addEventListener(ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, () => {
        console.log(
          '%c[Google IMA SDK] %cEvent: SKIPPABLE_STATE_CHANGED -> "Skip Ad" button is now active.',
          'color: #21A8A3; font-weight: bold;',
          'color: #F3F1EA;'
        );
        this.callbacks.onAdProgress?.({
          currentTime: 5,
          remainingTime: Math.ceil(this.adsManager?.getRemainingTime() || 0),
          skipTimeRemaining: 0,
        });
      });

      // Event: Ad Clicked
      this.adsManager.addEventListener(ima.AdEvent.Type.CLICK, () => {
        console.log('%c[Google IMA SDK] %cEvent: CLICK -> Viewer clicked ad banner/learn more link.', 'color: #21A8A3; font-weight: bold;', 'color: #F3F1EA;');
      });

      // Event: Ad Skipped
      this.adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
        console.log('%c[Google IMA SDK] %cEvent: SKIPPED -> Ad skipped by viewer.', 'color: #F2B705; font-weight: bold;', 'color: #9BA1A8;');
      });

      // Event: Ad Paused / Resumed
      this.adsManager.addEventListener(ima.AdEvent.Type.PAUSED, () => {
        console.log('%c[Google IMA SDK] %cEvent: PAUSED -> Ad playback paused.', 'color: #F2B705;', 'color: #9BA1A8;');
      });

      this.adsManager.addEventListener(ima.AdEvent.Type.RESUMED, () => {
        console.log('%c[Google IMA SDK] %cEvent: RESUMED -> Ad playback resumed.', 'color: #21A8A3;', 'color: #9BA1A8;');
      });

      // Event: Single Ad Complete
      this.adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
        console.log('%c[Google IMA SDK] %cEvent: COMPLETE -> Current ad completed.', 'color: #21A8A3; font-weight: bold;', 'color: #F3F1EA;');
        this.isAdPlaying = false;
        this.callbacks.onAdEnd?.();
      });

      // Event: All Ads Completed
      this.adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
        console.log('%c[Google IMA SDK] %cEvent: ALL_ADS_COMPLETED -> All ads in break completed.', 'color: #21A8A3; font-weight: bold;', 'color: #F3F1EA;');
        this.isAdPlaying = false;
        this.callbacks.onAdEnd?.();
        this.destroyAdsManager();
      });

      // Event: Ad Error
      this.adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: google.ima.AdErrorEvent) => {
        this.onAdError(errorEvent);
      });

      // Initialize and start ad playback
      const width = this.containerElement.clientWidth || 640;
      const height = this.containerElement.clientHeight || 360;
      console.log(
        '%c[Google IMA SDK] %cStarting AdsManager playback with viewport: %dx%d',
        'color: #F2B705; font-weight: bold;',
        'color: #F3F1EA;',
        width,
        height
      );
      this.adsManager.init(width, height, ima.ViewMode.NORMAL);
      this.adsManager.start();
    } catch (err) {
      console.error('%c[Google IMA SDK] %cError configuring AdsManager:', 'color: #E14545; font-weight: bold;', 'color: #D1D5DB;', err);
      this.callbacks.onContentResumeRequested?.();
    }
  }

  /**
   * Fail-safe ad error handler for AdsLoader
   */
  private onAdsLoaderError(errorEvent: google.ima.AdErrorEvent): void {
    const error = errorEvent.getError();
    const errorMsg = error?.getErrorMessage() || 'Failed to load ad tag XML';
    const errorCode = error?.getErrorCode();
    const vastCode = error?.getVastErrorCode?.();

    console.warn(
      '%c[Google IMA SDK] %cAdsLoader Error:\n  - Message: %s\n  - Error Code: %s\n  - VAST Code: %s',
      'color: #E14545; font-weight: bold;',
      'color: #D1D5DB;',
      errorMsg,
      String(errorCode),
      String(vastCode)
    );

    this.isAdPlaying = false;
    this.callbacks.onAdError?.(errorMsg);
    this.callbacks.onContentResumeRequested?.();
  }

  /**
   * Fail-safe ad error handler for AdsManager
   */
  private onAdError(errorEvent: google.ima.AdErrorEvent): void {
    const error = errorEvent.getError();
    const errorMsg = error?.getErrorMessage() || 'Ad playback failed';
    const errorCode = error?.getErrorCode();
    const vastCode = error?.getVastErrorCode?.();

    console.warn(
      '%c[Google IMA SDK] %cAdsManager Playback Error:\n  - Message: %s\n  - Error Code: %s\n  - VAST Code: %s\n  - Type: %s',
      'color: #E14545; font-weight: bold;',
      'color: #D1D5DB;',
      errorMsg,
      String(errorCode),
      String(vastCode),
      error?.getType() || 'unknown'
    );

    this.isAdPlaying = false;
    this.callbacks.onAdError?.(errorMsg);
    this.destroyAdsManager();
    this.callbacks.onContentResumeRequested?.();
  }

  /**
   * Skips the currently playing ad
   */
  public skipAd(): void {
    console.log('%c[Google IMA SDK] %cskipAd() triggered by user action.', 'color: #F2B705; font-weight: bold;', 'color: #F3F1EA;');

    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
      this.isAdPlaying = false;
      this.callbacks.onAdEnd?.();
      this.callbacks.onContentResumeRequested?.();
      return;
    }

    if (this.adsManager) {
      try {
        this.adsManager.skip();
      } catch (e) {
        console.warn('%c[Google IMA SDK] %cError executing adsManager.skip():', 'color: #E14545;', 'color: #D1D5DB;', e);
        this.destroyAdsManager();
        this.callbacks.onContentResumeRequested?.();
      }
    }
  }

  /**
   * Fallback simulator for offline testing or ad-blocker environments
   */
  public startSimulation(title = 'Sample Sponsored Video Commercial'): void {
    console.log(
      '%c[Google IMA SDK] %c[Simulation Mode] Starting simulated 15s commercial break for: "%s"',
      'color: #F2B705; font-weight: bold;',
      'color: #F3F1EA;',
      title
    );

    if (this.simulationTimer) clearInterval(this.simulationTimer);

    this.isAdPlaying = true;
    this.callbacks.onContentPauseRequested?.();

    let elapsed = 0;
    const duration = 15;

    this.callbacks.onAdStart?.({
      title,
      advertiser: 'Ekiboozi Partner Brand',
      duration,
      isSkippable: true,
      skipTimeOffset: 5,
      podIndex: 1,
      podTotal: 1,
    });

    this.simulationTimer = setInterval(() => {
      elapsed += 1;
      const remaining = Math.max(0, duration - elapsed);
      const skipRem = Math.max(0, 5 - elapsed);

      console.log(
        '%c[Google IMA SDK (Sim)] %cElapsed: %ds / %ds (Remaining: %ds, Skip in: %ds)',
        'color: #F2B705;',
        'color: #9BA1A8;',
        elapsed,
        duration,
        remaining,
        skipRem
      );

      if (remaining <= 0) {
        console.log('%c[Google IMA SDK (Sim)] %cSimulation completed. Resuming content video.', 'color: #21A8A3; font-weight: bold;', 'color: #F3F1EA;');
        if (this.simulationTimer) clearInterval(this.simulationTimer);
        this.simulationTimer = null;
        this.isAdPlaying = false;
        this.callbacks.onAdEnd?.();
        this.callbacks.onContentResumeRequested?.();
      } else {
        this.callbacks.onAdProgress?.({
          currentTime: elapsed,
          remainingTime: remaining,
          skipTimeRemaining: skipRem,
        });
      }
    }, 1000);
  }

  /**
   * Window resize listener for responsive ad rendering
   */
  private setupResizeListener(): void {
    this.resizeHandler = () => {
      const ima = (window as any).google?.ima;
      if (this.adsManager && ima && this.containerElement) {
        try {
          const width = this.containerElement.clientWidth;
          const height = this.containerElement.clientHeight;
          console.log(
            '%c[Google IMA SDK] %cResizing AdsManager to: %dx%d',
            'color: #F2B705;',
            'color: #9BA1A8;',
            width,
            height
          );
          this.adsManager.resize(width, height, ima.ViewMode.NORMAL);
        } catch (e) {}
      }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Destroys active AdsManager
   */
  private destroyAdsManager(): void {
    if (this.adsManager) {
      try {
        console.log('%c[Google IMA SDK] %cDestroying active AdsManager instance.', 'color: #9BA1A8; font-style: italic;', 'color: #9BA1A8;');
        this.adsManager.destroy();
      } catch (e) {}
      this.adsManager = null;
    }
  }

  /**
   * Destroys all Google IMA SDK instances and releases memory.
   * Guaranteed cleanup when VideoPlayerModal unmounts or closes.
   */
  public destroy(): void {
    console.log('%c[Google IMA SDK] %cCleaning up and destroying all ad resources.', 'color: #9BA1A8; font-weight: bold;', 'color: #9BA1A8;');

    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.destroyAdsManager();

    if (this.adsLoader) {
      try {
        this.adsLoader.destroy();
      } catch (e) {}
      this.adsLoader = null;
    }

    if (this.adDisplayContainer) {
      try {
        this.adDisplayContainer.destroy();
      } catch (e) {}
      this.adDisplayContainer = null;
    }

    this.isInitialized = false;
    this.isAdPlaying = false;
  }

  public getIsAdPlaying(): boolean {
    return this.isAdPlaying;
  }
}
