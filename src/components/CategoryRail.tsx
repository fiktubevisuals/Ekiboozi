import React from 'react';
import { CATEGORIES } from '../constants';

interface CategoryRailProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryRail: React.FC<CategoryRailProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex gap-2 sm:gap-2.5 px-3.5 sm:px-8 pb-2 w-full max-w-[1280px] mx-auto overflow-x-auto no-scrollbar">
      {CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`flex-shrink-0 px-3.5 sm:px-4.5 py-1.5 sm:py-2.5 rounded-full text-[13px] sm:text-[14px] transition-all duration-150 cursor-pointer border ${
              isActive
                ? 'bg-[#F3F1EA] text-[#14171A] border-[#F3F1EA] font-semibold shadow-sm'
                : 'bg-[#1D2126] border-[#333A41] text-[#9BA1A8] hover:text-[#F3F1EA] hover:border-[#656C73] font-medium'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
