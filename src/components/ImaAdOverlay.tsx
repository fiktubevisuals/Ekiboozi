import React, { useState } from 'react';
import { ImaAdState } from '../hooks/useImaAds';
import { SAMPLE_IMA_AD_TAGS, SampleAdTag } from '../utils/imaConstants';
import { ExternalLink, SkipForward, Play, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ImaAdOverlayProps {
  adContainerRef: React.RefObject<HTMLDivElement | null>;
  adState: ImaAdState;
  onSkipAd: () => void;
  onRequestTestAd: (tagUrl: string) => void;
  onTriggerSimulation?: (title: string) => void;
  isDevMode?: boolean;
}

export const ImaAdOverlay: React.FC<ImaAdOverlayProps> = ({
  adContainerRef,
  adState,
  onSkipAd,
  onRequestTestAd,
  onTriggerSimulation,
  isDevMode = false,
}) => {
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTag, setSelectedTag] = useState<SampleAdTag>(SAMPLE_IMA_AD_TAGS[0]);

  return (
    <>
      {/* 
        Native IMA SDK Container:
        Google IMA SDK injects its HTML5 Ad Player and Clickable Layers inside this DOM node.
      */}
      <div
        id="ima-ad-container"
        ref={adContainerRef}
        className={`absolute inset-0 z-40 ${
          adState.isAdPlaying ? 'pointer-events-auto block' : 'pointer-events-none hidden'
        }`}
      />

      {/* 
        Overlay & Custom UI Controls:
        Active ONLY when a real ad is playing through Google IMA
      */}
      {adState.isAdPlaying && (
        <div className="absolute inset-0 z-45 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200">
          {/* Top Bar: Ad Indicator & Title */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-[6px] bg-[#F2B705] text-[#14171A] text-[11px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14171A] animate-pulse" />
                Ad {adState.adPodTotal > 1 ? `· ${adState.adPodIndex} of ${adState.adPodTotal}` : ''}
              </span>

              <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[12px] text-[#F3F1EA] border border-white/10 flex items-center gap-2 max-w-[240px] sm:max-w-[400px] truncate shadow">
                <span className="truncate font-medium">{adState.adTitle || 'Sponsored Message'}</span>
                {adState.adAdvertiser && (
                  <span className="text-[#9BA1A8] text-[11px]">({adState.adAdvertiser})</span>
                )}
              </div>
            </div>

            {/* Learn More / Visit Advertiser link */}
            <a
              href="https://googleads.g.doubleclick.net"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/75 hover:bg-black/90 backdrop-blur-md px-3 py-1 rounded-full text-[12px] font-semibold text-[#F2B705] border border-[#F2B705]/30 hover:border-[#F2B705] flex items-center gap-1.5 transition-all shadow pointer-events-auto cursor-pointer"
            >
              <span>Visit Advertiser</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Bottom Controls Row: Remaining Time & Skip Button */}
          <div className="flex items-end justify-between pointer-events-auto gap-4">
            {/* Countdown / Ending Info */}
            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[12px] text-white/90 border border-white/10 font-mono shadow flex items-center gap-2">
              <span>Ad ends in {adState.remainingTime}s</span>
            </div>

            {/* Skip Button */}
            <div>
              {adState.skipTimeRemaining > 0 ? (
                <div className="bg-black/85 backdrop-blur-md px-4 py-2 rounded-xl text-[13px] font-bold text-white/70 border border-white/15 shadow-xl font-mono flex items-center gap-2">
                  <span>Skip in {adState.skipTimeRemaining}s</span>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkipAd();
                  }}
                  className="bg-[#F2B705] hover:bg-[#ffc61a] active:scale-95 text-[#14171A] px-5 py-2 rounded-xl text-[13px] font-bold transition-all shadow-2xl flex items-center gap-2 cursor-pointer pointer-events-auto"
                >
                  <span>Skip Ad</span>
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Progress Line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#F2B705] transition-all duration-300 ease-linear"
              style={{
                width: `${
                  adState.adDuration > 0
                    ? ((adState.adDuration - adState.remainingTime) / adState.adDuration) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Developer Toolkit Bar (Strictly hidden for end-users, isDevMode=false by default) */}
      {isDevMode && !adState.isAdPlaying && (
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-md border border-[#333A41] rounded-xl p-2 text-[12px] text-[#F3F1EA] shadow-xl flex flex-col gap-1.5 max-w-[320px]">
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-[#F2B705] hover:text-[#ffc61a] transition-colors w-full cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Google IMA Ad Tester
              </span>
              {showTagSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTagSelector && (
              <div className="pt-2 border-t border-[#333A41] space-y-2 animate-in fade-in duration-150">
                <div className="text-[11px] text-[#9BA1A8]">
                  Test video pre-roll & mid-roll tags compliant with Google IMA HTML5 SDK:
                </div>

                <div className="flex flex-col gap-1">
                  {SAMPLE_IMA_AD_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTag(tag);
                        onRequestTestAd(tag.url);
                      }}
                      className={`text-left px-2 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        selectedTag.id === tag.id
                          ? 'bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/40 font-semibold'
                          : 'hover:bg-white/10 text-[#D1D5DB]'
                      }`}
                    >
                      <span className="truncate">{tag.name}</span>
                      <Play className="w-3 h-3 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {onTriggerSimulation && (
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => onTriggerSimulation('Simulated Pre-roll (15s)')}
                      className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors text-center cursor-pointer"
                    >
                      Simulate Pre-Roll
                    </button>
                    <button
                      onClick={() => onTriggerSimulation('Simulated Mid-roll Ad Break')}
                      className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors text-center cursor-pointer"
                    >
                      Simulate Mid-Roll
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
