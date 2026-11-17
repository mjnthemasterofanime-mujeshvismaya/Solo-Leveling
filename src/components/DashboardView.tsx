import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  Clock,
  Flame,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { FullPlayerState, NavSection } from '../types/system';
import { SystemFrame } from './SystemFrame';
import { TITLES_CATALOG, formatMissionTarget } from '../shared/systemData';
import { soundEngine } from '../lib/sound';

interface DashboardViewProps {
  state: FullPlayerState;
  onNavigate: (section: NavSection) => void;
  onOpenNotifications: () => void;
}

export function useCountdown(deadlineIso?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!deadlineIso) return { label: '24:00:00', expired: false };
  const diff = new Date(deadlineIso).getTime() - now;
  if (diff <= 0) return { label: '00:00:00', expired: true };

  const hrs = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { label: `${pad(hrs)}:${pad(mins)}:${pad(secs)}`, expired: false };
}

export function DashboardView({
  state,
  onNavigate,
  onOpenNotifications,
}: DashboardViewProps) {
  const { profile, status, dailyQuest, titles, notifications, fitnessProfile } = state;
  const countdown = useCountdown(dailyQuest?.deadline);

  const equippedTitleEntry = titles.find((t) => t.equipped);
  const equippedTitleDef = TITLES_CATALOG.find((t) => t.id === equippedTitleEntry?.titleId);

  const expPct = Math.min(100, Math.round((status.exp / Math.max(1, status.nextLevelExp)) * 100));
  const missions = dailyQuest?.missions || [];
  const remainingMissions = missions.filter((m) => m.completedAmount < m.target).length;
  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  const hasShadowHalo = profile.activeAvatarFrame === 'shadow_halo';

  return (
    <div className="space-y-8">
      {/* Main Hero System Briefing */}
      <SystemFrame scanBeam className="p-6 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Player Identity & Holographic Portrait */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center lg:col-span-7">
            <div
              className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border-2 bg-[#050A13] md:h-28 md:w-28 ${
                hasShadowHalo
                  ? 'border-[#A855F7] shadow-[0_0_24px_rgba(168,85,247,0.5)]'
                  : 'border-[#38BDF8]/70 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
              }`}
            >
              <img
                src="/src/assets/images/player_avatar_hunter_1794898190133.jpg"
                alt="Player Avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono-tabular text-xs tracking-[0.22em] text-[#67E8F9] uppercase">
                WELCOME BACK, PLAYER.
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-wide text-[#F8FAFC] md:text-3xl text-balance">
                YOUR DAILY QUEST IS WAITING.
              </h1>

              {/* Clean unboxed metadata line */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
                <span className="font-semibold text-[#F8FAFC]">{profile.username}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-[#67E8F9]">{status.hunterRank}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-[#F8FAFC]">Level {status.level}</span>
                <span aria-hidden="true">·</span>
                <span>{status.job}</span>
                {equippedTitleDef && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FACC15]">[{equippedTitleDef.name}]</span>
                  </>
                )}
              </div>

              {/* EXP Bar */}
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Experience Progress</span>
                  <span className="font-mono-tabular text-[#67E8F9]">
                    {status.exp} / {status.nextLevelExp} EXP ({expPct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden bg-[#050A13] border border-[#2879B7]/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#2879B7] via-[#38BDF8] to-[#67E8F9] transition-all duration-300"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Primary Daily Quest Focal CTA */}
          <div className="flex flex-col justify-between gap-4 border-t border-[#2879B7]/30 pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wider text-[#67E8F9] uppercase">
                Daily Quest Status
              </span>
              <span
                className={`font-mono-tabular font-semibold ${
                  dailyQuest?.status === 'completed'
                    ? 'text-[#4ADE80]'
                    : dailyQuest?.status === 'failed'
                      ? 'text-[#EF4444]'
                      : 'text-[#F8FAFC]'
                }`}
              >
                {dailyQuest?.status === 'completed'
                  ? dailyQuest.rewardsClaimed
                    ? 'CLEARED & CLAIMED'
                    : 'COMPLETE — CLAIM REWARDS'
                  : fitnessProfile.recoveryMode
                    ? 'RECOVERY PROTOCOL'
                    : 'ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-1">
              <div>
                <p className="text-xs text-[#94A3B8]">Completion</p>
                <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#F8FAFC]">
                  {dailyQuest?.completionPercentage ?? 0}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94A3B8]">Remaining</p>
                <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#67E8F9]">
                  {remainingMissions}/{missions.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94A3B8]">Deadline</p>
                <p className="mt-1 font-mono-tabular text-lg font-bold text-[#F8FAFC] sm:text-xl">
                  {countdown.label}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onNavigate('daily-quest');
              }}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/20 px-6 py-3 text-sm font-bold tracking-widest text-[#F8FAFC] hover:bg-[#38BDF8]/30 transition-colors whitespace-nowrap"
            >
              <span>[OPEN DAILY QUEST]</span>
              <ArrowRight className="h-4 w-4 text-[#67E8F9]" />
            </button>
          </div>
        </div>
      </SystemFrame>

      {/* 4-Column System Telemetry KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SystemFrame className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Total EXP</span>
            <TrendingUp className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#F8FAFC]">
            {status.totalExp.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">Lifetime earned</p>
        </SystemFrame>

        <SystemFrame className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-[#FACC15]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#F8FAFC]">
            {status.streak} <span className="text-sm font-normal text-[#94A3B8]">Days</span>
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-[#94A3B8]">
            Best: {status.highestStreak} days
          </p>
        </SystemFrame>

        <SystemFrame
          variant={status.availableStatPoints > 0 ? 'gold' : 'default'}
          className="p-5"
        >
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Available Stat Points</span>
            <Sparkles className="h-4 w-4 text-[#FACC15]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#FACC15]">
            +{status.availableStatPoints}
          </p>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onNavigate('status');
            }}
            className="mt-1 text-xs font-medium text-[#67E8F9] hover:underline"
          >
            {status.availableStatPoints > 0 ? 'Allocate in Status Window' : 'View Status Window'}
          </button>
        </SystemFrame>

        <SystemFrame className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Player Treasury</span>
            <Award className="h-4 w-4 text-[#FACC15]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#FACC15]">
            {status.gold.toLocaleString()} <span className="text-xs font-normal text-[#94A3B8]">GOLD</span>
          </p>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onNavigate('shop');
            }}
            className="mt-1 text-xs font-medium text-[#67E8F9] hover:underline"
          >
            Open System Shop
          </button>
        </SystemFrame>
      </div>

      {/* Two-Column Lower Section: Active Quest Snapshot & Recent Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SystemFrame className="p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#2879B7]/35 pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-wide text-[#F8FAFC]">
                Daily Quest Objectives
              </h2>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                {dailyQuest?.title} · Mode: <span className="capitalize text-[#67E8F9]">{dailyQuest?.difficultyMode}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('daily-quest')}
              className="min-h-[40px] border border-[#2879B7]/60 px-3 py-1.5 text-xs font-semibold text-[#67E8F9] hover:bg-[#38BDF8]/15 transition-colors whitespace-nowrap"
            >
              Update Progress
            </button>
          </div>

          <div className="mt-4 divide-y divide-[#2879B7]/20">
            {missions.map((m) => {
              const pct = Math.min(100, Math.round((m.completedAmount / Math.max(0.01, m.target)) * 100));
              const done = m.completedAmount >= m.target;
              return (
                <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={done ? 'font-medium text-[#4ADE80]' : 'font-medium text-[#F8FAFC]'}>
                        {m.exerciseName}
                      </span>
                      <span className="font-mono-tabular text-xs text-[#CBD5E1]">
                        {m.completedAmount} / {formatMissionTarget(m.exerciseKey, m.target, m.unit)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-[#050A13]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          done ? 'bg-[#4ADE80]' : 'bg-[#38BDF8]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono-tabular text-xs text-[#94A3B8]">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </SystemFrame>

        <div className="space-y-6 lg:col-span-5">
          <SystemFrame className="p-6">
            <div className="flex items-center justify-between border-b border-[#2879B7]/35 pb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#38BDF8]" />
                <h2 className="font-display text-lg font-semibold tracking-wide text-[#F8FAFC]">
                  Recent System Alerts
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenNotifications}
                className="text-xs font-medium text-[#67E8F9] hover:underline whitespace-nowrap"
              >
                View All ({unreadCount} unread)
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="border border-[#2879B7]/30 bg-[#050A13]/60 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-semibold uppercase tracking-wider ${
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
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#CBD5E1]">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="py-6 text-center text-xs text-[#94A3B8]">No recent alerts.</p>
              )}
            </div>
          </SystemFrame>

          <SystemFrame className="p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#4ADE80]" />
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Adaptive Safety &amp; Recovery</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  {fitnessProfile.recoveryMode
                    ? 'Recovery Mode is currently active. Daily targets are halved and Penalty Zone penalties are paused.'
                    : 'Listen to your joints and soreness. You can adjust targets or enable Recovery Override inside Daily Quest anytime.'}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigate('special-quests')}
                    className="font-medium text-[#67E8F9] hover:underline"
                  >
                    Open Special Quests
                  </button>
                  <span aria-hidden="true" className="text-[#475569]">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('history')}
                    className="inline-flex items-center gap-1 font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Quest History</span>
                  </button>
                </div>
              </div>
            </div>
          </SystemFrame>
        </div>
      </div>
    </div>
  );
}
