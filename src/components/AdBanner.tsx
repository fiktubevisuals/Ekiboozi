import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
  clientId?: string;
  slot?: string; // AdSense slot ID
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  className = '',
  clientId,
  slot = 'DEMO_SLOT_ID',
  format = 'auto',
  responsive = true
}) => {
  const adRef = useRef<HTMLModElement>(null);
  
  // Use client ID from props, env, or null
  const envClientId = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_ADSENSE_CLIENT_ID : undefined;
  const adClient = clientId || envClientId;
  const isRealAdClient = Boolean(
    adClient && 
    typeof adClient === 'string' &&
    adClient.startsWith('ca-pub-') && 
    adClient !== 'ca-pub-0000000000000000' && 
    !adClient.includes('00000000')
  );

  useEffect(() => {
    if (!isRealAdClient) return;

    // Dynamically load AdSense script only if a valid real client ID is present
    const scriptId = 'adsense-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    try {
      if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn('AdSense load warning:', err);
    }
  }, [isRealAdClient, adClient]);

  return (
    <div className={`relative bg-[#1A1D21]/50 border border-[#333A41]/50 rounded-xl overflow-hidden flex items-center justify-center group ${className}`}>
      {/* Visual Placeholder (always rendered underneath or when in demo mode) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#656C73] pointer-events-none z-0 p-4 text-center">
        <span className="text-[11px] uppercase tracking-widest font-bold mb-1 opacity-60">Advertisement</span>
        <span className="text-[10px] opacity-40">Ad Space ({format})</span>
      </div>
      
      {isRealAdClient && (
        <ins
          ref={adRef}
          className="adsbygoogle z-10 w-full h-full"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      )}
    </div>
  );
};
