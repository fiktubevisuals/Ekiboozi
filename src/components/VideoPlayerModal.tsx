import React, { useState, useEffect } from 'react';
import { AdBanner } from './AdBanner';
import { Video, Creator, Comment } from '../types';
import { ShareModal } from './ShareModal';
import { formatPublishDate, formatRelativeTime, formatViewCount } from '../utils/dateUtils';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Send,
  Radio,
  Maximize,
  Sparkles,
  Check,
  Minimize2,
  UserPlus,
  Gift,
  PictureInPicture,
  Settings,
  RotateCcw,
  RotateCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface VideoPlayerModalProps {
  video: Video | null;
  creator?: Creator;
  comments: Comment[];
  onClose: () => void;
  onMinimize: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  onProgressChange: (newPct: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleLike: (videoId: string) => void;
  onToggleFollow: (creatorId: string) => void;
  onAddComment: (videoId: string, text: string) => void;
  onSelectCreator: (creatorId: string) => void;
  allVideos: Video[];
  onPlayNext: (video: Video) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  creator,
  comments,
  onClose,
  onMinimize,
  isPlaying,
  onTogglePlay,
  progress,
  onProgressChange,
  isMuted,
  onToggleMute,
  onToggleLike,
  onToggleFollow,
  onAddComment,
  onSelectCreator,
  allVideos,
  onPlayNext,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [isTipMenuOpen, setIsTipMenuOpen] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState('');

  const TIP_OPTIONS = [
    { id: 'boda', label: 'Boda Ride', price: '2,000 UGX', amount: 2000, icon: '🏍️' },
    { id: 'nile', label: 'Nile Special', price: '4,000 UGX', amount: 4000, icon: '🍺' },
    { id: 'rolex', label: 'Rolex (Chapati)', price: '5,000 UGX', amount: 5000, icon: '🍳' },
    { id: 'lunch', label: 'Lunch', price: '10,000 UGX', amount: 10000, icon: '🍛' },
    { id: 'taxi', label: 'Taxi Fare', price: '20,000 UGX', amount: 20000, icon: '🚕' },
    { id: 'gas', label: 'Full Tank', price: '50,000 UGX', amount: 50000, icon: '⛽' },
    { id: 'vip', label: 'VIP Support', price: '100,000 UGX', amount: 100000, icon: '🌟' },
    { id: 'bronze', label: 'Bronze Fan', price: '250,000 UGX', amount: 250000, icon: '🥉' },
    { id: 'silver', label: 'Silver Fan', price: '500,000 UGX', amount: 500000, icon: '🥈' },
    { id: 'gold', label: 'Gold Fan', price: '1,000,000 UGX', amount: 1000000, icon: '🥇' },
    { id: 'platinum', label: 'Platinum Fan', price: '2,000,000 UGX', amount: 2000000, icon: '💎' },
    { id: 'executive', label: 'Exec Producer', price: '5,000,000 UGX', amount: 5000000, icon: '👑' },
  ];

  // Player enhancements state
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [showUpNext, setShowUpNext] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<'rewind' | 'forward' | null>(null);
  const hideControlsTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = React.useRef(false);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Sync active video ID with URL query params for easy sharing
  useEffect(() => {
    if (video?.id) {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.set('v', video.id);
      window.history.replaceState(null, '', `?${currentParams.toString()}`);
    }
  }, [video?.id]);

  // Auto-hide controls timer (keeps controls visible when paused)
  const resetControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Only auto-hide if playing, not currently dragging scrubber, and speed menu is closed
    if (isPlaying && !isDraggingRef.current && !isSpeedMenuOpen) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setIsSpeedMenuOpen(false);
      }, 3500);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      resetControlsTimer();
    }
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, isSpeedMenuOpen]);

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || video?.durationSeconds || 0;
    const newTime = Math.max(0, Math.min(dur, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    onProgressChange(dur > 0 ? (newTime / dur) * 100 : 0);
    setSkipFeedback(seconds < 0 ? 'rewind' : 'forward');
    setTimeout(() => setSkipFeedback(null), 600);
    resetControlsTimer();
  };

  const handleScrub = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const newPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onProgressChange(newPct);
    if (videoRef.current && !isNaN(videoRef.current.duration)) {
      videoRef.current.currentTime = (newPct / 100) * videoRef.current.duration;
    }
    resetControlsTimer();
  };

  const handleStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.interactive-control')) {
      return;
    }
    if (showControls && isPlaying) {
      setShowControls(false);
      setIsSpeedMenuOpen(false);
    } else {
      resetControlsTimer();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when typing in inputs/textareas
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          onTogglePlay();
          resetControlsTimer();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'm':
          onToggleMute();
          resetControlsTimer();
          break;
        case 'p':
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
          } else if (videoRef.current) {
            videoRef.current.requestPictureInPicture().catch(() => {});
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onTogglePlay, onToggleMute]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // When parent updates progress but it isn't playing (e.g. initial load or seek)
  // we might want to seek. We'll handle it simply by relying on native controls if complex,
  // but let's just sync the UI if needed.
  useEffect(() => {
    if (videoRef.current && !isPlaying && Math.abs((videoRef.current.currentTime / videoRef.current.duration) * 100 - progress) > 2) {
        // seek if progress changed significantly from outside
        if (!isNaN(videoRef.current.duration)) {
            videoRef.current.currentTime = (progress / 100) * videoRef.current.duration;
        }
    }
  }, [progress, isPlaying]);

  if (!video) return null;

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP failed', err);
    }
  };

  const toggleFullscreen = () => {
    const vid = videoRef.current as any;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (stageRef.current?.requestFullscreen) {
      stageRef.current.requestFullscreen().catch(() => {
        if (vid?.webkitEnterFullscreen) {
          vid.webkitEnterFullscreen();
        }
      });
    } else if (vid?.webkitEnterFullscreen) {
      vid.webkitEnterFullscreen();
    }
  };

  const handleStageDoubleClick = (e: React.MouseEvent) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      handleSkip(-10);
    } else {
      handleSkip(10);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(video.id, newCommentText.trim());
    setNewCommentText('');
  };

  const [isProcessingTip, setIsProcessingTip] = useState(false);

  const handleSendTip = async (amount: number, label: string, icon: string) => {
    try {
      setIsProcessingTip(true);
      
      // MOCK: Simulate network delay for a real feel, since we don't have Pesapal keys yet
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setIsTipMenuOpen(false);
      setCustomTipAmount('');
      
      const formattedPrice = new Intl.NumberFormat('en-US').format(amount) + ' UGX';
      onAddComment(video.id, `Sent a ${label} ${icon} - ${formattedPrice}`);
      
    } catch (error) {
      console.error('Payment error', error);
      alert('Could not initiate payment. Please try again.');
    } finally {
      setIsProcessingTip(false);
    }
  };

  const handleSendCustomTip = () => {
    const amount = parseFloat(customTipAmount.replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      handleSendTip(amount, 'Custom Gift', '🎁');
    }
  };

  const relatedVideos = allVideos
    .filter((v) => v.id !== video.id)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F0F0F] text-[#F1F1F1] font-sans">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            title="Close player"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="font-semibold text-lg tracking-tight hidden sm:block">
            Ekiboozi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[13px] sm:text-[14px] font-medium bg-white/10 hover:bg-white/20 text-[#F1F1F1] transition-colors cursor-pointer"
            title="Share video"
            id="top-nav-share-btn"
          >
            <Share2 className="w-4 h-4 text-[#F2B705]" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={onMinimize}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[14px] font-medium bg-white/10 hover:bg-white/20 transition-colors"
            title="Minimize to Mini-Player"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Mini-player</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-4 pb-16 flex flex-col lg:flex-row gap-6">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0">
          {/* Video Player Area */}
          <div
            ref={stageRef}
            onClick={handleStageClick}
            onTouchStart={() => resetControlsTimer()}
            onMouseMove={resetControlsTimer}
            onDoubleClick={handleStageDoubleClick}
            className="w-full relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black flex items-center justify-center group select-none cursor-pointer"
          >
            {video.videoUrl ? (
              <video
                ref={videoRef}
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                preload="auto"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                autoPlay={isPlaying}
                playsInline
                muted={isMuted}
                loop={!video.isLive}
                onTimeUpdate={(e) => {
                  const currentTime = e.currentTarget.currentTime;
                  const duration = e.currentTarget.duration;
                  setCurrentPlaybackSeconds(currentTime);
                  const pct = (currentTime / duration) * 100;
                  if (!isNaN(pct)) onProgressChange(pct);
                  if (!video.isLive && duration - currentTime <= 5 && duration > 10) {
                    setShowUpNext(true);
                    setCountdown(Math.ceil(duration - currentTime));
                  } else {
                    setShowUpNext(false);
                  }
                }}
                onLoadedMetadata={(e) => {
                  const params = new URLSearchParams(window.location.search);
                  const tParam = params.get('t');
                  if (tParam) {
                    const sec = parseFloat(tParam);
                    if (!isNaN(sec) && sec > 0 && sec < e.currentTarget.duration) {
                      e.currentTarget.currentTime = sec;
                      setCurrentPlaybackSeconds(sec);
                      onProgressChange((sec / e.currentTarget.duration) * 100);
                    }
                  }
                }}
                onEnded={() => {
                  if (!video.isLive) {
                    if (relatedVideos.length > 0) {
                      onPlayNext(relatedVideos[0]);
                    } else {
                      onTogglePlay();
                    }
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#272727] to-[#0f0f0f] flex items-center justify-center">
                <Play className="w-16 h-16 text-white/20" />
              </div>
            )}

            {/* Skip Feedback Indicators */}
            {skipFeedback === 'rewind' && (
              <div className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 bg-black/85 border border-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-[12px] sm:text-[13px] font-bold flex items-center gap-1.5 animate-pulse pointer-events-none z-30 shadow-2xl">
                <RotateCcw className="w-4 h-4 text-[#F2B705]" /> -10s
              </div>
            )}
            {skipFeedback === 'forward' && (
              <div className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 bg-black/85 border border-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-[12px] sm:text-[13px] font-bold flex items-center gap-1.5 animate-pulse pointer-events-none z-30 shadow-2xl">
                +10s <RotateCw className="w-4 h-4 text-[#F2B705]" />
              </div>
            )}

            {/* Center Controls Cluster (Play/Pause, Skip 10s) */}
            <div
              className={`absolute inset-0 z-20 flex items-center justify-center gap-4 sm:gap-10 transition-opacity duration-300 pointer-events-none ${
                showControls || !isPlaying
                  ? 'opacity-100'
                  : 'opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              {/* Rewind 10s Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip(-10);
                }}
                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/65 hover:bg-black/80 text-white flex flex-col items-center justify-center transition-all active:scale-90 backdrop-blur-sm shadow-xl border border-white/15 hover:border-[#F2B705] touch-manipulation cursor-pointer ${
                  showControls || !isPlaying ? 'pointer-events-auto' : 'pointer-events-none sm:group-hover:pointer-events-auto'
                }`}
                title="Rewind 10s"
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[9px] sm:text-[10px] font-bold leading-none mt-0.5 text-white/90">10s</span>
              </button>

              {/* Big Center Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay();
                  resetControlsTimer();
                }}
                className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#F2B705] text-[#14171A] hover:bg-[#ffc61a] flex items-center justify-center transition-all active:scale-95 shadow-2xl hover:scale-105 touch-manipulation cursor-pointer ${
                  showControls || !isPlaying ? 'pointer-events-auto' : 'pointer-events-none sm:group-hover:pointer-events-auto'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 sm:w-10 sm:h-10 fill-current" />
                ) : (
                  <Play className="w-7 h-7 sm:w-10 sm:h-10 ml-1 fill-current" />
                )}
              </button>

              {/* Fast Forward 10s Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip(10);
                }}
                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/65 hover:bg-black/80 text-white flex flex-col items-center justify-center transition-all active:scale-90 backdrop-blur-sm shadow-xl border border-white/15 hover:border-[#F2B705] touch-manipulation cursor-pointer ${
                  showControls || !isPlaying ? 'pointer-events-auto' : 'pointer-events-none sm:group-hover:pointer-events-auto'
                }`}
                title="Fast Forward 10s"
                aria-label="Fast forward 10 seconds"
              >
                <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[9px] sm:text-[10px] font-bold leading-none mt-0.5 text-white/90">10s</span>
              </button>
            </div>

            {/* Up Next Overlay within video */}
            {showUpNext && relatedVideos.length > 0 && (
              <div className="absolute right-4 bottom-24 bg-black/90 border border-white/10 rounded-xl p-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 z-20 max-w-[300px]">
                <div className="w-20 aspect-video rounded-md bg-[#272727] overflow-hidden flex-shrink-0">
                  {relatedVideos[0].thumbnailUrl ? (
                    <img src={relatedVideos[0].thumbnailUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${relatedVideos[0].thumbnailGradient}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-white/70 mb-0.5">Up next in {countdown}</div>
                  <div className="text-[13px] font-bold text-white truncate">{relatedVideos[0].title}</div>
                </div>
              </div>
            )}

            {/* Playback Controls Bottom Overlay */}
            <div 
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 sm:p-4 pt-8 sm:pt-14 flex flex-col gap-1.5 sm:gap-2 transition-opacity duration-300 z-30 ${
                showControls || !isPlaying 
                  ? 'opacity-100 pointer-events-auto' 
                  : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
              }`}
            >
              {/* Progress Bar with Touch & Mouse Scrubbing */}
              <div
                className="relative group/scrub cursor-pointer py-3 sm:py-3 -my-2 touch-none select-none interactive-control"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  setHoverProgress((clickX / rect.width) * 100);
                }}
                onMouseLeave={() => setHoverProgress(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleScrub(e.clientX, e.currentTarget);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  isDraggingRef.current = true;
                  handleScrub(e.touches[0].clientX, e.currentTarget);
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  handleScrub(e.touches[0].clientX, e.currentTarget);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  isDraggingRef.current = false;
                  resetControlsTimer();
                }}
              >
                {hoverProgress !== null && !video.isLive && (
                  <div 
                    className="absolute bottom-5 -translate-x-1/2 bg-black/90 text-white text-[11px] sm:text-[12px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-white/10"
                    style={{ left: `${hoverProgress}%` }}
                  >
                    {formatTime((hoverProgress / 100) * (videoRef.current?.duration || video.durationSeconds))}
                  </div>
                )}
                {/* Visual Bar with larger touch target */}
                <div className="w-full h-[4px] sm:h-[3px] group-hover/scrub:h-[6px] bg-white/30 rounded-full transition-all relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-[#F2B705] rounded-full transition-[width] duration-75" 
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-[#F2B705] rounded-full shadow-md scale-100 sm:scale-0 sm:group-hover/scrub:scale-100 transition-transform" />
                  </div>
                </div>
              </div>
              
              {/* Controls Row */}
              <div className="flex items-center justify-between text-white text-[12px] sm:text-[14px]">
                {/* Left controls */}
                <div className="flex items-center gap-1 sm:gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePlay(); resetControlsTimer(); }}
                    className="w-9 h-9 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-white hover:text-[#F2B705] transition-colors active:scale-90 touch-manipulation cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleMute(); resetControlsTimer(); }}
                    className="w-9 h-9 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-white hover:text-[#F2B705] transition-colors active:scale-90 touch-manipulation cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-[#E14545]" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>

                  <div className="font-mono text-[11px] sm:text-[13px] text-white/90 select-none pl-0.5 sm:pl-0 whitespace-nowrap">
                    {video.isLive ? (
                      <span className="flex items-center gap-1 text-[#E14545] font-bold">
                        <Radio className="w-3 h-3 animate-pulse" /> LIVE
                      </span>
                    ) : (
                      <span>
                        {formatTime((progress * (videoRef.current?.duration || video.durationSeconds)) / 100)} <span className="text-white/50">/</span> {video.duration}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-0.5 sm:gap-2">
                  {!video.isLive && (
                    <div className="relative interactive-control">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSpeedMenuOpen(!isSpeedMenuOpen);
                        }}
                        className="w-9 h-9 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center gap-1 text-[11px] sm:text-[13px] font-bold text-white hover:text-[#F2B705] transition-colors touch-manipulation cursor-pointer"
                        title="Playback Speed"
                        aria-label="Playback Speed"
                      >
                        {playbackSpeed !== 1 ? (
                          <span className="bg-[#F2B705] text-[#14171A] text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                            {playbackSpeed}x
                          </span>
                        ) : (
                          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>

                      {isSpeedMenuOpen && (
                        <div 
                          className="absolute bottom-full right-0 mb-2 bg-[#1A1D21] border border-[#333A41] rounded-xl shadow-2xl overflow-hidden py-1.5 z-40 min-w-[120px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-1 text-[11px] font-semibold text-[#9BA1A8] uppercase tracking-wider border-b border-[#333A41]/50">
                            Speed
                          </div>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => {
                                setPlaybackSpeed(speed);
                                setIsSpeedMenuOpen(false);
                                resetControlsTimer();
                              }}
                              className={`w-full px-3 py-2 text-[13px] text-left hover:bg-white/10 flex items-center justify-between cursor-pointer ${
                                playbackSpeed === speed ? 'text-[#F2B705] font-bold bg-[#F2B705]/10' : 'text-[#F3F1EA]'
                              }`}
                            >
                              <span>{speed === 1 ? '1x (Normal)' : `${speed}x`}</span>
                              {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-[#F2B705]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {video.videoUrl && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                      className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center text-white hover:text-[#F2B705] transition-colors cursor-pointer"
                      title="Picture in Picture"
                      aria-label="Picture in Picture"
                    >
                      <PictureInPicture className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}

                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                    className="w-9 h-9 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-white hover:text-[#F2B705] transition-colors active:scale-90 touch-manipulation cursor-pointer"
                    title="Fullscreen"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Metadata */}
          <div className="mt-4 mb-6">
            <h1 className="text-[20px] sm:text-[22px] font-bold text-[#F1F1F1] leading-tight mb-3">
              {video.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => onSelectCreator(video.creatorId)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${video.channelAvatar} flex items-center justify-center font-bold text-[#0F0F0F] flex-shrink-0 cursor-pointer`}
                >
                  {video.channelAvatarUrl ? (
                    <img src={video.channelAvatarUrl} alt={video.channel} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    video.channelInitials
                  )}
                </div>
                <div className="mr-2">
                  <div
                    onClick={() => onSelectCreator(video.creatorId)}
                    className="font-bold text-[15px] sm:text-[16px] text-[#F1F1F1] hover:text-[#3EA6FF] cursor-pointer"
                  >
                    {video.channel}
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-[#AAAAAA]">
                    {creator?.subscribers === '1' ? '1 subscriber' : `${creator?.subscribers || '0'} subscribers`}
                  </div>
                </div>
                
                {creator && (
                  <button
                    onClick={() => onToggleFollow(creator.id)}
                    className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[14px] font-medium transition-all ${
                      creator.isFollowed
                        ? 'bg-[#272727] hover:bg-[#3F3F3F] text-[#F1F1F1]'
                        : 'bg-[#F1F1F1] hover:bg-[#D9D9D9] text-[#0F0F0F]'
                    }`}
                  >
                    {creator.isFollowed ? 'Subscribed' : 'Subscribe'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap pb-1 sm:pb-0">
                <div className="flex items-center bg-[#272727] rounded-full flex-shrink-0">
                  <button
                    onClick={() => onToggleLike(video.id)}
                    className={`flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-2.5 rounded-l-full hover:bg-[#3F3F3F] transition-colors border-r border-[#3F3F3F] ${video.isLiked ? 'text-[#F2B705]' : 'text-[#F1F1F1]'}`}
                  >
                    <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-[#F2B705] text-[#F2B705]' : 'text-[#F1F1F1]'}`} />
                    <span className="font-medium text-[14px]">{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(video.likes || 0)}</span>
                  </button>
                  <button className="px-4 py-2 sm:px-4 sm:py-2.5 rounded-r-full hover:bg-[#3F3F3F] transition-colors">
                    <Heart className="w-5 h-5 rotate-180" />
                  </button>
                </div>
                
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-2.5 bg-[#272727] hover:bg-[#3F3F3F] text-[#F1F1F1] rounded-full font-medium text-[14px] transition-colors flex-shrink-0 cursor-pointer active:scale-95 shadow-sm"
                  title="Share this video"
                  id="action-bar-share-btn"
                >
                  <Share2 className="w-5 h-5 text-[#F2B705]" />
                  <span>Share</span>
                </button>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setIsTipMenuOpen(!isTipMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-2.5 bg-[#272727] hover:bg-[#3F3F3F] rounded-full font-medium text-[14px] transition-colors"
                  >
                    <Gift className="w-5 h-5" />
                    <span className="hidden sm:inline">Thanks</span>
                  </button>

                  {/* Gift Modal */}
                  {isTipMenuOpen && (
                    <div 
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                      onClick={() => setIsTipMenuOpen(false)}
                    >
                      <div 
                        className="w-full max-w-[420px] bg-[#272727] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-[#3F3F3F] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-5 py-4 border-b border-[#3F3F3F] flex items-center justify-between">
                          <span className="text-[18px] font-bold text-[#F1F1F1]">Send Super Thanks</span>
                          <button 
                            onClick={() => setIsTipMenuOpen(false)} 
                            className="p-2 -mr-2 hover:bg-[#3F3F3F] rounded-full transition-colors text-[#F1F1F1]"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-5 custom-scrollbar">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {TIP_OPTIONS.map((tip) => (
                              <button
                                key={tip.id}
                                type="button"
                                disabled={isProcessingTip}
                                onClick={() => handleSendTip(tip.amount, tip.label, tip.icon)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isProcessingTip ? 'opacity-50 cursor-not-allowed border-[#3F3F3F] bg-transparent' : 'border-[#3F3F3F] hover:bg-[#3F3F3F] hover:border-[#F1F1F1]/30 cursor-pointer'}`}
                              >
                                <span className="text-[28px] mb-2">{tip.icon}</span>
                                <span className="text-[13px] font-medium text-[#F1F1F1] text-center mb-1">{tip.label}</span>
                                <span className="text-[12px] text-[#AAAAAA] w-full text-center truncate">
                                  {isProcessingTip ? '...' : tip.price}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="px-5 py-4 border-t border-[#3F3F3F] bg-[#121212]/50 flex items-center gap-3">
                          <input
                            type="number"
                            placeholder="Custom UGX..."
                            value={customTipAmount}
                            onChange={(e) => setCustomTipAmount(e.target.value)}
                            disabled={isProcessingTip}
                            className="flex-1 min-w-0 bg-[#0F0F0F] border border-[#3F3F3F] rounded-xl px-4 py-3 text-[14px] text-[#F1F1F1] outline-none focus:border-[#3EA6FF] transition-colors"
                          />
                          <button
                            type="button"
                            onClick={handleSendCustomTip}
                            disabled={!customTipAmount || isProcessingTip || parseFloat(customTipAmount) <= 0}
                            className="px-6 py-3 bg-[#3EA6FF] hover:bg-[#3EA6FF]/90 text-[#0F0F0F] text-[15px] font-bold rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Description Box */}
            <div className="mt-4 bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-xl p-3 sm:p-4 cursor-pointer">
              <div className="text-[14px] font-medium text-[#F1F1F1] mb-1 flex items-center gap-2 flex-wrap">
                <span>{formatViewCount(video.viewsCount, video.views)}</span>
                <span>•</span>
                <span>Uploaded {formatPublishDate(video.createdAt || video.publishedAt || video.timestamp)}</span>
                <span className="text-[#AAAAAA]">({formatRelativeTime(video.createdAt || video.publishedAt || video.timestamp)})</span>
              </div>
              <div className="text-[14px] text-[#F1F1F1] whitespace-pre-wrap leading-relaxed">
                {video.description || 'Watch this amazing content created specifically for Ekiboozi viewers. Subscribe for more!'}
              </div>
            </div>
          </div>

          {/* Comments Section (Desktop: Below Video) */}
          <div className="hidden lg:block">
            <h3 className="text-[20px] font-bold text-[#F1F1F1] mb-6">
              {comments.length} Comments
            </h3>

            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-[#3EA6FF] flex items-center justify-center font-medium text-[#0F0F0F] flex-shrink-0">
                U
              </div>
              <form onSubmit={handleCommentSubmit} className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-transparent border-b border-[#3F3F3F] focus:border-[#F1F1F1] outline-none py-1 text-[14px] text-[#F1F1F1] transition-colors"
                />
                {newCommentText.trim() && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setNewCommentText('')}
                      className="px-4 py-2 rounded-full text-[14px] font-medium text-[#F1F1F1] hover:bg-[#272727]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full text-[14px] font-medium bg-[#3EA6FF] text-[#0F0F0F] hover:bg-[#3EA6FF]/90"
                    >
                      Comment
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="space-y-6">
              {comments.map((comment) => {
                const isTip = comment.text.startsWith('Sent a ') && comment.text.includes('UGX');
                return (
                  <div key={comment.id} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${comment.avatarGradient} flex items-center justify-center font-medium text-[14px] text-[#0F0F0F] flex-shrink-0 overflow-hidden`}>
                      {comment.avatarUrl ? (
                        <img src={comment.avatarUrl} alt={comment.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        comment.authorInitials
                      )}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-[13px] font-medium ${isTip ? 'text-[#F2B705] bg-[#F2B705]/10 px-2 rounded-full' : 'text-[#F1F1F1]'}`}>
                          @{comment.author.replace(/\s+/g, '').toLowerCase()} {isTip && '🌟'}
                        </span>
                        <span className="text-[12px] text-[#AAAAAA]">{comment.timestamp}</span>
                      </div>
                      <div className="text-[14px] text-[#F1F1F1] leading-relaxed mb-2">
                        {comment.text}
                      </div>
                      <div className="flex items-center gap-4 text-[#F1F1F1]">
                        <button className="flex items-center gap-1.5 hover:bg-[#272727] p-1.5 rounded-full">
                          <Heart className="w-4 h-4" />
                          <span className="text-[12px] text-[#AAAAAA]">{comment.likes > 0 ? comment.likes : ''}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:bg-[#272727] p-1.5 rounded-full">
                          <Heart className="w-4 h-4 rotate-180" />
                        </button>
                        <button className="text-[12px] font-medium hover:bg-[#272727] px-3 py-1.5 rounded-full">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Up Next (Desktop) & Comments (Mobile) */}
        <div className="lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col gap-6">
          <AdBanner 
            className="w-full h-[250px] hidden lg:flex" 
            format="rectangle"
            responsive={true}
          />

          {/* Mobile Comments Section (Expandable) */}
          <div className="block lg:hidden bg-[#272727] rounded-xl overflow-hidden transition-all">
            <div 
              onClick={() => setIsMobileCommentsOpen(!isMobileCommentsOpen)}
              className="p-3.5 sm:p-4 cursor-pointer hover:bg-[#323232] transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="text-[15px] font-bold text-[#F1F1F1] flex items-center gap-2">
                  Comments <span className="text-[#AAAAAA] font-normal text-[13px]">{comments.length}</span>
                </h3>
                {!isMobileCommentsOpen && comments.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${comments[0].avatarGradient} flex items-center justify-center text-[9px] font-bold text-[#0F0F0F] flex-shrink-0`}>
                      {comments[0].authorInitials}
                    </div>
                    <p className="text-[12px] text-[#AAAAAA] truncate max-w-[240px]">
                      <span className="text-[#F1F1F1] font-medium mr-1">{comments[0].author}:</span>
                      {comments[0].text}
                    </p>
                  </div>
                )}
                {!isMobileCommentsOpen && comments.length === 0 && (
                  <p className="text-[12px] text-[#AAAAAA] mt-1">Tap to be the first to comment...</p>
                )}
              </div>
              <button 
                type="button" 
                className="p-1.5 text-[#AAAAAA] hover:text-white"
                aria-label={isMobileCommentsOpen ? 'Collapse comments' : 'Expand comments'}
              >
                {isMobileCommentsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isMobileCommentsOpen && (
              <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#3F3F3F]/60 flex flex-col gap-4">
                {/* Mobile Comment Input */}
                <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#3EA6FF] flex items-center justify-center font-bold text-[#0F0F0F] text-[12px] flex-shrink-0">
                      U
                    </div>
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent border-b border-[#3F3F3F] focus:border-[#F1F1F1] outline-none py-1 text-[13px] text-[#F1F1F1] transition-colors"
                    />
                  </div>
                  {newCommentText.trim() && (
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewCommentText('')}
                        className="px-3 py-1.5 rounded-full text-[13px] font-medium text-[#F1F1F1] hover:bg-[#383838]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-full text-[13px] font-medium bg-[#3EA6FF] text-[#0F0F0F] hover:bg-[#3EA6FF]/90"
                      >
                        Comment
                      </button>
                    </div>
                  )}
                </form>

                {/* Mobile Comments List */}
                <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                  {comments.map((comment) => {
                    const isTip = comment.text.startsWith('Sent a ') && comment.text.includes('UGX');
                    return (
                      <div key={comment.id} className="flex gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${comment.avatarGradient} flex items-center justify-center font-medium text-[12px] text-[#0F0F0F] flex-shrink-0 overflow-hidden`}>
                          {comment.avatarUrl ? (
                            <img src={comment.avatarUrl} alt={comment.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            comment.authorInitials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span className={`text-[12px] font-medium ${isTip ? 'text-[#F2B705] bg-[#F2B705]/10 px-1.5 rounded-full' : 'text-[#F1F1F1]'}`}>
                              @{comment.author.replace(/\s+/g, '').toLowerCase()} {isTip && '🌟'}
                            </span>
                            <span className="text-[11px] text-[#AAAAAA]">{comment.timestamp}</span>
                          </div>
                          <div className="text-[13px] text-[#F1F1F1] leading-snug mb-1.5">
                            {comment.text}
                          </div>
                          <div className="flex items-center gap-3 text-[#F1F1F1]">
                            <button className="flex items-center gap-1 hover:bg-[#383838] p-1 rounded-full">
                              <Heart className="w-3.5 h-3.5" />
                              <span className="text-[11px] text-[#AAAAAA]">{comment.likes > 0 ? comment.likes : ''}</span>
                            </button>
                            <button className="flex items-center gap-1 hover:bg-[#383838] p-1 rounded-full">
                              <Heart className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {relatedVideos.map((next) => (
              <div
                key={next.id}
                onClick={() => onPlayNext(next)}
                className="flex gap-2.5 cursor-pointer group"
              >
                <div className={`w-[160px] aspect-video rounded-xl bg-gradient-to-br ${next.thumbnailGradient} relative overflow-hidden flex-shrink-0`}>
                  {next.thumbnailUrl && (
                    <img src={next.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[12px] font-medium text-white">
                    {next.duration}
                  </div>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-[14px] font-medium text-[#F1F1F1] line-clamp-2 leading-snug mb-1 group-hover:text-[#3EA6FF]">
                    {next.title}
                  </div>
                  <div className="text-[12px] text-[#AAAAAA] truncate hover:text-[#F1F1F1]">
                    {next.channel}
                  </div>
                  <div className="text-[12px] text-[#AAAAAA] truncate flex items-center gap-1.5">
                    <span>{formatViewCount(next.viewsCount, next.views)}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(next.createdAt || next.publishedAt || next.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share Video Dialog Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          video={video}
          currentTime={currentPlaybackSeconds || (progress / 100) * (video.durationSeconds || 180)}
        />
      )}
    </div>
  );
};
