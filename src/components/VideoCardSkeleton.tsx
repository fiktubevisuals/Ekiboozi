import React from 'react';
import { Skeleton } from './Skeleton';

export const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="w-full aspect-video" />
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    </div>
  );
};
