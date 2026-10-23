import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, isLight, toggleTheme } = useTheme();

  const titleText = isLight
    ? 'Switch to Midnight Dark theme'
    : 'Switch to High-Contrast Light mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={titleText}
      title={titleText}
      className={`relative inline-flex items-center justify-center gap-1.5 min-w-[36px] sm:min-w-[40px] h-[36px] sm:h-[40px] px-2 sm:px-3 rounded-full border border-[#333A41] hover:border-[#656C73] bg-[#1D2126]/70 hover:bg-[#1D2126] text-[#F3F1EA] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705] active:scale-95 group ${className}`}
    >
      <div className="relative w-4 h-4 sm:w-[18px] sm:h-[18px] flex items-center justify-center flex-shrink-0">
        {isLight ? (
          <Moon
            className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#0F172A] transition-transform duration-200 rotate-0 group-hover:-rotate-12"
            strokeWidth={2.2}
          />
        ) : (
          <Sun
            className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#F2B705] transition-transform duration-200 rotate-0 group-hover:rotate-45"
            strokeWidth={2.2}
          />
        )}
      </div>

      {showLabel ? (
        <span className="hidden sm:inline text-[13px] font-medium tracking-tight whitespace-nowrap">
          {isLight ? 'Midnight' : 'Light'}
        </span>
      ) : null}

      <span className="sr-only">
        {isLight ? 'Currently High-Contrast Light mode. Click to switch to Midnight Dark theme.' : 'Currently Midnight Dark theme. Click to switch to High-Contrast Light mode.'}
      </span>
    </button>
  );
};
