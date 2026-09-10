import React, { useState, useEffect, useRef, memo } from 'react';
import { HeroCarouselItem } from '../types';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface HeroBannerProps {
  heroItems?: HeroCarouselItem[];
  isLoading?: boolean;
  onPlayHero?: (videoId: string) => void;
}

interface HeroSlideProps {
  item: HeroCarouselItem;
  isActive: boolean;
  isAdjacent: boolean;
  index: number;
  onPlayHero?: (videoId: string) => void;
}

const HeroSlide: React.FC<HeroSlideProps> = memo(({
  item,
  isActive,
  isAdjacent,
  index,
  onPlayHero,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine fast poster image
  const posterSrc = item.posterUrl || (item.mediaType === 'image' ? item.mediaUrl : '');

  // Play video only when active, pause when inactive
  useEffect(() => {
    if (item.mediaType !== 'video') return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented or video interrupted, safe to ignore
        });
      }
    } else {
      videoEl.pause();
    }
  }, [isActive, item.mediaType]);

  return (
    <div
      onClick={() => {
        if (item.linkedVideoId && onPlayHero) {
          onPlayHero(item.linkedVideoId);
        }
      }}
      className="w-full min-w-full h-full flex-shrink-0 relative cursor-pointer flex items-end p-3.5 sm:p-7 md:p-9 box-border select-none overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 15% 25%, rgba(242, 183, 5, 0.35), transparent 45%),
          radial-gradient(circle at 85% 75%, rgba(33, 168, 163, 0.35), transparent 50%),
          linear-gradient(135deg, #2A2116 0%, #1A2422 100%)
        `,
      }}
    >
      {/* 1. Fast, progressive poster / background image */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt={item.title}
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          // @ts-ignore fetchPriority is supported in modern browsers
          fetchPriority={index === 0 ? 'high' : 'auto'}
          onLoad={() => setImageLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-60 group-hover:opacity-80' : 'opacity-0'
          }`}
        />
      )}

      {/* 2. Optimized Video Layer (active slide only, with seamless fade-in) */}
      {item.mediaUrl && item.mediaType === 'video' && isActive && (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          autoPlay={isActive}
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${
            videoReady ? 'opacity-65 group-hover:opacity-85' : 'opacity-0'
          }`}
        />
      )}

      {/* 3. Deep Cinematic Contrast Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#14171A] via-black/45 to-transparent pointer-events-none" />

      {/* 4. Slide Content & Action Play Button */}
      <div className="relative z-10 flex items-end justify-between w-full min-w-0 gap-2.5 sm:gap-6 pb-2 sm:pb-2">
        <div className="flex-1 min-w-0 pr-1 sm:pr-2 max-w-[580px]">
          <h2 className="display-font text-base sm:text-[22px] md:text-[30px] font-semibold text-[#F3F1EA] leading-[1.2] tracking-[-0.01em] group-hover:text-white transition-colors drop-shadow-md line-clamp-2">
            {item.title}
          </h2>

          <div className="text-[#9BA1A8] text-[11px] sm:text-[14px] mt-1 sm:mt-1.5 flex items-center gap-2 drop-shadow">
            <span className="font-medium text-[#F3F1EA] truncate">{item.subtitle}</span>
          </div>
        </div>

        {item.linkedVideoId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayHero) onPlayHero(item.linkedVideoId!);
            }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#F2B705] hover:bg-[#F2B705]/95 active:scale-95 text-[#14171A] border-none flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-[0_8px_24px_rgba(242,183,5,0.3)] cursor-pointer focus:outline-none"
            title="Watch Now"
          >
            <svg viewBox="0 0 24 24" fill="#14171A" className="w-4 h-4 sm:w-5 sm:h-5 ml-[2px]">
              <path d="M8 5v14l12-7L8 5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

HeroSlide.displayName = 'HeroSlide';

export const HeroBanner: React.FC<HeroBannerProps> = ({
  heroItems = [],
  isLoading = false,
  onPlayHero,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Preload next slide's image/poster for zero-latency transitions
  useEffect(() => {
    if (!heroItems || heroItems.length <= 1) return;
    const nextIdx = (currentIndex + 1) % heroItems.length;
    const nextItem = heroItems[nextIdx];
    const nextPoster = nextItem?.posterUrl || (nextItem?.mediaType === 'image' ? nextItem?.mediaUrl : '');
    if (nextPoster) {
      const img = new Image();
      img.src = nextPoster;
    }
  }, [currentIndex, heroItems]);

  // Auto-advance every 6s, paused on mouse hover or touch interaction
  useEffect(() => {
    if (!heroItems || heroItems.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroItems, isHovered]);

  const goToNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (heroItems.length > 0) setCurrentIndex((prev) => (prev + 1) % heroItems.length);
  };

  const goToPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (heroItems.length > 0) setCurrentIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      if (diff > 45) {
        goToNext();
      } else if (diff < -45) {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <section className="w-full max-w-[1280px] mx-auto pt-3 sm:pt-8 pb-4 sm:pb-8 px-3.5 sm:px-6 md:px-8 box-border">
      {/* Top Heading */}
      <div className="mb-3 sm:mb-6">
        <h1 className="display-font text-xl sm:text-3xl md:text-[40px] font-bold tracking-[-0.02em] leading-[1.15] max-w-[520px] text-[#F3F1EA]">
          Every story has a stage.
        </h1>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (!heroItems || heroItems.length === 0) ? (
        <div
          className="w-full rounded-[14px] sm:rounded-[20px] aspect-[16/10] sm:aspect-[16/7] md:aspect-[16/6.8] border border-[#333A41] p-6 sm:p-10 flex flex-col justify-end relative overflow-hidden bg-[#1D2126] animate-pulse"
        >
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="w-28 h-5 rounded-full bg-white/10" />
            <div className="w-3/4 h-8 rounded-lg bg-white/10" />
            <div className="w-1/2 h-4 rounded-md bg-white/10" />
          </div>
        </div>
      ) : !heroItems || heroItems.length === 0 ? (
        <div
          className="w-full rounded-[14px] sm:rounded-[20px] aspect-[16/10] sm:aspect-[16/7] md:aspect-[16/6.8] border border-[#333A41] p-6 sm:p-10 flex flex-col justify-end relative overflow-hidden shadow-2xl"
          style={{
            background: `
              radial-gradient(circle at 15% 25%, rgba(242, 183, 5, 0.25), transparent 50%),
              radial-gradient(circle at 85% 75%, rgba(33, 168, 163, 0.25), transparent 50%),
              linear-gradient(135deg, #2A2116 0%, #1A2422 100%)
            `,
          }}
        >
          <div className="relative z-10 max-w-xl">
            <h2 className="display-font text-lg sm:text-2xl md:text-3xl font-bold text-[#F3F1EA] mb-2">
              Welcome to Ekiboozi
            </h2>
            <p className="text-[#9BA1A8] text-xs sm:text-sm md:text-base">
              Discover authentic Ugandan sports, music, comedy, and stories from real creators across the country.
            </p>
          </div>
        </div>
      ) : (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-full rounded-[14px] sm:rounded-[20px] overflow-hidden aspect-[16/10] sm:aspect-[16/7] md:aspect-[16/6.8] border border-[#333A41] group shadow-2xl bg-[#14171A]"
        >
          <div
            className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {heroItems.map((item, idx) => {
              const isActive = idx === currentIndex;
              const isAdjacent =
                Math.abs(idx - currentIndex) === 1 ||
                (currentIndex === 0 && idx === heroItems.length - 1) ||
                (currentIndex === heroItems.length - 1 && idx === 0);

              return (
                <HeroSlide
                  key={item.id || idx}
                  item={item}
                  isActive={isActive}
                  isAdjacent={isAdjacent}
                  index={idx}
                  onPlayHero={onPlayHero}
                />
              );
            })}
          </div>

          {/* Navigation Controls */}
          {heroItems.length > 1 && (
            <>
              {/* Left Arrow */}
              <button
                onClick={goToPrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center border border-white/10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-20 cursor-pointer active:scale-95"
                title="Previous slide"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={goToNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center border border-white/10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-20 cursor-pointer active:scale-95"
                title="Next slide"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 pointer-events-none">
                {heroItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${
                      currentIndex === idx ? 'w-5 sm:w-6 bg-[#F2B705]' : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
