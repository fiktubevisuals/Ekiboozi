/**
 * VideoAdsManager
 * 
 * Google IMA SDK Manager for VideoPlayerModal
 * Handles the complete lifecycle of Pre-roll and Mid-roll linear video ads:
 * - AdDisplayContainer initialization
 * - AdsLoader & AdsManager creation
 * - Content Pause/Resume synchronization
 * - Event callbacks for Ad Progress, Skipping, Completion, and Error handling
 * - Comprehensive resource cleanup when the modal closes
 */

import { buildAdTagUrl, SAMPLE_IMA_AD_TAGS } from './imaConstants';

export interface VideoAdsManagerCallbacks {
  onAdStart?: (adInfo: { title: string; advertiser: string; duration: number; isSkippable: boolean; skipTimeOffset: number; podIndex: number; podTotal: number }) => void;
  onAdProgress?: (progress: { currentTime: number; remainingTime: number; skipTimeRemaining: number }) => void;
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
  private resizeHandler: (() => void) | null = null;
  private simulationTimer: NodeJS.Timeout | null = null;

  constructor(config: VideoAdsManagerConfig) {
    this.containerElement = config.containerElement;
    this.videoElement = config.videoElement;
    this.adTagUrl = config.adTagUrl || SAMPLE_IMA_AD_TAGS[0].url;
    this.callbacks = config.callbacks || {};

    this.setupResizeListener();
  }

  /**
   * Initializes the Google IMA SDK AdDisplayContainer and AdsLoader
   */
  public initialize(): boolean {
    if (this.isInitialized) return true;
    if (typeof window === 'undefined') return false;

    const ima = (window as any).google?.ima;
    if (!ima) {
      console.warn('[VideoAdsManager] Google IMA SDK script not found on window.');
      return false;
    }

    try {
      this.adDisplayContainer = new ima.AdDisplayContainer(this.containerElement, this.videoElement);
      this.adsLoader = new ima.AdsLoader(this.adDisplayContainer);

      // Setup AdsManager Loaded Listener
      this.adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event: google.ima.AdsManagerLoadedEvent) => this.onAdsManagerLoaded(event),
        false
      );

      // Setup AdsLoader Error Listener
      this.adsLoader.addEventListener(
        ima.AdErrorEvent.Type.AD_ERROR,
        (errorEvent: google.ima.AdErrorEvent) => this.onAdError(errorEvent),
        false
      );

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[VideoAdsManager] Initialization error:', error);
      return false;
    }
  }

  /**
   * Request an ad break (Pre-roll, Mid-roll, or custom VAST tag)
   */
  public requestAds(customTagUrl?: string, simulationFallback = true): void {
    const ima = (window as any).google?.ima;

    if (!ima) {
      if (simulationFallback) {
        this.startSimulation('Sponsored Video Commercial');
      }
      return;
    }

    if (!this.isInitialized) {
      const initialized = this.initialize();
      if (!initialized) {
        if (simulationFallback) this.startSimulation('Sponsored Video Commercial');
        return;
      }
    }

    try {
      // Container initialization on user gesture
      if (this.adDisplayContainer) {
        try {
          this.adDisplayContainer.initialize();
        } catch (e) {
          // Already initialized
        }
      }

      const targetTag = customTagUrl || this.adTagUrl;
      const adsRequest = new ima.AdsRequest();
      adsRequest.adTagUrl = buildAdTagUrl(targetTag);
      adsRequest.linearAdSlotWidth = this.containerElement.clientWidth || 640;
      adsRequest.linearAdSlotHeight = this.containerElement.clientHeight || 360;
      adsRequest.nonLinearAdSlotWidth = this.containerElement.clientWidth || 640;
      adsRequest.nonLinearAdSlotHeight = 150;
      adsRequest.setAdWillAutoPlay(true);
      adsRequest.setAdWillPlayMuted(this.videoElement.muted);

      if (this.adsLoader) {
        this.adsLoader.requestAds(adsRequest);
      }
    } catch (err) {
      console.warn('[VideoAdsManager] Request ads error:', err);
      this.callbacks.onContentResumeRequested?.();
    }
  }

  /**
   * Handle AdsManager Loaded
   */
  private onAdsManagerLoaded(event: google.ima.AdsManagerLoadedEvent): void {
    const ima = (window as any).google?.ima;
    if (!ima) return;

    try {
      const adsRenderingSettings = new ima.AdsRenderingSettings();
      adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

      this.adsManager = event.getAdsManager(this.videoElement, adsRenderingSettings);

      // Event: Pause content video when ad is ready
      this.adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
        this.isAdPlaying = true;
        this.callbacks.onContentPauseRequested?.();
      });

      // Event: Resume content video when ad break completes
      this.adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
        this.isAdPlaying = false;
        this.callbacks.onContentResumeRequested?.();
        this.callbacks.onAdEnd?.();
      });

      // Event: Ad Started
      this.adsManager.addEventListener(ima.AdEvent.Type.STARTED, (adEvent: google.ima.AdEvent) => {
        const ad = adEvent.getAd();
        const podInfo = ad.getAdPodInfo();
        const duration = ad.getDuration() || 15;
        this.currentAdDuration = duration;
        this.isAdPlaying = true;

        this.callbacks.onAdStart?.({
          title: ad.getTitle() || 'Sponsored Advertisement',
          advertiser: ad.getAdvertiserName() || 'AdSense Partner',
          duration,
          isSkippable: ad.isSkippable(),
          skipTimeOffset: ad.getSkipTimeOffset() || 5,
          podIndex: podInfo?.getAdPosition() || 1,
          podTotal: podInfo?.getTotalAds() || 1,
        });
      });

      // Event: Ad Progress
      this.adsManager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, () => {
        if (!this.adsManager) return;
        const remaining = Math.ceil(this.adsManager.getRemainingTime());
        const elapsed = Math.max(0, this.currentAdDuration - remaining);
        const skipRemaining = Math.max(0, Math.ceil(5 - elapsed));

        this.callbacks.onAdProgress?.({
          currentTime: elapsed,
          remainingTime: remaining,
          skipTimeRemaining: skipRemaining,
        });
      });

      // Event: Ad Complete
      this.adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
        this.isAdPlaying = false;
        this.callbacks.onAdEnd?.();
      });

      // Event: All Ads Completed
      this.adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
        this.isAdPlaying = false;
        this.callbacks.onAdEnd?.();
        this.destroyAdsManager();
      });

      // Event: Ad Error
      this.adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: google.ima.AdErrorEvent) => {
        this.onAdError(errorEvent);
      });

      // Start the Ads Manager
      const width = this.containerElement.clientWidth || 640;
      const height = this.containerElement.clientHeight || 360;
      this.adsManager.init(width, height, ima.ViewMode.NORMAL);
      this.adsManager.start();
    } catch (err) {
      console.warn('[VideoAdsManager] Error configuring AdsManager:', err);
      this.callbacks.onContentResumeRequested?.();
    }
  }

  /**
   * Handle Ad Errors
   */
  private onAdError(errorEvent: google.ima.AdErrorEvent): void {
    const errorMsg = errorEvent.getError()?.getErrorMessage() || 'Ad failed to play';
    console.warn('[VideoAdsManager] Ad Error:', errorMsg);
    this.isAdPlaying = false;
    this.callbacks.onAdError?.(errorMsg);
    this.destroyAdsManager();
    this.callbacks.onContentResumeRequested?.();
  }

  /**
   * Skip current ad
   */
  public skipAd(): void {
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
        console.warn('[VideoAdsManager] Error skipping ad:', e);
        this.destroyAdsManager();
        this.callbacks.onContentResumeRequested?.();
      }
    }
  }

  /**
   * Fallback simulation mode for testing / ad-blocker environments
   */
  public startSimulation(title = 'Sample Sponsored Video Commercial'): void {
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

      if (remaining <= 0) {
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
   * Setup responsive resize observer
   */
  private setupResizeListener(): void {
    this.resizeHandler = () => {
      const ima = (window as any).google?.ima;
      if (this.adsManager && ima && this.containerElement) {
        try {
          this.adsManager.resize(
            this.containerElement.clientWidth,
            this.containerElement.clientHeight,
            ima.ViewMode.NORMAL
          );
        } catch (e) {}
      }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Destroy AdsManager instance
   */
  private destroyAdsManager(): void {
    if (this.adsManager) {
      try {
        this.adsManager.destroy();
      } catch (e) {}
      this.adsManager = null;
    }
  }

  /**
   * Clean up all ad resources, event listeners, and DOM elements
   * Called when VideoPlayerModal closes / unmounts
   */
  public destroy(): void {
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
