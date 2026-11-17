import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  CheckSquare,
  LayoutDashboard,
  Menu,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  apiRequest,
  enqueueOfflineProgress,
  flushOfflineProgressQueue,
  getOfflineQueue,
} from './lib/api';
import { FullPlayerState, NavSection, SystemNotification } from './types/system';
import { DifficultyMode, SYSTEM_THEMES } from './shared/systemData';
import { soundEngine } from './lib/sound';
import { AuthGate, AwakeningFlow } from './components/AuthAndAwakening';
import { DashboardView } from './components/DashboardView';
import { DailyQuestView } from './components/DailyQuestView';
import { StatusView } from './components/StatusView';
import { SpecialQuestsView } from './components/SpecialQuestsView';
import { InventoryView, ShopView } from './components/InventoryAndShopView';
import { SkillsView, TitlesAchievementsView } from './components/SkillsAndTitlesView';
import { HistoryView, SettingsView } from './components/HistoryAndSettingsView';
import { SystemNotificationOverlay } from './components/SystemNotificationOverlay';
import { SystemFrame } from './components/SystemFrame';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';

const ALL_NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'daily-quest', label: 'Daily Quest', icon: CheckSquare },
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'special-quests', label: 'Special Quests', icon: Swords },
  { id: 'inventory', label: 'Inventory', icon: Briefcase },
  { id: 'shop', label: 'System Shop', icon: ShoppingBag },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'titles', label: 'Titles & Badges', icon: Award },
  { id: 'history', label: 'History', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [state, setState] = useState<FullPlayerState | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [levelUpBanner, setLevelUpBanner] = useState<number | null>(null);
  const [offlineCount, setOfflineCount] = useState(getOfflineQueue().length);

  const lastSeenNotifId = useRef<number>(0);
  const lastLevelRef = useRef<number | null>(null);

  const applyNewState = useCallback((next: FullPlayerState) => {
    setState(next);
    soundEngine.enabled = next.profile?.soundEnabled ?? true;

    // Apply System theme CSS variables
    const theme = SYSTEM_THEMES[next.profile?.activeTheme || 'abyssal_blue'] || SYSTEM_THEMES.abyssal_blue;
    const root = document.documentElement.style;
    root.setProperty('--sys-primary', theme.primary);
    root.setProperty('--sys-glow', theme.glow);
    root.setProperty('--sys-border', theme.border);

    // Detect Level-Up
    if (lastLevelRef.current !== null && next.status.level > lastLevelRef.current) {
      soundEngine.playLevelUp();
      setLevelUpBanner(next.status.level);
    }
    lastLevelRef.current = next.status.level;

    // Detect newest notification for toast
    if (next.notifications.length > 0) {
      const newest = next.notifications[0];
      if (lastSeenNotifId.current !== 0 && newest.id > lastSeenNotifId.current && next.profile.notificationsEnabled) {
        setActiveToast(newest);
        if (newest.severity === 'warning') soundEngine.playWarning();
        else soundEngine.playNotification();
      }
      lastSeenNotifId.current = Math.max(lastSeenNotifId.current, newest.id);
    }
  }, []);

  const loadPlayerState = useCallback(async () => {
    setStateLoading(true);
    setStateError(null);
    try {
      const synced = await flushOfflineProgressQueue();
      setOfflineCount(getOfflineQueue().length);
      const data = synced || (await apiRequest<FullPlayerState>('/api/player/state'));
      applyNewState(data);
    } catch (err: any) {
      setStateError(err.message || 'Unable to synchronize with THE SYSTEM.');
    } finally {
      setStateLoading(false);
    }
  }, [applyNewState]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        loadPlayerState();
      } else {
        setState(null);
        lastLevelRef.current = null;
        lastSeenNotifId.current = 0;
      }
    });
    return () => unsub();
  }, [loadPlayerState]);

  useEffect(() => {
    const onOnline = () => {
      if (firebaseUser) {
        loadPlayerState();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [firebaseUser, loadPlayerState]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed. Please retry.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setState(null);
    setSection('dashboard');
  };

  const runAction = async (fn: () => Promise<FullPlayerState>) => {
    setBusy(true);
    setStateError(null);
    try {
      const next = await fn();
      applyNewState(next);
    } catch (err: any) {
      setStateError(err.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogProgress = async (questId: number, missionId: number, amount: number) => {
    if (!navigator.onLine) {
      enqueueOfflineProgress({ questId, missionId, amount, queuedAt: Date.now() });
      setOfflineCount(getOfflineQueue().length);
      return;
    }
    try {
      await runAction(() =>
        apiRequest<FullPlayerState>('/api/player/quest/progress', 'POST', { questId, missionId, amount })
      );
    } catch {
      enqueueOfflineProgress({ questId, missionId, amount, queuedAt: Date.now() });
      setOfflineCount(getOfflineQueue().length);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A13] text-sm text-[#67E8F9]">
        [INITIALIZING SYSTEM LINK...]
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthGate onSignIn={handleSignIn} loading={authLoading} error={authError} />;
  }

  if (stateLoading && !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A13] p-6">
        <SystemFrame scanBeam className="w-full max-w-md p-8 text-center">
          <p className="font-mono-tabular text-sm tracking-widest text-[#67E8F9]">
            [SYNCHRONIZING PLAYER DATA...]
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">Connecting to Cloud SQL PostgreSQL core</p>
        </SystemFrame>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A13] p-6">
        <SystemFrame variant="danger" className="w-full max-w-md p-8 text-center">
          <p className="font-display text-lg font-bold text-[#EF4444]">System Connection Error</p>
          <p className="mt-2 text-sm text-[#CBD5E1]">{stateError || 'Unable to load Player profile.'}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={loadPlayerState}
              className="min-h-[44px] border border-[#38BDF8] bg-[#38BDF8]/20 px-6 py-2 text-xs font-bold text-[#F8FAFC]"
            >
              RETRY CONNECTION
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[44px] border border-[#2879B7]/40 px-4 py-2 text-xs text-[#94A3B8]"
            >
              Sign Out
            </button>
          </div>
        </SystemFrame>
      </div>
    );
  }

  if (!state.profile.onboardingCompleted) {
    return (
      <AwakeningFlow
        defaultName={firebaseUser.displayName || state.profile.username}
        submitting={busy}
        error={stateError}
        onComplete={(payload) =>
          runAction(() => apiRequest<FullPlayerState>('/api/player/onboarding', 'POST', payload))
        }
      />
    );
  }

  const unreadCount = state.notifications.filter((n) => !n.readStatus).length;

  return (
    <div className="min-h-screen bg-[#050A13] text-[#F8FAFC] system-grid-bg pb-20 lg:pb-10">
      {/* Desktop 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#2879B7]/40 bg-[#050A13]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setSection('dashboard')}
            className="font-display text-lg font-bold tracking-[0.18em] text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            THE SYSTEM
          </button>

          {/* Zone 2: 5 Primary Single-Line Text Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {(
              [
                ['dashboard', 'Dashboard'],
                ['daily-quest', 'Daily Quest'],
                ['status', 'Status'],
                ['special-quests', 'Special Quests'],
                ['inventory', 'Inventory'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setSection(id);
                }}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
                  section === id
                    ? 'border-[#38BDF8] text-[#67E8F9]'
                    : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setNotifCenterOpen(true)}
              className="flex min-h-[40px] items-center gap-2 border border-[#38BDF8]/60 bg-[#38BDF8]/15 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/25 transition-colors whitespace-nowrap shrink-0"
            >
              <Bell className="h-3.5 w-3.5 text-[#67E8F9]" />
              <span>Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Desktop Left Sidebar + Content Viewport */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-6 sm:px-6">
        <aside className="hidden lg:block w-56 shrink-0">
          <SystemFrame className="sticky top-20 p-3">
            <div className="space-y-1">
              {ALL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setSection(item.id);
                    }}
                    className={`flex min-h-[42px] w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-[#F8FAFC]'
                        : 'border border-transparent text-[#94A3B8] hover:bg-[#081525] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#67E8F9]' : 'text-[#64748B]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 border-t border-[#2879B7]/30 pt-3">
              <PWAInstallButton compact />
            </div>
          </SystemFrame>
        </aside>

        <main className="min-w-0 flex-1">
          {stateError && (
            <div className="mb-4 flex items-center justify-between border border-[#EF4444]/60 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]">
              <span>{stateError}</span>
              <button type="button" onClick={() => setStateError(null)} className="underline">
                Dismiss
              </button>
            </div>
          )}

          {section === 'dashboard' && (
            <DashboardView
              state={state}
              onNavigate={(s) => setSection(s)}
              onOpenNotifications={() => setNotifCenterOpen(true)}
            />
          )}

          {section === 'daily-quest' && (
            <DailyQuestView
              state={state}
              busy={busy}
              offlineQueuedCount={offlineCount}
              onLogProgress={handleLogProgress}
              onClaimRewards={async (questId) => {
                setBusy(true);
                try {
                  const res = await apiRequest<{ state: FullPlayerState }>(
                    '/api/player/quest/claim',
                    'POST',
                    { questId }
                  );
                  applyNewState(res.state);
                } catch (err: any) {
                  setStateError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
              onChangeDifficulty={(questId, mode: DifficultyMode, customTargets) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/quest/difficulty', 'POST', {
                    questId,
                    mode,
                    customTargets,
                  })
                )
              }
              onToggleRecovery={(questId, enabled) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/quest/recovery', 'POST', {
                    questId,
                    enabled,
                  })
                )
              }
              onTriggerPenalty={(questId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/quest/penalty-event', 'POST', { questId })
                )
              }
              onNavigate={(s) => setSection(s)}
            />
          )}

          {section === 'status' && (
            <StatusView
              state={state}
              busy={busy}
              onAllocateStat={(stat, amount) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/status/allocate', 'POST', { stat, amount })
                )
              }
            />
          )}

          {section === 'special-quests' && (
            <SpecialQuestsView
              state={state}
              busy={busy}
              onClaimSpecial={(specialQuestId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/special-quests/claim', 'POST', {
                    specialQuestId,
                  })
                )
              }
              onEmergencyAction={(action, specialQuestId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/special-quests/emergency', 'POST', {
                    action,
                    specialQuestId,
                  })
                )
              }
              onAdvanceJobChange={() =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/special-quests/job-change', 'POST', {})
                )
              }
            />
          )}

          {section === 'inventory' && (
            <InventoryView
              state={state}
              busy={busy}
              onOpenLootBox={async () => {
                setBusy(true);
                try {
                  const res = await apiRequest<{
                    drop: { label: string; rarity: string };
                    state: FullPlayerState;
                  }>('/api/player/inventory/open-box', 'POST', {});
                  applyNewState(res.state);
                  return res.drop;
                } catch (err: any) {
                  setStateError(err.message);
                  return null;
                } finally {
                  setBusy(false);
                }
              }}
              onUseOrEquipItem={(itemId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/inventory/use', 'POST', { itemId })
                )
              }
            />
          )}

          {section === 'shop' && (
            <ShopView
              state={state}
              busy={busy}
              onBuyItem={(itemId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/shop/buy', 'POST', { itemId })
                )
              }
            />
          )}

          {section === 'skills' && (
            <SkillsView
              state={state}
              busy={busy}
              onUnlockOrUpgradeSkill={(skillId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/skills/upgrade', 'POST', { skillId })
                )
              }
            />
          )}

          {section === 'titles' && (
            <TitlesAchievementsView
              state={state}
              busy={busy}
              onEquipTitle={(titleId) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/titles/equip', 'POST', { titleId })
                )
              }
            />
          )}

          {section === 'history' && <HistoryView state={state} />}

          {section === 'settings' && (
            <SettingsView
              state={state}
              busy={busy}
              onSaveSettings={(payload) =>
                runAction(() =>
                  apiRequest<FullPlayerState>('/api/player/settings', 'POST', payload)
                )
              }
              onSignOut={handleSignOut}
            />
          )}
        </main>
      </div>

      {/* Mobile Compact Bottom Navigation (<= 15% height, >= 44px touch targets) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2879B7]/45 bg-[#050A13]/95 backdrop-blur-md lg:hidden">
        <div className="grid h-14 grid-cols-5 items-center">
          {(
            [
              ['dashboard', 'Home', LayoutDashboard],
              ['daily-quest', 'Quest', CheckSquare],
              ['status', 'Status', Activity],
              ['special-quests', 'Special', Swords],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setSection(id);
                }}
                className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  active ? 'text-[#67E8F9]' : 'text-[#94A3B8]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#94A3B8]"
          >
            <Menu className="h-4 w-4" />
            <span>System</span>
          </button>
        </div>
      </nav>

      {/* Expandable Mobile System Drawer for Secondary Screens */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/75 backdrop-blur-sm lg:hidden"
          >
            <SystemFrame className="w-full p-5 pb-8">
              <div className="flex items-center justify-between border-b border-[#2879B7]/35 pb-3">
                <span className="font-display text-sm font-bold tracking-wider text-[#67E8F9]">
                  SYSTEM MENU
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center text-[#94A3B8]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {ALL_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        setSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex min-h-[46px] items-center gap-2.5 border px-3 py-2 text-xs font-medium ${
                        section === item.id
                          ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                          : 'border-[#2879B7]/35 bg-[#050A13]/70 text-[#CBD5E1]'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-[#67E8F9]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-[#2879B7]/30 pt-3">
                <PWAInstallButton compact />
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-Up Cinematic Modal */}
      <AnimatePresence>
        {levelUpBanner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <SystemFrame variant="gold" scanBeam className="w-full max-w-md p-8 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-[#FACC15]" />
              <p className="mt-3 font-mono-tabular text-xs tracking-[0.28em] text-[#FACC15]">
                [SYSTEM NOTIFICATION]
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-wider text-[#F8FAFC]">
                LEVEL UP!
              </h2>
              <p className="mt-3 font-mono-tabular text-xl font-bold text-[#67E8F9]">
                Level {levelUpBanner} Reached
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">
                All five base attributes increased by +1, HP/MP capacity expanded, and +3 distributable Stat Points awarded.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLevelUpBanner(null);
                    setSection('status');
                  }}
                  className="min-h-[44px] border border-[#FACC15] bg-[#FACC15]/20 px-5 py-2 text-xs font-bold text-[#FACC15]"
                >
                  OPEN STATUS WINDOW
                </button>
                <button
                  type="button"
                  onClick={() => setLevelUpBanner(null)}
                  className="min-h-[44px] border border-[#2879B7]/50 px-5 py-2 text-xs text-[#CBD5E1]"
                >
                  Continue
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reusable System Notification Overlay */}
      <SystemNotificationOverlay
        activeToast={activeToast}
        notifications={state.notifications}
        centerOpen={notifCenterOpen}
        animationsEnabled={state.profile.animationsEnabled}
        onDismissToast={() => setActiveToast(null)}
        onCloseCenter={() => setNotifCenterOpen(false)}
        onMarkAllRead={() =>
          runAction(() => apiRequest<FullPlayerState>('/api/player/notifications/read', 'POST', {}))
        }
      />

      <OfflineIndicator />
    </div>
  );
}
