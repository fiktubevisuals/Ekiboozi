import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
  slot?: string; // AdSense slot ID
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  className = '',
  slot = 'DEMO_SLOT_ID', // Replace with real slot ID in production
  format = 'auto',
  responsive = true
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Attempt to push to adsbygoogle array when component mounts
    try {
      if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn('AdSense error:', err);
    }
  }, []);

  return (
    <div className={`relative bg-[#1A1D21]/50 border border-[#333A41]/50 rounded-xl overflow-hidden flex items-center justify-center group ${className}`}>
      {/* Fallback/Dev visualization - This will be covered by the actual ad in production if ads load successfully */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#656C73] pointer-events-none z-0">
        <span className="text-[11px] uppercase tracking-widest font-bold mb-1 opacity-60">Advertisement</span>
        <span className="text-[10px] opacity-40">AdSense Space</span>
      </div>
      
      <ins
        ref={adRef}
        className="adsbygoogle z-10 w-full h-full"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-0000000000000000" // Replace with real Publisher ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
};
