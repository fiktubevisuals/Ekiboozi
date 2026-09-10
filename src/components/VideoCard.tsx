import React from 'react';
import { Video } from '../types';
import { formatRelativeTime, formatViewCount } from '../utils/dateUtils';
import { Heart } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onSelectCreator?: (creatorId: string) => void;
  onToggleLike?: (videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay, onSelectCreator, onToggleLike }) => {
  return (
    <div
      className="flex flex-col gap-2.5 group cursor-pointer"
      id={`video-card-${video.id}`}
    >
      {/* Thumbnail */}
      <div
        onClick={() => onPlay(video)}
        className={`relative aspect-[16/10] rounded-[14px] overflow-hidden border border-[#333A41] bg-gradient-to-br ${video.thumbnailGradient} transition-transform duration-200 group-hover:border-[#9BA1A8]/40 shadow-sm`}
      >
        {video.thumbnailUrl && (
          <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        {/* Hover Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Centered Play Button on Hover */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 w-11 h-11 rounded-full bg-[#14171A]/75 border border-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xs shadow-md">
          <svg viewBox="0 0 24 24" fill="#F3F1EA" className="w-[15px] h-[15px] ml-[2px]">
            <path d="M8 5v14l12-7L8 5z" />
          </svg>
        </div>

        {/* Live / Duration Badge */}
        {video.isLive ? (
          <div className="absolute bottom-2 right-2 bg-[#E14545] text-white px-2 py-0.5 rounded-[5px] text-[11px] font-bold tracking-wide flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            LIVE
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 bg-[#0A0C0D]/80 backdrop-blur-xs text-[#F3F1EA] px-[7px] py-[2px] rounded-[5px] text-[12px] font-semibold tabular-nums border border-white/5">
            {video.duration}
          </div>
        )}
      </div>

      {/* Info Row */}
      <div className="flex gap-[11px] items-start">
        {/* Channel Avatar */}
        <button
          onClick={(e) => {
            if (onSelectCreator) {
              e.stopPropagation();
              onSelectCreator(video.creatorId);
            }
          }}
          className={`w-[34px] h-[34px] rounded-full bg-gradient-to-br ${video.channelAvatar} flex items-center justify-center text-[12px] font-bold text-[#14171A] flex-shrink-0 mt-[2px] hover:scale-105 transition-transform cursor-pointer overflow-hidden shadow-sm`}
          title={`View ${video.channel}`}
        >
          {video.channelAvatarUrl ? (
            <img src={video.channelAvatarUrl} alt={video.channel} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            video.channelInitials
          )}
        </button>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => onPlay(video)}
            className="text-[14.5px] font-semibold leading-[1.4] text-[#F3F1EA] group-hover:text-white transition-colors line-clamp-2"
            title={video.title}
          >
            {video.title}
          </h3>
          <div
            onClick={(e) => {
              if (onSelectCreator) {
                e.stopPropagation();
                onSelectCreator(video.creatorId);
              }
            }}
            className="text-[13px] text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors mt-1 truncate"
          >
            {video.channel}
          </div>
          <div className="flex items-center justify-between mt-[2px]">
            <div className="text-[13px] text-[#656C73] truncate flex items-center gap-1.5">
              <span>{formatViewCount(video.viewsCount, video.views)}</span>
              <span>·</span>
              <span>{formatRelativeTime(video.createdAt || video.publishedAt || video.timestamp)}</span>
            </div>
            
            {onToggleLike && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(video.id);
                }}
                className="flex items-center gap-1 hover:text-[#F2B705] transition-colors"
              >
                <Heart className={`w-4 h-4 ${video.isLiked ? 'fill-[#F2B705] text-[#F2B705]' : 'text-[#656C73]'}`} />
              </button>
            )}
          </div>
          {video.description && (
            <p className="text-[12px] text-[#656C73] mt-1.5 line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
