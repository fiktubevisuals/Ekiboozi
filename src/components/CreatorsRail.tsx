import React from 'react';
import { Creator } from '../types';

interface CreatorsRailProps {
  creators: Creator[];
  selectedCreatorId: string | null;
  onSelectCreator: (creatorId: string | null) => void;
  onToggleFollow: (creatorId: string) => void;
}

export const CreatorsRail: React.FC<CreatorsRailProps> = ({
  creators,
  selectedCreatorId,
  onSelectCreator,
}) => {
  if (creators.length === 0) {
    return null;
  }

  const followedCreators = creators.filter((c) => c.isFollowed);
  const displayCreators = followedCreators.length > 0 ? followedCreators : creators;
  const isShowingFollowed = followedCreators.length > 0;

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between px-4 sm:px-8 max-w-[1280px] mx-auto mb-4">
        <h2 className="display-font text-[22px] font-semibold tracking-[-0.01em] text-[#F3F1EA]">
          {isShowingFollowed ? 'Creators you follow' : 'Featured creators'}
        </h2>
        {selectedCreatorId && (
          <button
            onClick={() => onSelectCreator(null)}
            className="text-[13px] text-[#F2B705] hover:underline font-medium cursor-pointer"
          >
            Show all stories
          </button>
        )}
      </div>

      <div className="flex gap-5 sm:gap-[26px] overflow-x-auto px-4 sm:px-8 py-1 max-w-[1280px] mx-auto no-scrollbar">
        {displayCreators.map((creator) => {
          const isSelected = selectedCreatorId === creator.id;
          return (
            <div
              key={creator.id}
              onClick={() => onSelectCreator(isSelected ? null : creator.id)}
              className="flex-shrink-0 flex flex-col items-center gap-2.5 w-[84px] text-center cursor-pointer group"
              title={`${creator.name} (${creator.subscribers} followers) - ${creator.featuredTopic}`}
            >
              <div
                className={`w-16 h-16 rounded-full border-2 p-[2px] transition-all duration-200 group-hover:scale-105 ${
                  isSelected
                    ? 'border-white ring-2 ring-[#F2B705]'
                    : 'border-[#F2B705] group-hover:border-white'
                }`}
              >
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br ${creator.avatarGradient} flex items-center justify-center font-semibold text-[16px] text-[#14171A] overflow-hidden shadow-inner`}
                >
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    creator.initials
                  )}
                </div>
              </div>
              <div className="text-[12.5px] text-[#9BA1A8] group-hover:text-[#F3F1EA] transition-colors leading-[1.3] font-medium truncate w-full">
                {creator.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
