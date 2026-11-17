import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bell, CheckCircle2, Maximize2, Sparkles, X } from 'lucide-react';
import { SystemNotification } from '../types/system';
import { SystemFrame } from './SystemFrame';

interface TypingTextProps {
  text: string;
  enabled: boolean;
}

function TypingText({ text, enabled }: TypingTextProps) {
  const [visibleLen, setVisibleLen] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled) {
      setVisibleLen(text.length);
      return;
    }
    setVisibleLen(0);
    const interval = window.setInterval(() => {
      setVisibleLen((prev) => {
        if (prev >= text.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, 14);
    return () => window.clearInterval(interval);
  }, [text, enabled]);

  return <span>{text.slice(0, visibleLen)}</span>;
}

interface SystemNotificationOverlayProps {
  activeToast: SystemNotification | null;
  notifications: SystemNotification[];
  centerOpen: boolean;
  animationsEnabled: boolean;
  onDismissToast: () => void;
  onCloseCenter: () => void;
  onMarkAllRead: () => void;
}

export function SystemNotificationOverlay({
  activeToast,
  notifications,
  centerOpen,
  animationsEnabled,
  onDismissToast,
  onCloseCenter,
  onMarkAllRead,
}: SystemNotificationOverlayProps) {
  const [expandedToast, setExpandedToast] = useState<SystemNotification | null>(null);

  useEffect(() => {
    if (!activeToast) return;
    const timer = window.setTimeout(() => {
      onDismissToast();
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [activeToast, onDismissToast]);

  const variantForSeverity = (sev: SystemNotification['severity']) => {
    if (sev === 'warning') return 'danger';
    if (sev === 'gold') return 'gold';
    if (sev === 'monarch') return 'monarch';
    return 'default';
  };

  return (
    <>
      {/* Floating Slide-In System Toast */}
      <AnimatePresence>
        {activeToast && !expandedToast && (
          <motion.div
            initial={animationsEnabled ? { opacity: 0, x: 40, y: -12 } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={animationsEnabled ? { opacity: 0, x: 40 } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 right-4 z-50 w-[calc(100vw-2rem)] max-w-md"
          >
            <SystemFrame variant={variantForSeverity(activeToast.severity)} scanBeam className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {activeToast.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                    ) : activeToast.severity === 'gold' ? (
                      <CheckCircle2 className="h-5 w-5 text-[#FACC15]" />
                    ) : activeToast.severity === 'monarch' ? (
                      <Sparkles className="h-5 w-5 text-[#A855F7]" />
                    ) : (
                      <Bell className="h-5 w-5 text-[#38BDF8]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-display text-xs font-semibold tracking-widest uppercase ${
                        activeToast.severity === 'warning'
                          ? 'text-[#EF4444]'
                          : activeToast.severity === 'gold'
                            ? 'text-[#FACC15]'
                            : activeToast.severity === 'monarch'
                              ? 'text-[#C084FC]'
                              : 'text-[#67E8F9]'
                      }`}
                    >
                      [{activeToast.title}]
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#F8FAFC]">
                      <TypingText text={activeToast.message} enabled={animationsEnabled} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedToast(activeToast)}
                    aria-label="Expand System notification"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-[#94A3B8] hover:bg-[#38BDF8]/15 hover:text-[#F8FAFC] transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onDismissToast}
                    aria-label="Dismiss notification"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-[#94A3B8] hover:bg-[#38BDF8]/15 hover:text-[#F8FAFC] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Full System Window for Single Notification */}
      <AnimatePresence>
        {expandedToast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <SystemFrame
              variant={variantForSeverity(expandedToast.severity)}
              scanBeam
              className="w-full max-w-lg p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#2879B7]/40 pb-4">
                <h3 className="font-display text-lg font-semibold tracking-wider text-[#67E8F9] uppercase">
                  SYSTEM NOTIFICATION
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedToast(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-sm text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="py-6 text-center">
                <p className="font-display text-xl font-bold tracking-wide text-[#F8FAFC]">
                  [{expandedToast.title}]
                </p>
                <p className="mt-4 text-base leading-relaxed text-[#CBD5E1]">{expandedToast.message}</p>
                <p className="mt-4 font-mono-tabular text-xs text-[#94A3B8]">
                  {new Date(expandedToast.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedToast(null);
                    onDismissToast();
                  }}
                  className="min-h-[44px] border border-[#38BDF8]/60 bg-[#38BDF8]/15 px-8 py-2 text-sm font-semibold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/25 transition-colors whitespace-nowrap"
                >
                  CONFIRM
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Center Modal */}
      <AnimatePresence>
        {centerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <SystemFrame scanBeam className="flex max-h-[85vh] w-full max-w-2xl flex-col p-6">
              <div className="flex items-center justify-between border-b border-[#2879B7]/40 pb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-wider text-[#F8FAFC] uppercase">
                    Notification Log
                  </h3>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">
                    System dispatches, quest alerts, and milestone records
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="min-h-[40px] border border-[#2879B7]/60 bg-[#081525] px-3 py-1.5 text-xs font-medium text-[#67E8F9] hover:bg-[#38BDF8]/15 transition-colors whitespace-nowrap"
                  >
                    Mark All Read
                  </button>
                  <button
                    type="button"
                    onClick={onCloseCenter}
                    aria-label="Close notification center"
                    className="flex h-10 w-10 items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="py-10 text-center text-sm text-[#94A3B8]">
                    No System notifications recorded yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`border px-4 py-3 transition-colors ${
                        n.severity === 'warning'
                          ? 'border-[#EF4444]/40 bg-[#EF4444]/10'
                          : n.severity === 'gold'
                            ? 'border-[#FACC15]/40 bg-[#FACC15]/10'
                            : n.severity === 'monarch'
                              ? 'border-[#A855F7]/40 bg-[#A855F7]/10'
                              : 'border-[#2879B7]/35 bg-[#050A13]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-semibold tracking-wider uppercase ${
                            n.severity === 'warning'
                              ? 'text-[#EF4444]'
                              : n.severity === 'gold'
                                ? 'text-[#FACC15]'
                                : n.severity === 'monarch'
                                  ? 'text-[#C084FC]'
                                  : 'text-[#67E8F9]'
                          }`}
                        >
                          [{n.title}]
                        </span>
                        <span className="font-mono-tabular text-[#94A3B8]">
                          {new Date(n.createdAt).toLocaleDateString()} ·{' '}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-[#E2E8F0]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
