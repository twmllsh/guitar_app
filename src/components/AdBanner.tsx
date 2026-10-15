import React, { useEffect, useRef } from 'react';

interface Props {
  slot?: string;
  format?: 'auto' | 'fluid' | 'horizontal' | 'rectangle';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdBanner: React.FC<Props> = ({ slot, format = 'auto', className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  // Read AdSense Client ID from environment variables or placeholder
  const clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADSENSE_CLIENT_ID) || '';

  useEffect(() => {
    // If no client ID or slot is set yet, do nothing (waiting for AdSense approval)
    if (!clientId || !slot) return;

    if (!isLoaded.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (e) {
        console.warn('AdSense push error', e);
      }
    }
  }, [clientId, slot]);

  // If no AdSense configuration exists yet, render an unobtrusive container
  if (!clientId || !slot) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden my-4 flex items-center justify-center text-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};
