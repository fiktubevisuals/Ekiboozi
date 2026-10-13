// Google IMA SDK TypeScript Type Definitions
declare namespace google {
  export namespace ima {
    export class AdDisplayContainer {
      constructor(containerElement: HTMLElement, videoElement?: HTMLVideoElement, customClickTrackingElement?: HTMLElement);
      initialize(): void;
      destroy(): void;
    }

    export class AdsLoader {
      constructor(container: AdDisplayContainer);
      addEventListener(type: string, callback: (event: any) => void, useCapture?: boolean): void;
      removeEventListener(type: string, callback: (event: any) => void, useCapture?: boolean): void;
      requestAds(request: AdsRequest, userRequestContext?: any): void;
      contentComplete(): void;
      destroy(): void;
      getSettings(): ImaSdkSettings;
    }

    export class ImaSdkSettings {
      setAutoPlayAdBreaks(autoPlay: boolean): void;
      setVpaidMode(mode: any): void;
      setLocale(locale: string): void;
      setNumRedirects(num: number): void;
      setPlayerType(type: string): void;
      setPlayerVersion(version: string): void;
    }

    export class AdsRequest {
      adTagUrl: string;
      linearAdSlotWidth: number;
      linearAdSlotHeight: number;
      nonLinearAdSlotWidth: number;
      nonLinearAdSlotHeight: number;
      contentDuration?: number;
      contentKeywords?: string[];
      contentTitle?: string;
      forceExperimentId?: number;
      liveStreamPrefetchSeconds?: number;
      vastLoadTimeout?: number;
      setAdWillAutoPlay(willAutoPlay: boolean): void;
      setAdWillPlayMuted(willPlayMuted: boolean): void;
    }

    export class AdsManagerLoadedEvent {
      static Type: {
        ADS_MANAGER_LOADED: string;
      };
      getAdsManager(contentPlayhead?: any, adsRenderingSettings?: AdsRenderingSettings): AdsManager;
      getUserRequestContext(): any;
    }

    export class AdsRenderingSettings {
      autoAlign?: boolean;
      bitrate?: number;
      enablePreloading?: boolean;
      mimeTypes?: string[];
      playAdsAfterTime?: number;
      restoreCustomPlaybackStateOnAdBreakComplete?: boolean;
      useStyledLinearId?: boolean;
      useStyledNonLinearId?: boolean;
    }

    export class AdsManager {
      init(width: number, height: number, viewMode: ViewMode): void;
      start(): void;
      stop(): void;
      pause(): void;
      resume(): void;
      resize(width: number, height: number, viewMode: ViewMode): void;
      skip(): void;
      destroy(): void;
      getVolume(): number;
      setVolume(volume: number): void;
      getRemainingTime(): number;
      getCurrentAd(): Ad | null;
      addEventListener(type: string, callback: (event: AdEvent | AdErrorEvent) => void): void;
      removeEventListener(type: string, callback: (event: AdEvent | AdErrorEvent) => void): void;
      getCuePoints(): number[];
    }

    export class AdEvent {
      static Type: {
        ALL_ADS_COMPLETED: string;
        AD_BREAK_READY: string;
        AD_BUFFERING: string;
        AD_CAN_PLAY: string;
        AD_METADATA: string;
        AD_PROGRESS: string;
        CLICK: string;
        COMPLETE: string;
        CONTENT_PAUSE_REQUESTED: string;
        CONTENT_RESUME_REQUESTED: string;
        DURATION_CHANGE: string;
        FIRST_QUARTILE: string;
        IMPRESSION: string;
        INTERACTION: string;
        LINEAR_CHANGED: string;
        LOADED: string;
        LOG: string;
        MIDPOINT: string;
        PAUSED: string;
        RESUMED: string;
        SKIPPABLE_STATE_CHANGED: string;
        SKIPPED: string;
        STARTED: string;
        THIRD_QUARTILE: string;
        USER_CLOSE: string;
        VOLUME_CHANGED: string;
        VOLUME_MUTED: string;
      };
      type: string;
      getAd(): Ad;
      getAdData(): any;
    }

    export class AdErrorEvent {
      static Type: {
        AD_ERROR: string;
      };
      getError(): AdError;
      getUserRequestContext(): any;
    }

    export class AdError {
      getErrorCode(): number;
      getErrorMessage(): string;
      getType(): string;
      getVastErrorCode(): number;
    }

    export class Ad {
      getTitle(): string;
      getDescription(): string;
      getContentType(): string;
      getDuration(): number;
      getAdId(): string;
      getAdSystem(): string;
      getAdvertiserName(): string;
      getAdPodInfo(): AdPodInfo;
      isSkippable(): boolean;
      getSkipTimeOffset(): number;
      getUniversalAdIdValue(): string;
      isLinear(): boolean;
    }

    export class AdPodInfo {
      getAdPosition(): number;
      getTotalAds(): number;
      getPodIndex(): number;
      getTimeOffset(): number;
      getMaxDuration(): number;
    }

    export enum ViewMode {
      NORMAL = 'normal',
      FULLSCREEN = 'fullscreen'
    }
  }
}

interface Window {
  google?: typeof google;
}
