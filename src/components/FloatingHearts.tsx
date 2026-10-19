import React, { useEffect, useState, useCallback } from 'react';
import { soundFX } from '../utils/soundEffects';

export interface FloatingHeartItem {
  id: number;
  x: number;
  size: number;
  color: string;
  rotation: number;
  duration: number;
  swayAmount: number;
}

const HEART_COLORS = [
  '#FF2D55', // Vibrant Crimson
  '#FF375F', // Rose
  '#FF9500', // Gold Orange
  '#FFD60A', // Vibrant Yellow
  '#AF52DE', // Purple
  '#00F2FE', // Neon Cyan
  '#FF2A6D', // Radiant Pink
];

interface FloatingHeartsProps {
  onHeartCountChange?: (total: number) => void;
  className?: string;
  enableSound?: boolean;
}

export interface FloatingHeartsHandle {
  spawnHearts: (count?: number, clientX?: number, clientY?: number) => void;
}

export const FloatingHearts: React.FC<FloatingHeartsProps & { triggerCount?: number }> = ({
  className = '',
  enableSound = true,
  triggerCount = 0,
}) => {
  const [hearts, setHearts] = useState<FloatingHeartItem[]>([]);

  const spawn = useCallback((count = 1) => {
    if (enableSound) {
      soundFX.playHeartPop();
    }
    const newItems: FloatingHeartItem[] = [];
    for (let i = 0; i < count; i++) {
      const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
      // Random position around the bottom-right corner (approx 70% to 92% of width)
      const x = 70 + Math.random() * 24;
      const size = 20 + Math.random() * 18;
      const rotation = -20 + Math.random() * 40;
      const duration = 1.6 + Math.random() * 0.8;
      const swayAmount = (Math.random() - 0.5) * 40;

      newItems.push({
        id: Date.now() + Math.random(),
        x,
        size,
        color,
        rotation,
        duration,
        swayAmount,
      });
    }

    setHearts((prev) => [...prev.slice(-30), ...newItems]);
  }, [enableSound]);

  useEffect(() => {
    if (triggerCount > 0) {
      spawn(1);
    }
  }, [triggerCount, spawn]);

  const removeHeart = (id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {hearts.map((h) => (
        <div
          key={h.id}
          onAnimationEnd={() => removeHeart(h.id)}
          className="absolute bottom-16 animate-float-heart"
          style={{
            left: `${h.x}%`,
            width: `${h.size}px`,
            height: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            transform: `rotate(${h.rotation}deg)`,
            ['--sway-x' as string]: `${h.swayAmount}px`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill={h.color}
            className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
