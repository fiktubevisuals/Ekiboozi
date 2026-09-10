import React from 'react';
import { Video } from '../types';
import { Play, Pause, Maximize2, X, Radio, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

interface MiniPlayerProps {
  video: Video;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  video,
  isPlaying,
  onTogglePlay,
  progress,
  isMuted,
  onToggleMute,
  onExpand,
  onClose,
}) => {
  return (
    <motion.aside
      aria-label="Floating video player"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:w-[380px] bg-[#14171A] border border-[#333A41] rounded-[16px] shadow-2xl overflow-hidden group/mini"
    >
      {/* Top progress bar */}
      <div className="w-full h-1 bg-[#333A41] relative">
        <div
          className="h-full bg-[#F2B705] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3">
        {/* Thumbnail Screen */}
        <div
          onClick={onExpand}
          className={`relative w-20 sm:w-28 aspect-video rounded-[10px] bg-gradient-to-br ${video.thumbnailGradient} flex-shrink-0 cursor-pointer overflow-hidden border border-[#333A41] group/thumb`}
          title="Click to expand player"
        >
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/40 transition-colors flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow" />
          </div>

          {video.isLive ? (
            <div className="absolute bottom-1 left-1 bg-[#E14545] text-white px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </div>
          ) : (
            <div className="absolute bottom-1 right-1 bg-black/80 text-[#F3F1EA] px-1 py-0.2 rounded text-[10px] font-mono">
              {video.duration}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div
          onClick={onExpand}
          className="min-w-0 flex-1 cursor-pointer pr-1"
          title="Click to expand player"
        >
          <div className="flex items-center gap-1.5">
            {video.isLive && (
              <Radio className="w-3 h-3 text-[#E14545] animate-pulse flex-shrink-0" />
            )}
            <h3 className="text-[13px] font-semibold text-[#F3F1EA] truncate group-hover/mini:text-[#F2B705] transition-colors">
              {video.title}
            </h3>
          </div>
          <div className="text-[11.5px] text-[#9BA1A8] truncate mt-0.5">
            {video.channel}
          </div>
          <div className="text-[10.5px] text-[#21A8A3] font-medium mt-0.5">
            {video.isLive ? video.liveViewers || 'Live Stream' : `Playing • ${Math.round(progress)}%`}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] active:scale-95 border border-[#333A41] text-[#F3F1EA] flex items-center justify-center transition-transform cursor-pointer touch-manipulation"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Play className="w-4 h-4 sm:w-3.5 sm:h-3.5 ml-0.5" />
            )}
          </button>

          <button
            onClick={onToggleMute}
            className="w-8 h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] border border-[#333A41] text-[#9BA1A8] hover:text-[#F3F1EA] items-center justify-center transition-colors cursor-pointer hidden sm:flex"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onExpand}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] active:scale-95 border border-[#333A41] text-[#9BA1A8] hover:text-[#F2B705] flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
            title="Expand to full player"
          >
            <Maximize2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] active:scale-95 border border-[#333A41] text-[#9BA1A8] hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
            title="Close mini-player"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
