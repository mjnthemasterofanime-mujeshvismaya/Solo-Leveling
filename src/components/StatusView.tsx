import React from 'react';
import { Activity, Plus, Shield, Sparkles, UserCheck } from 'lucide-react';
import { FullPlayerState } from '../types/system';
import { SystemFrame } from './SystemFrame';
import { HUNTER_RANKS, TITLES_CATALOG } from '../shared/systemData';
import { soundEngine } from '../lib/sound';

interface StatusViewProps {
  state: FullPlayerState;
  busy: boolean;
  onAllocateStat: (
    stat: 'strength' | 'stamina' | 'agility' | 'intelligence' | 'sense',
    amount: number
  ) => Promise<void>;
}

export function StatusView({ state, busy, onAllocateStat }: StatusViewProps) {
  const { profile, status, titles, fitnessProfile } = state;
  const equippedTitleId = titles.find((t) => t.equipped)?.titleId;
  const equippedTitle = TITLES_CATALOG.find((t) => t.id === equippedTitleId);

  const currentRankIndex = HUNTER_RANKS.findIndex((r) => r.rank === status.hunterRank);
  const currentRankTier = HUNTER_RANKS[Math.max(0, currentRankIndex)];
  const nextRankTier = HUNTER_RANKS[currentRankIndex + 1] || null;

  const rankSpan = nextRankTier ? Math.max(1, nextRankTier.minLevel - currentRankTier.minLevel) : 25;
  const levelsIntoRank = Math.max(0, status.level - currentRankTier.minLevel);
  const rankProgressPct = nextRankTier
    ? Math.min(100, Math.max(0, Math.round((levelsIntoRank / rankSpan) * 100)))
    : 100;

  const expPct = Math.min(100, Math.round((status.exp / Math.max(1, status.nextLevelExp)) * 100));

  const attributes: Array<{
    key: 'strength' | 'stamina' | 'agility' | 'intelligence' | 'sense';
    label: string;
    value: number;
    note: string;
  }> = [
    { key: 'strength', label: 'STRENGTH', value: status.strength, note: 'Fictional upper/compound power index' },
    { key: 'stamina', label: 'STAMINA', value: status.stamina, note: 'Increases System HP (+10 per point)' },
    { key: 'agility', label: 'AGILITY', value: status.agility, note: 'Fictional speed & conditioning index' },
    { key: 'intelligence', label: 'INTELLIGENCE', value: status.intelligence, note: 'Increases System MP (+8 per point)' },
    { key: 'sense', label: 'SENSE', value: status.sense, note: 'Fictional focus & awareness index' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Holographic Status Window */}
      <SystemFrame scanBeam variant={status.jobChangeCompleted ? 'monarch' : 'default'} className="p-6 md:p-8">
        <div className="border-b border-[#2879B7]/40 pb-4 text-center">
          <p className="font-mono-tabular text-xs tracking-[0.28em] text-[#67E8F9] uppercase">
            Holographic Interface
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.18em] text-[#F8FAFC] uppercase">
            STATUS
          </h1>
        </div>

        {/* Player Identity & Vitals Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-[#2879B7]/25 py-2 text-sm">
              <span className="text-[#94A3B8]">Name</span>
              <span className="font-semibold text-[#F8FAFC]">{profile.username}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#2879B7]/25 py-2 text-sm">
              <span className="text-[#94A3B8]">Level</span>
              <span className="font-mono-tabular text-lg font-bold text-[#67E8F9]">{status.level}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#2879B7]/25 py-2 text-sm">
              <span className="text-[#94A3B8]">Job / Class</span>
              <span className={`font-semibold ${status.jobChangeCompleted ? 'text-[#C084FC]' : 'text-[#F8FAFC]'}`}>
                {status.job}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#2879B7]/25 py-2 text-sm">
              <span className="text-[#94A3B8]">Equipped Title</span>
              <span className="font-medium text-[#FACC15]">
                {equippedTitle ? equippedTitle.name : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#2879B7]/25 py-2 text-sm">
              <span className="text-[#94A3B8]">Hunter Rank</span>
              <span className="font-mono-tabular font-bold" style={{ color: currentRankTier.color }}>
                {status.hunterRank}
              </span>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7 lg:border-l lg:border-[#2879B7]/30 lg:pl-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-[#2879B7]/35 bg-[#050A13]/70 p-3">
                <p className="text-xs text-[#94A3B8]">HP (Fictional)</p>
                <p className="mt-1 font-mono-tabular text-xl font-bold text-[#4ADE80]">{status.hp}</p>
              </div>
              <div className="border border-[#2879B7]/35 bg-[#050A13]/70 p-3">
                <p className="text-xs text-[#94A3B8]">MP (Fictional)</p>
                <p className="mt-1 font-mono-tabular text-xl font-bold text-[#38BDF8]">{status.mp}</p>
              </div>
              <div className="border border-[#2879B7]/35 bg-[#050A13]/70 p-3">
                <p className="text-xs text-[#94A3B8]">Fatigue</p>
                <p className="mt-1 font-mono-tabular text-xl font-bold text-[#FACC15]">{status.fatigue}%</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">Level Experience ({status.totalExp.toLocaleString()} Total EXP)</span>
                <span className="font-mono-tabular text-[#67E8F9]">
                  {status.exp} / {status.nextLevelExp}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full bg-[#050A13] border border-[#2879B7]/40">
                <div className="h-full bg-[#38BDF8]" style={{ width: `${expPct}%` }} />
              </div>
            </div>

            {/* Hunter Rank Progression Bar (25 Levels per Rank) */}
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">
                  Hunter Rank Progression · {currentRankTier.title}
                </span>
                <span className="font-mono-tabular text-[#FACC15]">
                  {nextRankTier ? `Lv ${status.level} / ${nextRankTier.minLevel} -> ${nextRankTier.rank}` : 'MAX RANK (Lv 126+)'}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full bg-[#050A13] border border-[#2879B7]/40">
                <div className="h-full bg-[#FACC15]" style={{ width: `${rankProgressPct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-[#94A3B8]">{currentRankTier.description}</p>
            </div>
          </div>
        </div>

        {/* Distributable System Attributes */}
        <div className="mt-8 border-t border-[#2879B7]/40 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-wider text-[#F8FAFC]">
                SYSTEM ATTRIBUTES
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Fictional Player parameters. Earn +3 Stat Points on every Level-Up and Daily Quest completion.
              </p>
            </div>
            <div className="flex items-center gap-2 border border-[#FACC15]/50 bg-[#FACC15]/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-[#FACC15]" />
              <span className="font-mono-tabular text-sm font-bold text-[#FACC15]">
                Available Points: {status.availableStatPoints}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {attributes.map((attr) => (
              <div
                key={attr.key}
                className="flex flex-col justify-between border border-[#2879B7]/40 bg-[#050A13]/75 p-4"
              >
                <div>
                  <p className="font-mono-tabular text-xs tracking-wider text-[#67E8F9]">{attr.label}</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#F8FAFC]">{attr.value}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#94A3B8]">{attr.note}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || status.availableStatPoints < 1}
                    onClick={() => {
                      soundEngine.playTap();
                      onAllocateStat(attr.key, 1);
                    }}
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-1 border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-xs font-semibold text-[#F8FAFC] hover:bg-[#38BDF8]/25 disabled:opacity-35"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>1</span>
                  </button>
                  {status.availableStatPoints >= 3 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        soundEngine.playNotification();
                        onAllocateStat(attr.key, 3);
                      }}
                      className="min-h-[40px] border border-[#FACC15]/60 bg-[#FACC15]/15 px-2.5 font-mono-tabular text-xs font-semibold text-[#FACC15] hover:bg-[#FACC15]/25"
                    >
                      +3
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SystemFrame>

      {/* Clearly Separated Real-World Fitness Status */}
      <SystemFrame className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2879B7]/35 pb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-[#4ADE80]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                Real-World Fitness Status
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Physical measurements and verified workout volume (kept separate from fictional HP/MP attributes).
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#4ADE80]">
            <UserCheck className="h-4 w-4" />
            <span>{fitnessProfile.recoveryMode ? 'Recovery Mode Active' : 'Training Active'}</span>
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-[#2879B7]/30 bg-[#050A13]/60 p-4">
            <p className="text-xs text-[#94A3B8]">Body Weight</p>
            <p className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
              {profile.weightKg ?? '--'} kg
            </p>
          </div>
          <div className="border border-[#2879B7]/30 bg-[#050A13]/60 p-4">
            <p className="text-xs text-[#94A3B8]">Lifetime Sit-Ups</p>
            <p className="mt-1 font-mono-tabular text-xl font-bold text-[#67E8F9]">
              {status.totalSitups.toLocaleString()}
            </p>
          </div>
          <div className="border border-[#2879B7]/30 bg-[#050A13]/60 p-4">
            <p className="text-xs text-[#94A3B8]">Lifetime Push-Ups</p>
            <p className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
              {status.totalPushups.toLocaleString()}
            </p>
          </div>
          <div className="border border-[#2879B7]/30 bg-[#050A13]/60 p-4">
            <p className="text-xs text-[#94A3B8]">Lifetime Squats</p>
            <p className="mt-1 font-mono-tabular text-xl font-bold text-[#F8FAFC]">
              {status.totalSquats.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#94A3B8]">
          <span>Experience Tier: <strong className="capitalize text-[#F8FAFC]">{fitnessProfile.experienceLevel}</strong></span>
          <span>Goal: <strong className="text-[#F8FAFC]">{profile.fitnessGoal}</strong></span>
          <span>Completed Daily Quests: <strong className="font-mono-tabular text-[#4ADE80]">{status.completedQuestsCount}</strong></span>
          {fitnessProfile.limitations && (
            <span className="inline-flex items-center gap-1 text-[#FACC15]">
              <Shield className="h-3.5 w-3.5" />
              <span>Adjusted for: {fitnessProfile.limitations}</span>
            </span>
          )}
        </div>
      </SystemFrame>
    </div>
  );
}
