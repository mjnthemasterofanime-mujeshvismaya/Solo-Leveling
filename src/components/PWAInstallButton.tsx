import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { SystemFrame } from './SystemFrame';
import { soundEngine } from '../lib/sound';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          soundEngine.playNotification();
          install();
        }}
        className={`flex min-h-[42px] items-center justify-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/20 text-xs font-bold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/30 transition-colors whitespace-nowrap ${
          compact ? 'w-full px-3 py-2' : 'px-4 py-2'
        }`}
      >
        <Download className="h-4 w-4 text-[#67E8F9]" />
        <span>INSTALL MOBILE APP</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          soundEngine.playTap();
          setShowGuide(true);
        }}
        className={`flex min-h-[42px] items-center justify-center gap-2 border border-[#2879B7]/60 bg-[#081525] text-xs font-semibold text-[#67E8F9] hover:border-[#38BDF8] transition-colors whitespace-nowrap ${
          compact ? 'w-full px-3 py-2' : 'px-4 py-2'
        }`}
      >
        <Smartphone className="h-4 w-4" />
        <span>{isIOS ? 'Install on iPhone' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <SystemFrame scanBeam className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between border-b border-[#2879B7]/35 pb-3">
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Install THE SYSTEM App
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-9 w-9 items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-[#CBD5E1]">
                <li>1. Open this link in <strong className="text-[#F8FAFC]">Safari</strong>.</li>
                <li>2. Tap the <strong className="text-[#F8FAFC]">Share</strong> icon at the bottom.</li>
                <li>3. Tap <strong className="text-[#67E8F9]">Add to Home Screen</strong>.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-sm text-[#CBD5E1]">
                <li>1. Open this link in <strong className="text-[#F8FAFC]">Google Chrome</strong> on your phone or desktop.</li>
                <li>2. Tap the <strong className="text-[#F8FAFC]">⋮ menu</strong> in the top-right corner.</li>
                <li>3. Tap <strong className="text-[#67E8F9]">Install app</strong> or <strong className="text-[#67E8F9]">Add to Home screen</strong>.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 min-h-[42px] w-full border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-xs font-bold text-[#F8FAFC]"
            >
              CLOSE
            </button>
          </SystemFrame>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 left-4 z-40 flex items-center gap-2 border border-[#FACC15]/60 bg-[#081525]/95 px-3 py-2 text-xs font-medium text-[#FACC15] shadow-lg lg:bottom-4">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline Mode — Progress queued for sync</span>
    </div>
  );
}
