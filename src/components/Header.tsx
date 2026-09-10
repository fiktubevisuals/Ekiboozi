import React from 'react';
import { NavView } from '../types';
import { Search, Plus, X, User } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenUpload: () => void;
  onOpenProfile: () => void;
  followingCount: number;
  user: FirebaseUser | null;
  onSignIn: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenProfile,
  followingCount,
  user,
  onSignIn
}) => {
  const navItems: { label: string; view: NavView; badge?: number }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Trending', view: 'trending' },
    { label: 'Music', view: 'music' },
    { label: 'Support', view: 'support' },
  ];

  if (user?.email === 'mubirushafik1088@gmail.com') {
    navItems.push({ label: 'Admin', view: 'admin' });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#14171A]/90 backdrop-blur-md border-b border-[#333A41] w-full max-w-full">
      <nav className="flex items-center justify-between px-3 sm:px-8 py-3 sm:py-4 max-w-[1280px] mx-auto gap-2.5 sm:gap-6 w-full">
        {/* Logo */}
        <button
          onClick={() => onSelectView('home')}
          className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 group cursor-pointer focus:outline-none"
          title="Ekiboozi Home"
        >
          <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[8px] sm:rounded-[9px] bg-gradient-to-br from-[#F2B705] to-[#E8890C] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-[18px] sm:h-[18px]">
              <path d="M8 5v14l12-7L8 5z" fill="#14171A" />
            </svg>
          </div>
          <span className="display-font text-[18px] sm:text-[20px] font-bold tracking-[-0.01em] text-[#F3F1EA]">
            Ekiboozi
          </span>
        </button>

        {/* Nav Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-[15px] font-medium text-[#9BA1A8]">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onSelectView(item.view)}
                className={`relative py-1 transition-colors duration-150 cursor-pointer focus:outline-none ${
                  isActive ? 'text-[#F3F1EA] font-semibold' : 'hover:text-[#F3F1EA]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2B705] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex-1 min-w-0 max-w-[420px] flex items-center gap-2 bg-[#1D2126] border border-[#333A41] focus-within:border-[#9BA1A8]/60 transition-colors rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[#656C73]">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9BA1A8] flex-shrink-0 opacity-70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="bg-transparent border-none outline-none text-[#F3F1EA] text-[13px] sm:text-[14px] w-full min-w-0 placeholder:text-[#656C73]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-[#9BA1A8] hover:text-[#F3F1EA] p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions (Upload + Profile) */}
        <div className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0">
          {user ? (
            <>
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 bg-transparent border border-[#333A41] hover:border-[#656C73] hover:bg-[#1D2126] active:scale-95 text-[#F3F1EA] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-150 cursor-pointer"
                title="Upload Video"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              <button
                onClick={onOpenProfile}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#333A41] flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-[#F2B705]/50 transition-all cursor-pointer shadow-sm"
                title={user.displayName || 'Profile'}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[12px] sm:text-[13px] font-semibold text-[#F3F1EA]">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 bg-[#F2B705] hover:bg-[#F2B705]/90 active:scale-95 text-[#14171A] px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all duration-150 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 sm:w-[15px] sm:h-[15px]" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden items-center overflow-x-auto no-scrollbar px-3 py-2 border-t border-[#333A41]/70 bg-[#1D2126]/80 text-[13px] gap-1.5 justify-start sm:justify-around">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onSelectView(item.view)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#F2B705] text-[#14171A] font-bold shadow-sm'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41]/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
