import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('ekiboozi_cookie_consent');
    if (!consent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('ekiboozi_cookie_consent', 'accepted');
    setIsVisible(false);
    // In a real AdSense implementation, you would trigger the script load here if previously blocked
  };

  const handleDecline = () => {
    localStorage.setItem('ekiboozi_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-[#1A1D21] border border-[#333A41] rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-[#3EA6FF]/10 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
            <ShieldAlert className="w-5 h-5 text-[#3EA6FF]" />
          </div>
          <div>
            <h3 className="text-[#F3F1EA] font-bold text-[16px] mb-1">We use cookies</h3>
            <p className="text-[#9BA1A8] text-[13.5px] leading-relaxed">
              We and our third-party vendors (including Google) use tracking cookies to serve personalized ads based on your prior visits to our website. 
              By clicking "Accept", you consent to our use of these tracking technologies.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          <button 
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full text-[14px] font-semibold text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41] transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-full text-[14px] font-bold bg-[#F2B705] text-[#14171A] hover:bg-[#ffc61a] active:scale-95 transition-all shadow-md"
          >
            Accept
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 text-[#656C73] hover:text-[#F3F1EA] rounded-full hover:bg-[#333A41] transition-colors hidden sm:block ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
