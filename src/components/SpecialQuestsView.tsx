import React, { useState } from 'react';
import { Crown, EyeOff, Flame, Lock, ShieldAlert, Swords, Zap } from 'lucide-react';
import { FullPlayerState } from '../types/system';
import { SystemFrame } from './SystemFrame';
import {
  ACHIEVEMENTS_CATALOG,
  EMERGENCY_QUEST_TEMPLATES,
  MAIN_QUEST_TEMPLATES,
} from '../shared/systemData';
import { soundEngine } from '../lib/sound';

interface SpecialQuestsViewProps {
  state: FullPlayerState;
  busy: boolean;
  onClaimSpecial: (specialQuestId: number) => Promise<void>;
  onEmergencyAction: (action: 'spawn' | 'complete', specialQuestId?: number) => Promise<void>;
  onAdvanceJobChange: () => Promise<void>;
}

export function SpecialQuestsView({
  state,
  busy,
  onClaimSpecial,
  onEmergencyAction,
  onAdvanceJobChange,
}: SpecialQuestsViewProps) {
  const [tab, setTab] = useState<'main' | 'emergency' | 'hidden' | 'job-change'>('main');
  const { specialQuests, achievements, status } = state;

  const mainQuests = specialQuests.filter((q) => q.category === 'main');
  const emergencyQuests = specialQuests.filter((q) => q.category === 'emergency');
  const hiddenCatalog = ACHIEVEMENTS_CATALOG.filter((a) => a.hidden);
  const unlockedIds = new Set(achievements.map((a) => a.achievementId));

  const jobUnlocked = status.level >= 5 || status.completedQuestsCount >= 3;
  const stageLabels = [
    'Stage 1: Enter the Red Knight Gate (Warmup Endurance Commitment)',
    'Stage 2: Confront Blood-Red Commander Igris (Core & Conditioning Resolve)',
    'Stage 3: Arise — Claim the Shadow Monarch Class Ascension',
  ];

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-widest text-[#67E8F9] uppercase">
              Special Progression Directives
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
              Special Quests &amp; Evolution
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['main', 'Main Quests'],
                ['emergency', 'Emergency Quests'],
                ['hidden', 'Hidden Quests'],
                ['job-change', 'Job Change'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setTab(key);
                }}
                className={`min-h-[42px] border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                    : 'border-[#2879B7]/40 bg-[#050A13]/60 text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </SystemFrame>

      {tab === 'main' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mainQuests.map((mq) => {
            const tpl = MAIN_QUEST_TEMPLATES.find((t) => t.key === mq.questKey);
            const pct = Math.min(100, Math.round((mq.progressValue / Math.max(1, mq.targetValue)) * 100));
            return (
              <SystemFrame key={mq.id} variant={mq.status === 'completed' ? 'gold' : 'default'} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-tabular text-xs tracking-wider text-[#67E8F9]">[MAIN QUEST]</p>
                    <h2 className="mt-1 font-display text-lg font-bold text-[#F8FAFC]">{mq.title}</h2>
                  </div>
                  <Swords className="h-5 w-5 shrink-0 text-[#38BDF8]" />
                </div>
                <p className="mt-2 text-sm text-[#94A3B8]">{mq.description}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94A3B8]">Career Progress</span>
                    <span className="font-mono-tabular text-[#F8FAFC]">
                      {mq.progressValue} / {mq.targetValue} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full bg-[#050A13] border border-[#2879B7]/40">
                    <div className="h-full bg-[#38BDF8]" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#2879B7]/25 pt-4 text-xs">
                  <span className="font-mono-tabular text-[#FACC15]">
                    Reward: +{tpl?.xpReward || 400} EXP · +{tpl?.goldReward || 500} Gold
                  </span>
                  {mq.status === 'completed' && !mq.rewardsClaimed ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        soundEngine.playRewardReveal();
                        onClaimSpecial(mq.id);
                      }}
                      className="min-h-[40px] border border-[#FACC15] bg-[#FACC15]/20 px-4 py-1.5 font-bold text-[#FACC15]"
                    >
                      Claim Reward
                    </button>
                  ) : mq.status === 'claimed' ? (
                    <span className="font-semibold text-[#4ADE80]">CLAIMED</span>
                  ) : (
                    <span className="text-[#94A3B8]">In Progress</span>
                  )}
                </div>
              </SystemFrame>
            );
          })}
        </div>
      )}

      {tab === 'emergency' && (
        <div className="space-y-4">
          <SystemFrame variant="danger" className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#EF4444]" />
                <div>
                  <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                    Optional Emergency Quests
                  </h2>
                  <p className="mt-1 text-sm text-[#CBD5E1]">
                    Time-limited bonus conditioning challenges issued by the System. Completely optional and designed for safe short bursts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  soundEngine.playWarning();
                  onEmergencyAction('spawn');
                }}
                className="min-h-[44px] shrink-0 border border-[#EF4444]/70 bg-[#EF4444]/20 px-5 py-2 text-xs font-bold tracking-wider text-[#F8FAFC] whitespace-nowrap"
              >
                SUMMON EMERGENCY QUEST
              </button>
            </div>
          </SystemFrame>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {emergencyQuests.map((eq) => {
              const tpl = EMERGENCY_QUEST_TEMPLATES.find((t) => t.key === eq.questKey);
              return (
                <SystemFrame key={eq.id} variant={eq.status === 'active' ? 'danger' : 'default'} className="p-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold tracking-wider text-[#EF4444]">[EMERGENCY QUEST]</span>
                    <span className="font-mono-tabular text-[#94A3B8] uppercase">{eq.status}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-[#F8FAFC]">{eq.title}</h3>
                  <p className="mt-2 text-sm text-[#CBD5E1]">{eq.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#2879B7]/30 pt-4 text-xs">
                    <span className="font-mono-tabular text-[#FACC15]">
                      +{tpl?.xpReward || 150} EXP · +{tpl?.goldReward || 200} Gold
                    </span>
                    {eq.status === 'active' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          soundEngine.playQuestComplete();
                          onEmergencyAction('complete', eq.id);
                        }}
                        className="min-h-[42px] border border-[#4ADE80] bg-[#4ADE80]/20 px-4 py-2 font-bold text-[#4ADE80]"
                      >
                        Complete Challenge
                      </button>
                    ) : (
                      <span className="font-semibold text-[#4ADE80]">CLEARED</span>
                    )}
                  </div>
                </SystemFrame>
              );
            })}
            {emergencyQuests.length === 0 && (
              <SystemFrame className="p-8 text-center md:col-span-2">
                <Zap className="mx-auto h-8 w-8 text-[#94A3B8]" />
                <p className="mt-2 text-sm text-[#94A3B8]">
                  No active Emergency Quest right now. Summon one above whenever you want an optional bonus sprint.
                </p>
              </SystemFrame>
            )}
          </div>
        </div>
      )}

      {tab === 'hidden' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {hiddenCatalog.map((item) => {
            const unlocked = unlockedIds.has(item.id);
            return (
              <SystemFrame
                key={item.id}
                variant={unlocked ? 'monarch' : 'default'}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-tabular text-xs tracking-wider text-[#C084FC]">
                      {unlocked ? '[HIDDEN QUEST DISCOVERED]' : '[SEALED CONDITION]'}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-[#F8FAFC]">
                      {unlocked ? item.name : '??? — Hidden System Milestone'}
                    </h3>
                  </div>
                  {unlocked ? (
                    <Flame className="h-5 w-5 text-[#C084FC]" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-[#64748B]" />
                  )}
                </div>
                <p className="mt-2 text-sm text-[#94A3B8]">
                  {unlocked
                    ? item.description
                    : 'Trigger conditions remain concealed by the System until discovered through training discipline.'}
                </p>
                {unlocked && (
                  <p className="mt-3 font-mono-tabular text-xs text-[#FACC15]">
                    Awarded: +{item.xpReward} EXP · +{item.goldReward} Gold
                  </p>
                )}
              </SystemFrame>
            );
          })}
        </div>
      )}

      {tab === 'job-change' && (
        <SystemFrame variant="monarch" scanBeam className="p-6 md:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="flex justify-center lg:col-span-4">
              <img
                src="/src/assets/images/shadow_monarch_crest_1794898191041.jpg"
                alt="Shadow Monarch Crest"
                referrerPolicy="no-referrer"
                className="h-56 w-56 border border-[#A855F7]/60 object-cover shadow-[0_0_32px_rgba(168,85,247,0.35)]"
              />
            </div>

            <div className="lg:col-span-8">
              <p className="font-mono-tabular text-xs tracking-[0.25em] text-[#C084FC] uppercase">
                [JOB CHANGE QUEST]
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#F8FAFC] md:text-3xl">
                Class Ascension: Shadow Monarch
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
                Inspired by the iconic dungeon trial. Prove your consistency to evolve your fictional Player Class from <span className="text-[#F8FAFC] font-semibold">{status.job}</span> into <span className="text-[#C084FC] font-bold">SHADOW MONARCH</span>, unlocking +5 Stat Points, +500 Gold, the [Shadow Monarch] title, and the [Shadow Extraction] skill.
              </p>

              <div className="mt-5 space-y-2">
                {stageLabels.map((lbl, idx) => {
                  const done = status.jobChangeStage > idx || status.jobChangeCompleted;
                  return (
                    <div
                      key={lbl}
                      className={`border px-4 py-2.5 text-xs ${
                        done
                          ? 'border-[#A855F7]/60 bg-[#A855F7]/15 text-[#F8FAFC]'
                          : 'border-[#2879B7]/30 bg-[#050A13]/60 text-[#94A3B8]'
                      }`}
                    >
                      {done ? '✓ ' : ''}
                      {lbl}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                {status.jobChangeCompleted ? (
                  <div className="inline-flex items-center gap-2 border border-[#A855F7] bg-[#A855F7]/20 px-5 py-3 text-sm font-bold text-[#E9D5FF]">
                    <Crown className="h-5 w-5" />
                    <span>ASCENSION COMPLETE · SHADOW MONARCH</span>
                  </div>
                ) : !jobUnlocked ? (
                  <div className="inline-flex items-center gap-2 border border-[#2879B7]/40 bg-[#050A13]/80 px-5 py-3 text-xs text-[#94A3B8]">
                    <Lock className="h-4 w-4 text-[#FACC15]" />
                    <span>
                      Reach Player Level 5 (currently Lv.{status.level}) or complete 3 Daily Quests (currently {status.completedQuestsCount}/3) to enter the Trial.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      soundEngine.playLevelUp();
                      onAdvanceJobChange();
                    }}
                    className="min-h-[48px] border border-[#A855F7] bg-[#A855F7]/25 px-8 py-3 text-sm font-bold tracking-widest text-[#F8FAFC] hover:bg-[#A855F7]/35 transition-colors"
                  >
                    {status.jobChangeStage === 0
                      ? 'ACCEPT JOB CHANGE QUEST (STAGE 1/3)'
                      : status.jobChangeStage === 1
                        ? 'CONFRONT COMMANDER TRIAL (STAGE 2/3)'
                        : 'ARISE — COMPLETE EVOLUTION (STAGE 3/3)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </SystemFrame>
      )}
    </div>
  );
}
