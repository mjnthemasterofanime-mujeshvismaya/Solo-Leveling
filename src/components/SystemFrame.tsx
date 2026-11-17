import React from 'react';

interface SystemFrameProps {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'gold' | 'monarch';
  className?: string;
  scanBeam?: boolean;
}

export function SystemFrame({
  children,
  variant = 'default',
  className = '',
  scanBeam = false,
}: SystemFrameProps) {
  const variantClasses =
    variant === 'danger'
      ? 'system-panel-danger border-[#EF4444]/60'
      : variant === 'gold'
        ? 'system-panel border-[#FACC15]/50 shadow-[0_0_24px_-6px_rgba(250,204,21,0.25)]'
        : variant === 'monarch'
          ? 'system-panel border-[#A855F7]/55 shadow-[0_0_28px_-6px_rgba(168,85,247,0.3)]'
          : 'system-panel';

  const cornerColor =
    variant === 'danger'
      ? 'border-[#EF4444]'
      : variant === 'gold'
        ? 'border-[#FACC15]'
        : variant === 'monarch'
          ? 'border-[#A855F7]'
          : 'border-[#67E8F9]';

  return (
    <div className={`relative overflow-hidden rounded-sm ${variantClasses} ${className}`}>
      {/* Corner HUD brackets */}
      <span aria-hidden="true" className={`pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 ${cornerColor}`} />
      <span aria-hidden="true" className={`pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 ${cornerColor}`} />
      <span aria-hidden="true" className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 ${cornerColor}`} />
      <span aria-hidden="true" className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 ${cornerColor}`} />

      {scanBeam && (
        <div
          aria-hidden="true"
          className="system-scan-beam pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-[#38BDF8]/10 to-transparent"
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
