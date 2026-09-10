import React from 'react';
import { NavView, FooterSettings, FooterLink } from '../types';
import { DEFAULT_FOOTER_SETTINGS } from '../constants/legalDefaults';
import { Settings, ExternalLink } from 'lucide-react';

interface FooterProps {
  footerSettings?: FooterSettings;
  currentView?: NavView;
  onSelectView?: (view: NavView) => void;
  isAdmin?: boolean;
  onOpenAdminFooterTerms?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  footerSettings = DEFAULT_FOOTER_SETTINGS,
  currentView,
  onSelectView,
  isAdmin,
  onOpenAdminFooterTerms,
}) => {
  const links: FooterLink[] = (footerSettings.links && footerSettings.links.length > 0)
    ? [...footerSettings.links].sort((a, b) => a.order - b.order)
    : DEFAULT_FOOTER_SETTINGS.links;

  const handleLinkClick = (e: React.MouseEvent, link: FooterLink) => {
    e.preventDefault();
    if (link.type === 'internal') {
      if (onSelectView) {
        onSelectView(link.target as NavView);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (link.type === 'email') {
      window.location.href = link.target.startsWith('mailto:') ? link.target : `mailto:${link.target}`;
    } else if (link.type === 'external') {
      window.open(link.target, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <footer className="mt-16 border-t border-[#333A41] py-10 sm:py-12 px-4 sm:px-8 bg-[#14171A]">
      <div className="max-w-[1280px] mx-auto flex justify-between items-center flex-wrap gap-5">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] items-center">
          {links.map((link) => {
            const isInternalActive = link.type === 'internal' && currentView === link.target;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                id={`footer-link-${link.id}`}
                onClick={(e) => handleLinkClick(e, link)}
                className={`transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  isInternalActive
                    ? 'text-[#F2B705] font-semibold'
                    : 'text-[#848B92] hover:text-[#F3F1EA]'
                }`}
              >
                <span>{link.label}</span>
                {link.type === 'external' && <ExternalLink className="w-3 h-3 opacity-60" />}
              </a>
            );
          })}

          {isAdmin && onOpenAdminFooterTerms && (
            <button
              onClick={onOpenAdminFooterTerms}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F2B705]/10 hover:bg-[#F2B705]/20 text-[#F2B705] text-[11px] font-semibold transition-colors cursor-pointer ml-1"
              title="Manage footer links and terms"
              id="footer-admin-manage-btn"
            >
              <Settings className="w-3 h-3" />
              <span>Edit Footer & Terms</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:items-end text-[13px] text-[#656C73]">
          <div>{footerSettings.copyrightText || DEFAULT_FOOTER_SETTINGS.copyrightText}</div>
          {footerSettings.tagline && (
            <div className="text-[12px] text-[#4A5056] mt-0.5">{footerSettings.tagline}</div>
          )}
        </div>
      </div>
    </footer>
  );
};

