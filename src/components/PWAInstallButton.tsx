import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DDD6FE] bg-[#F3EFFF] px-3 py-1.5 text-xs font-medium text-[#5B38EE] hover:bg-[#EDE9FE] transition-colors whitespace-nowrap"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DDD6FE] bg-[#F3EFFF] px-3 py-1.5 text-xs font-medium text-[#5B38EE] hover:bg-[#EDE9FE] transition-colors whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B2E]/40 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#1E1B2E]">Install NextUp on iOS</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#5B5570]">
                <li>1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to open NextUp like a native app.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 min-h-[44px] w-full rounded-xl bg-[#6D4AFF] py-2 text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 left-4 z-40 flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-medium text-[#92400E] shadow-md md:bottom-4">
      <WifiOff className="h-3.5 w-3.5 text-[#B45309]" />
      <span>Offline mode — local storage & rule-based planner active</span>
    </div>
  );
};
