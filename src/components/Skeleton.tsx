import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-[#262B31] rounded-[12px] ${className}`} />
  );
};
