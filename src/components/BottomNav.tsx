import React from 'react';
import { NavView } from '../types';
import { Home, Flame, Plus, Music2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface BottomNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenUpload: () => void;
  user: FirebaseUser | null;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenUpload,
  isAdmin
}) => {
  interface NavTabItem {
    id: string;
    label: string;
    view?: NavView;
    isAction?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
  }

  const isSupportActive = currentView === 'support' || currentView === 'jobs' || currentView === 'job_details';

  const regularTabs: NavTabItem[] = [
    {
      id: 'home',
      label: 'Home',
      view: 'home',
      icon: Home,
      isActive: currentView === 'home',
      onClick: () => onSelectView('home')
    },
    {
      id: 'trending',
      label: 'Trending',
      view: 'trending',
      icon: Flame,
      isActive: currentView === 'trending',
      onClick: () => onSelectView('trending')
    },
    {
      id: 'create',
      label: 'Create',
      isAction: true,
      icon: Plus,
      isActive: false,
      onClick: onOpenUpload
    },
    {
      id: 'music',
      label: 'Music',
      view: 'music',
      icon: Music2,
      isActive: currentView === 'music',
      onClick: () => onSelectView('music')
    },
    {
      id: 'support',
      label: 'Support',
      view: 'support',
      icon: HeartHandshake,
      isActive: isSupportActive,
      onClick: () => onSelectView('support')
    }
  ];

  const adminTabs: NavTabItem[] = [
    {
      id: 'home',
      label: 'Home',
      view: 'home',
      icon: Home,
      isActive: currentView === 'home',
      onClick: () => onSelectView('home')
    },
    {
      id: 'trending',
      label: 'Trending',
      view: 'trending',
      icon: Flame,
      isActive: currentView === 'trending',
      onClick: () => onSelectView('trending')
    },
    {
      id: 'create',
      label: 'Create',
      isAction: true,
      icon: Plus,
      isActive: false,
      onClick: onOpenUpload
    },
    {
      id: 'support',
      label: 'Support',
      view: 'support',
      icon: HeartHandshake,
      isActive: isSupportActive,
      onClick: () => onSelectView('support')
    },
    {
      id: 'admin',
      label: 'Admin',
      view: 'admin',
      icon: ShieldCheck,
      isActive: currentView === 'admin',
      onClick: () => onSelectView('admin')
    }
  ];

  const items = isAdmin ? adminTabs : regularTabs;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#14171A]/95 backdrop-blur-lg border-t border-[#333A41]/80 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-transform duration-200"
    >
      <div className="flex items-center justify-around px-2 py-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                aria-label={item.label}
                className="relative -top-2 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#F2B705] to-[#E8890C] text-[#14171A] flex items-center justify-center shadow-lg shadow-[#F2B705]/25 border-2 border-[#14171A] group-active:scale-95 group-hover:scale-105 transition-all">
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-medium text-[#9BA1A8] group-hover:text-[#F3F1EA] transition-colors mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              aria-label={item.label}
              aria-current={item.isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-150 cursor-pointer focus:outline-none ${
                item.isActive
                  ? 'text-[#F2B705] font-semibold scale-105'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA] active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    item.isActive ? 'stroke-[2.2] drop-shadow-[0_0_8px_rgba(242,183,5,0.4)]' : 'stroke-[1.8]'
                  }`}
                />
              </div>
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {item.label}
              </span>
              {item.isActive ? (
                <span className="w-1 h-1 rounded-full bg-[#F2B705] mt-1" />
              ) : (
                <span className="w-1 h-1 rounded-full bg-transparent mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
