import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Gift,
  HeartPulse,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { FullPlayerState, NavSection, QuestMission } from '../types/system';
import { SystemFrame } from './SystemFrame';
import { DAILY_EXERCISES, DifficultyMode } from '../shared/systemData';
import { useCountdown } from './DashboardView';
import { soundEngine } from '../lib/sound';

interface DailyQuestViewProps {
  state: FullPlayerState;
  busy: boolean;
  offlineQueuedCount: number;
  onLogProgress: (questId: number, missionId: number, amount: number) => Promise<void>;
  onClaimRewards: (questId: number) => Promise<void>;
  onChangeDifficulty: (questId: number, mode: DifficultyMode, customTargets?: Record<string, number>) => Promise<void>;
  onToggleRecovery: (questId: number, enabled: boolean) => Promise<void>;
  onTriggerPenalty: (questId: number) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export function DailyQuestView({
  state,
  busy,
  offlineQueuedCount,
  onLogProgress,
  onClaimRewards,
  onChangeDifficulty,
  onToggleRecovery,
  onTriggerPenalty,
  onNavigate,
}: DailyQuestViewProps) {
  const { dailyQuest, fitnessProfile } = state;
  const countdown = useCountdown(dailyQuest?.deadline);

  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTargetsForm, setCustomTargetsForm] = useState<Record<string, number>>({});

  // Interactive Workout / Hold Timer
  const [activeTimerMission, setActiveTimerMission] = useState<QuestMission | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Reward Sequence Modal
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardStep, setRewardStep] = useState<0 | 1 | 2 | 3>(0);

  // Penalty Zone Presentation Modal
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [penaltyRemainingSec, setPenaltyRemainingSec] = useState(4 * 3600);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (!penaltyOpen) return;
    const id = window.setInterval(() => {
      setPenaltyRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [penaltyOpen]);

  if (!dailyQuest) {
    return (
      <SystemFrame className="p-8 text-center">
        <p className="text-sm text-[#94A3B8]">Initializing today&apos;s Daily Quest...</p>
      </SystemFrame>
    );
  }

  const formatDuration = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const openCustomEditor = () => {
    const initial: Record<string, number> = {};
    for (const m of dailyQuest.missions) {
      initial[m.exerciseKey] = m.target;
    }
    setCustomTargetsForm(initial);
    setShowCustomModal(true);
  };

  const handleRewardClaim = async () => {
    soundEngine.playQuestComplete();
    await onClaimRewards(dailyQuest.id);
    setRewardModalOpen(true);
    setRewardStep(1);
  };

  const missedMissions = dailyQuest.missions.filter((m) => m.completedAmount < m.target);

  return (
    <div className="space-y-6">
      {/* Main Quest Header Window */}
      <SystemFrame scanBeam variant={dailyQuest.status === 'completed' ? 'gold' : 'default'} className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-[0.22em] text-[#67E8F9] uppercase">
              [Daily Quest: Strength Training has arrived.]
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-wider text-[#F8FAFC] md:text-3xl">
              {dailyQuest.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
              <span>Quest Date: <span className="font-mono-tabular text-[#F8FAFC]">{dailyQuest.questDate}</span></span>
              <span aria-hidden="true">·</span>
              <span>Mode: <span className="capitalize text-[#67E8F9]">{dailyQuest.difficultyMode}</span></span>
              <span aria-hidden="true">·</span>
              <span>Deadline: <span className="font-mono-tabular text-[#F8FAFC]">{countdown.label}</span></span>
              {offlineQueuedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#FACC15]">{offlineQueuedCount} queued offline updates</span>
                </>
              )}
            </div>
          </div>

          {/* Difficulty Mode Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(['adaptive', 'classic', 'custom'] as DifficultyMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={busy}
                onClick={() => {
                  soundEngine.playTap();
                  if (mode === 'custom') {
                    openCustomEditor();
                  } else {
                    onChangeDifficulty(dailyQuest.id, mode);
                  }
                }}
                className={`min-h-[42px] border px-4 py-2 text-xs font-semibold capitalize tracking-wider transition-colors whitespace-nowrap ${
                  dailyQuest.difficultyMode === mode
                    ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                    : 'border-[#2879B7]/40 bg-[#050A13]/70 text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {mode} Quest
              </button>
            ))}
          </div>
        </div>

        {/* Overall Completion Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#94A3B8]">Overall Quest Completion</span>
            <span className="font-mono-tabular font-semibold text-[#67E8F9]">
              {dailyQuest.completionPercentage}%
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden border border-[#2879B7]/40 bg-[#050A13]">
            <div
              className={`h-full transition-all duration-300 ${
                dailyQuest.status === 'completed'
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#4ADE80]'
                  : 'bg-gradient-to-r from-[#2879B7] via-[#38BDF8] to-[#67E8F9]'
              }`}
              style={{ width: `${dailyQuest.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Recovery & Quest Actions Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#2879B7]/30 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                soundEngine.playTap();
                onToggleRecovery(dailyQuest.id, !fitnessProfile.recoveryMode);
              }}
              className={`flex min-h-[42px] items-center gap-2 border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                fitnessProfile.recoveryMode
                  ? 'border-[#4ADE80] bg-[#4ADE80]/15 text-[#4ADE80]'
                  : 'border-[#2879B7]/50 bg-[#050A13]/70 text-[#CBD5E1] hover:border-[#38BDF8]'
              }`}
            >
              <HeartPulse className="h-4 w-4" />
              <span>
                {fitnessProfile.recoveryMode ? 'Recovery Override: ON (50% Load)' : 'Enable Recovery Override'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playWarning();
                setPenaltyRemainingSec(4 * 3600);
                setPenaltyOpen(true);
                onTriggerPenalty(dailyQuest.id);
              }}
              className="flex min-h-[42px] items-center gap-2 border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs font-medium text-[#FCA5A5] hover:bg-[#EF4444]/20 transition-colors whitespace-nowrap"
            >
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              <span>Penalty Zone Event</span>
            </button>
          </div>

          {dailyQuest.status === 'completed' && !dailyQuest.rewardsClaimed && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRewardClaim}
              className="flex min-h-[46px] items-center gap-2 border border-[#FACC15] bg-[#FACC15]/20 px-6 py-2.5 text-sm font-bold tracking-wider text-[#FACC15] hover:bg-[#FACC15]/30 transition-colors whitespace-nowrap"
            >
              <Gift className="h-4 w-4" />
              <span>CLAIM DAILY QUEST REWARDS</span>
            </button>
          )}

          {dailyQuest.rewardsClaimed && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4ADE80]">
              <CheckCircle2 className="h-4 w-4" />
              <span>DAILY QUEST REWARDS CLAIMED</span>
            </div>
          )}
        </div>
      </SystemFrame>

      {/* Active Workout Session Timer Bar (when started for an exercise) */}
      {activeTimerMission && (
        <SystemFrame variant="gold" className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#FACC15] uppercase">
                Active Exercise Timer · {activeTimerMission.exerciseName}
              </p>
              <p className="mt-1 font-mono-tabular text-3xl font-bold text-[#F8FAFC]">
                {formatDuration(timerSeconds)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="flex min-h-[44px] items-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/20 px-4 py-2 text-xs font-semibold text-[#F8FAFC]"
              >
                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{timerRunning ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="flex min-h-[44px] items-center gap-2 border border-[#2879B7]/50 px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              {activeTimerMission.unit === 'sec' && timerSeconds > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const sec = timerSeconds;
                    setTimerRunning(false);
                    setTimerSeconds(0);
                    setActiveTimerMission(null);
                    soundEngine.playNotification();
                    await onLogProgress(dailyQuest.id, activeTimerMission.id, sec);
                  }}
                  className="min-h-[44px] border border-[#4ADE80] bg-[#4ADE80]/20 px-4 py-2 text-xs font-bold text-[#4ADE80]"
                >
                  Log {timerSeconds}s to {activeTimerMission.exerciseName}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setActiveTimerMission(null);
                }}
                className="min-h-[44px] px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </SystemFrame>
      )}

      {/* 8 Daily Quest Missions Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {dailyQuest.missions.map((mission) => {
          const exMeta = DAILY_EXERCISES.find((e) => e.key === mission.exerciseKey);
          const pct = Math.min(100, Math.round((mission.completedAmount / Math.max(0.01, mission.target)) * 100));
          const remaining = Math.max(0, Number((mission.target - mission.completedAmount).toFixed(2)));
          const completed = mission.completedAmount >= mission.target;
          const isExpanded = expandedMissionId === mission.id;

          return (
            <SystemFrame
              key={mission.id}
              variant={completed ? 'default' : 'default'}
              className={`p-5 ${completed ? 'border-[#4ADE80]/55' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-[#F8FAFC]">
                      {mission.exerciseName}
                    </h3>
                    {exMeta?.isOriginal && (
                      <span className="text-[11px] font-medium text-[#67E8F9]">· Classic Core</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono-tabular text-xs text-[#94A3B8]">
                    Completed: <span className="text-[#F8FAFC]">{mission.completedAmount}</span> / {mission.target} {mission.unit} · Remaining: <span className="text-[#67E8F9]">{remaining} {mission.unit}</span>
                  </p>
                </div>

                <span
                  className={`font-mono-tabular text-xs font-bold ${
                    completed ? 'text-[#4ADE80]' : 'text-[#38BDF8]'
                  }`}
                >
                  {completed ? '[COMPLETE]' : `${pct}%`}
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden border border-[#2879B7]/35 bg-[#050A13]">
                <div
                  className={`h-full transition-all duration-300 ${
                    completed ? 'bg-[#4ADE80]' : 'bg-gradient-to-r from-[#2879B7] to-[#67E8F9]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Quick Progress Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(exMeta?.quickSteps || [5, 10, 20]).map((step) => (
                  <button
                    key={step}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      soundEngine.playTap();
                      onLogProgress(dailyQuest.id, mission.id, step);
                    }}
                    className="flex min-h-[44px] items-center gap-1 border border-[#2879B7]/60 bg-[#050A13]/80 px-3.5 py-2 font-mono-tabular text-xs font-semibold text-[#67E8F9] hover:border-[#38BDF8] hover:bg-[#38BDF8]/15 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{step} {mission.unit}</span>
                  </button>
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = Number(customInputs[mission.id]);
                    if (val > 0) {
                      soundEngine.playTap();
                      onLogProgress(dailyQuest.id, mission.id, val);
                      setCustomInputs((p) => ({ ...p, [mission.id]: '' }));
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="number"
                    step={mission.unit === 'km' ? '0.1' : '1'}
                    min="0.1"
                    placeholder="Custom"
                    value={customInputs[mission.id] || ''}
                    onChange={(e) => setCustomInputs((p) => ({ ...p, [mission.id]: e.target.value }))}
                    className="h-[44px] w-20 border border-[#2879B7]/50 bg-[#050A13] px-2.5 font-mono-tabular text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#38BDF8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="h-[44px] border border-[#38BDF8]/60 bg-[#38BDF8]/15 px-3 text-xs font-semibold text-[#F8FAFC] hover:bg-[#38BDF8]/25"
                  >
                    Log
                  </button>
                </form>

                {exMeta?.timerSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTimerMission(mission);
                      setTimerSeconds(0);
                      setTimerRunning(true);
                    }}
                    className="flex min-h-[44px] items-center gap-1.5 border border-[#FACC15]/45 bg-[#FACC15]/10 px-3 py-2 text-xs font-medium text-[#FACC15] hover:bg-[#FACC15]/20"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Timer</span>
                  </button>
                )}
              </div>

              {/* Instructions & Rest Guidance Toggle */}
              <div className="mt-3 border-t border-[#2879B7]/25 pt-2.5">
                <button
                  type="button"
                  onClick={() => setExpandedMissionId(isExpanded ? null : mission.id)}
                  className="flex w-full items-center justify-between text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  <span>Form Instructions &amp; Rest Guidance</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#CBD5E1]">
                    <p>{mission.instructions}</p>
                    <p className="text-[#67E8F9]">Rest: {mission.restGuidance}</p>
                  </div>
                )}
              </div>
            </SystemFrame>
          );
        })}
      </div>

      {/* Custom Targets Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <SystemFrame className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
              <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
                Configure Custom Daily Targets
              </h2>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Adjust targets safely to match your current recovery, soreness, or equipment.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dailyQuest.missions.map((m) => (
                  <div key={m.exerciseKey}>
                    <label className="block text-xs text-[#94A3B8]">
                      {m.exerciseName} ({m.unit})
                    </label>
                    <input
                      type="number"
                      step={m.unit === 'km' ? '0.5' : '1'}
                      min={m.unit === 'km' ? '0.5' : '1'}
                      value={customTargetsForm[m.exerciseKey] ?? m.target}
                      onChange={(e) =>
                        setCustomTargetsForm((prev) => ({
                          ...prev,
                          [m.exerciseKey]: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2 font-mono-tabular text-sm text-[#F8FAFC]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="min-h-[44px] border border-[#2879B7]/40 px-4 py-2 text-xs font-medium text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await onChangeDifficulty(dailyQuest.id, 'custom', customTargetsForm);
                    setShowCustomModal(false);
                  }}
                  className="min-h-[44px] border border-[#38BDF8] bg-[#38BDF8]/20 px-5 py-2 text-xs font-bold text-[#F8FAFC]"
                >
                  Apply Custom Targets
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward Sequence Modal (3 Individual Reveals) */}
      <AnimatePresence>
        {rewardModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <SystemFrame variant="gold" scanBeam className="w-full max-w-lg p-6 md:p-8 text-center">
              <p className="font-mono-tabular text-xs tracking-[0.22em] text-[#4ADE80] uppercase">
                [DAILY QUEST COMPLETE.]
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#F8FAFC]">
                [CONGRATULATIONS, PLAYER.]
              </h2>

              <div className="mt-6 space-y-4">
                {rewardStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-4 text-left"
                  >
                    <p className="text-xs font-bold tracking-wider text-[#4ADE80]">
                      REWARD 1 · STATUS RECOVERY
                    </p>
                    <p className="mt-1 text-sm text-[#F8FAFC]">
                      HP &amp; MP restored, Fatigue cleared. Hydrate, stretch, and celebrate consistent discipline.
                    </p>
                  </motion.div>
                )}

                {rewardStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[#38BDF8]/50 bg-[#38BDF8]/10 p-4 text-left"
                  >
                    <p className="text-xs font-bold tracking-wider text-[#67E8F9]">
                      REWARD 2 · +3 STAT POINTS &amp; +100 BONUS EXP
                    </p>
                    <p className="mt-1 text-sm text-[#F8FAFC]">
                      Allocate your 3 new Stat Points in the Status Window alongside +120 Gold.
                    </p>
                  </motion.div>
                )}

                {rewardStep >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 border border-[#FACC15]/50 bg-[#FACC15]/10 p-4 text-left"
                  >
                    <img
                      src="/src/assets/images/loot_box_system_1794898198087.jpg"
                      alt="System Supply Box"
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 shrink-0 border border-[#FACC15]/50 object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold tracking-wider text-[#FACC15]">
                        REWARD 3 · RANDOM LOOT BOX
                      </p>
                      <p className="mt-1 text-sm text-[#F8FAFC]">
                        1× System Supply Box placed in your Inventory. Open it anytime!
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                {rewardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playRewardReveal();
                      setRewardStep((s) => (s + 1) as 1 | 2 | 3);
                    }}
                    className="min-h-[46px] border border-[#FACC15] bg-[#FACC15]/20 px-8 py-2.5 text-sm font-bold tracking-wider text-[#FACC15]"
                  >
                    REVEAL NEXT REWARD
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRewardModalOpen(false);
                        onNavigate('inventory');
                      }}
                      className="min-h-[46px] border border-[#FACC15] bg-[#FACC15]/20 px-6 py-2.5 text-xs font-bold tracking-wider text-[#FACC15]"
                    >
                      OPEN INVENTORY LOOT BOX
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRewardModalOpen(false);
                        onNavigate('status');
                      }}
                      className="min-h-[46px] border border-[#38BDF8] bg-[#38BDF8]/20 px-6 py-2.5 text-xs font-bold tracking-wider text-[#F8FAFC]"
                    >
                      ALLOCATE STAT POINTS
                    </button>
                    <button
                      type="button"
                      onClick={() => setRewardModalOpen(false)}
                      className="min-h-[46px] px-4 py-2.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Penalty Zone Red Holographic Window */}
      <AnimatePresence>
        {penaltyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          >
            <SystemFrame variant="danger" scanBeam className="w-full max-w-xl p-6 md:p-8">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-[#EF4444]" />
                <p className="mt-3 font-mono-tabular text-xs font-bold tracking-[0.25em] text-[#EF4444]">
                  [WARNING!] · [DAILY QUEST FAILED.]
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-wider text-[#F8FAFC]">
                  [PENALTY QUEST ACTIVATED: PENALTY ZONE]
                </h2>
                <p className="mt-3 font-mono-tabular text-3xl font-bold text-[#EF4444]">
                  {formatDuration(penaltyRemainingSec)}
                </p>
                <p className="mt-1 text-xs text-[#FCA5A5]">
                  Simulated 4-Hour Penalty Zone Survival Window
                </p>
              </div>

              <div className="mt-5 border border-[#EF4444]/40 bg-[#050A13]/75 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FCA5A5]">
                  Incomplete Objectives ({missedMissions.length})
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#E2E8F0]">
                  {missedMissions.length === 0 ? (
                    <span className="col-span-2 text-[#4ADE80]">All missions currently satisfied!</span>
                  ) : (
                    missedMissions.map((m) => (
                      <div key={m.id} className="font-mono-tabular">
                        {m.exerciseName}: {m.completedAmount}/{m.target} {m.unit}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-[#CBD5E1]">
                Safety Note: This Penalty Zone is a fictional Solo Leveling story event. The app never locks your device or forces extra workouts. If you are injured, ill, or need rest, enable Recovery Override to protect your training streak without penalty.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await onToggleRecovery(dailyQuest.id, true);
                    setPenaltyOpen(false);
                  }}
                  className="min-h-[44px] border border-[#4ADE80]/70 bg-[#4ADE80]/15 px-5 py-2 text-xs font-semibold text-[#4ADE80]"
                >
                  Apply Recovery Override
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltyOpen(false)}
                  className="min-h-[44px] border border-[#EF4444]/70 bg-[#EF4444]/20 px-6 py-2 text-xs font-bold tracking-wider text-[#F8FAFC]"
                >
                  RETURN TO SYSTEM
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
