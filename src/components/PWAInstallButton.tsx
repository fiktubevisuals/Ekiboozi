import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed and running as standalone app, suppress the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Desktop / unsupported: show helpful guide
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Compact Header Pill */}
      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#F2B705]/15 hover:bg-[#F2B705]/25 text-[#F2B705] border border-[#F2B705]/40 transition-all cursor-pointer shadow-sm active:scale-95 ${className}`}
          title="Install Ekiboozi app on Android / iOS"
        >
          <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {/* Full Button */}
      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold bg-[#F2B705] hover:bg-[#ffc61a] text-[#14171A] transition-all shadow-lg active:scale-95 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>{isInstalling ? 'Installing...' : 'Install Ekiboozi App'}</span>
        </button>
      )}

      {/* Banner Variant */}
      {variant === 'banner' && (
        <div className={`p-4 bg-gradient-to-r from-[#1D2126] to-[#14171A] border border-[#333A41] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${className}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F2B705] to-[#21A8A3] p-0.5 flex-shrink-0">
              <img src="/pwa-192x192.png" alt="Ekiboozi" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#F3F1EA]">Get the Ekiboozi App</h4>
              <p className="text-[12px] text-[#9BA1A8]">Fast video streaming, offline caching, and instant creator stories on Android & iOS.</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-5 py-2 rounded-full text-[13px] font-bold bg-[#F2B705] hover:bg-[#ffc61a] text-[#14171A] transition-all self-start sm:self-auto cursor-pointer"
          >
            Install Now
          </button>
        </div>
      )}

      {/* iOS Safari & General Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#1D2126] border border-[#333A41] p-6 shadow-2xl text-[#F3F1EA] relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#9BA1A8] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F2B705]/15 border border-[#F2B705]/30 flex items-center justify-center text-[#F2B705]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#F3F1EA]">Install Ekiboozi</h3>
                <p className="text-[12px] text-[#9BA1A8]">Add to your Home Screen</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3.5 my-5 text-[13.5px] text-[#9BA1A8]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14171A] border border-[#333A41]/60">
                  <div className="w-6 h-6 rounded-full bg-[#21A8A3]/20 text-[#21A8A3] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    Tap the <strong className="text-white">Share</strong> icon in Safari toolbar (bottom on iPhone, top on iPad).
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#21A8A3]">
                      <Share className="w-3.5 h-3.5" /> <span>Square with arrow up</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14171A] border border-[#333A41]/60">
                  <div className="w-6 h-6 rounded-full bg-[#F2B705]/20 text-[#F2B705] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#F2B705]">
                      <PlusSquare className="w-3.5 h-3.5" /> <span>Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14171A] border border-[#333A41]/60">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    Tap <strong className="text-white">Add</strong> in the top right corner.
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-5 text-[13.5px] text-[#9BA1A8] space-y-3">
                <p>
                  To install on Android or desktop browsers, tap your browser's menu (three dots) and select <strong className="text-[#F3F1EA]">"Install App"</strong> or <strong className="text-[#F3F1EA]">"Add to Home screen"</strong>.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#F2B705] text-[#14171A] font-bold text-[14px] hover:bg-[#ffc61a] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
