import React, { useState } from 'react';
import { Award, CheckCircle2, Crown, Flame, Lock, Shield, Sparkles, Zap } from 'lucide-react';
import { FullPlayerState } from '../types/system';
import { SystemFrame } from './SystemFrame';
import {
  ACHIEVEMENTS_CATALOG,
  SKILLS_CATALOG,
  TITLES_CATALOG,
} from '../shared/systemData';
import { soundEngine } from '../lib/sound';

interface SkillsViewProps {
  state: FullPlayerState;
  busy: boolean;
  onUnlockOrUpgradeSkill: (skillId: string) => Promise<void>;
}

export function SkillsView({ state, busy, onUnlockOrUpgradeSkill }: SkillsViewProps) {
  const { skills, status } = state;

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-widest text-[#67E8F9] uppercase">
              Player Abilities
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">Skill Tree</h1>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Fictional System abilities unlocked through training levels and upgraded using Gold.
            </p>
          </div>
          <p className="font-mono-tabular text-sm font-bold text-[#FACC15]">
            Treasury: {status.gold.toLocaleString()} GOLD
          </p>
        </div>
      </SystemFrame>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SKILLS_CATALOG.map((def) => {
          const owned = skills.find((s) => s.skillId === def.id);
          const isMonarchSkill = def.id === 'shadow_extraction';
          const levelReqMet =
            status.level >= def.unlockLevel && (!isMonarchSkill || status.jobChangeCompleted);
          const currentLv = owned?.level || 0;
          const upgradeCost = owned ? def.upgradeGoldBase * currentLv : 0;
          const isMax = currentLv >= def.maxLevel;

          return (
            <SystemFrame
              key={def.id}
              variant={def.category === 'Monarch' ? 'monarch' : owned ? 'default' : 'default'}
              className={`flex flex-col justify-between p-5 ${!owned && !levelReqMet ? 'opacity-70' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      def.category === 'Monarch' ? 'text-[#C084FC]' : 'text-[#67E8F9]'
                    }`}
                  >
                    {def.category} Skill
                  </span>
                  <span className="font-mono-tabular text-[#F8FAFC]">
                    {owned ? `Lv.${currentLv} / ${def.maxLevel}` : `Requires Lv.${def.unlockLevel}`}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2.5">
                  {def.category === 'Monarch' ? (
                    <Crown className="h-5 w-5 text-[#C084FC]" />
                  ) : def.category === 'Active' ? (
                    <Zap className="h-5 w-5 text-[#38BDF8]" />
                  ) : (
                    <Shield className="h-5 w-5 text-[#4ADE80]" />
                  )}
                  <h3 className="font-display text-lg font-bold text-[#F8FAFC]">{def.name}</h3>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">{def.description}</p>
                <p className="mt-2 text-[11px] text-[#94A3B8]">{def.effectNote}</p>
              </div>

              <div className="mt-5 border-t border-[#2879B7]/25 pt-3">
                {!owned ? (
                  levelReqMet ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        soundEngine.playLevelUp();
                        onUnlockOrUpgradeSkill(def.id);
                      }}
                      className="min-h-[42px] w-full border border-[#38BDF8] bg-[#38BDF8]/20 text-xs font-bold tracking-wider text-[#F8FAFC]"
                    >
                      UNLOCK SKILL
                    </button>
                  ) : (
                    <div className="flex min-h-[42px] items-center justify-center gap-1.5 border border-[#2879B7]/30 bg-[#050A13]/70 text-xs text-[#94A3B8]">
                      <Lock className="h-3.5 w-3.5" />
                      <span>
                        {isMonarchSkill ? 'Requires Job Change Evolution' : `Unlocks at Level ${def.unlockLevel}`}
                      </span>
                    </div>
                  )
                ) : isMax ? (
                  <p className="py-2 text-center font-mono-tabular text-xs font-bold text-[#4ADE80]">
                    MAX LEVEL MASTERED
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={busy || status.gold < upgradeCost}
                    onClick={() => {
                      soundEngine.playNotification();
                      onUnlockOrUpgradeSkill(def.id);
                    }}
                    className="min-h-[42px] w-full border border-[#FACC15]/60 bg-[#FACC15]/15 text-xs font-bold text-[#FACC15] hover:bg-[#FACC15]/25 disabled:opacity-40"
                  >
                    UPGRADE TO LV.{currentLv + 1} ({upgradeCost} GOLD)
                  </button>
                )}
              </div>
            </SystemFrame>
          );
        })}
      </div>
    </div>
  );
}

interface TitlesAchievementsViewProps {
  state: FullPlayerState;
  busy: boolean;
  onEquipTitle: (titleId: string) => Promise<void>;
}

export function TitlesAchievementsView({
  state,
  busy,
  onEquipTitle,
}: TitlesAchievementsViewProps) {
  const [subTab, setSubTab] = useState<'titles' | 'achievements'>('titles');
  const unlockedTitleMap = new Map(state.titles.map((t) => [t.titleId, t]));
  const unlockedAchMap = new Map(state.achievements.map((a) => [a.achievementId, a]));

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-widest text-[#67E8F9] uppercase">
              Player Recognition
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
              Titles &amp; Achievements
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubTab('titles')}
              className={`min-h-[42px] border px-4 py-2 text-xs font-semibold whitespace-nowrap ${
                subTab === 'titles'
                  ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                  : 'border-[#2879B7]/40 bg-[#050A13]/60 text-[#94A3B8]'
              }`}
            >
              Titles ({state.titles.length}/{TITLES_CATALOG.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('achievements')}
              className={`min-h-[42px] border px-4 py-2 text-xs font-semibold whitespace-nowrap ${
                subTab === 'achievements'
                  ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                  : 'border-[#2879B7]/40 bg-[#050A13]/60 text-[#94A3B8]'
              }`}
            >
              Achievements ({state.achievements.length}/{ACHIEVEMENTS_CATALOG.length})
            </button>
          </div>
        </div>
      </SystemFrame>

      {subTab === 'titles' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TITLES_CATALOG.map((title) => {
            const owned = unlockedTitleMap.get(title.id);
            return (
              <SystemFrame
                key={title.id}
                variant={owned?.equipped ? 'gold' : title.rarity === 'Monarch' ? 'monarch' : 'default'}
                className={`flex flex-col justify-between p-5 ${!owned ? 'opacity-65' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#67E8F9]">{title.rarity}</span>
                    {owned ? (
                      <span className="font-semibold text-[#4ADE80]">UNLOCKED</span>
                    ) : (
                      <span className="text-[#94A3B8]">LOCKED</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#FACC15]" />
                    <h3 className="font-display text-lg font-bold text-[#F8FAFC]">{title.name}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">{title.description}</p>
                  <p className="mt-2 text-[11px] text-[#94A3B8]">Condition: {title.conditionLabel}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2879B7]/25">
                  {owned ? (
                    <button
                      type="button"
                      disabled={busy || owned.equipped}
                      onClick={() => {
                        soundEngine.playTap();
                        onEquipTitle(title.id);
                      }}
                      className="min-h-[40px] w-full border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-xs font-bold text-[#F8FAFC] disabled:border-[#FACC15] disabled:bg-[#FACC15]/15 disabled:text-[#FACC15]"
                    >
                      {owned.equipped ? 'EQUIPPED' : 'EQUIP TITLE'}
                    </button>
                  ) : (
                    <p className="text-center text-xs text-[#64748B]">Complete condition to unlock</p>
                  )}
                </div>
              </SystemFrame>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ACHIEVEMENTS_CATALOG.map((ach) => {
            const unlocked = unlockedAchMap.get(ach.id);
            const masked = Boolean(ach.hidden && !unlocked);
            return (
              <SystemFrame
                key={ach.id}
                variant={unlocked ? 'gold' : 'default'}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-tabular text-xs text-[#67E8F9]">
                      {ach.hidden ? 'Hidden Achievement' : 'System Milestone'}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-[#F8FAFC]">
                      {masked ? '??? — Undiscovered Milestone' : ach.name}
                    </h3>
                  </div>
                  {unlocked ? (
                    <CheckCircle2 className="h-5 w-5 text-[#4ADE80]" />
                  ) : ach.hidden ? (
                    <Sparkles className="h-5 w-5 text-[#64748B]" />
                  ) : (
                    <Flame className="h-5 w-5 text-[#64748B]" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
                  {masked
                    ? 'Continue completing quests and training consistently to discover this secret achievement.'
                    : ach.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-mono-tabular text-[#FACC15]">
                    +{ach.xpReward} EXP · +{ach.goldReward} Gold
                  </span>
                  {unlocked && (
                    <span className="font-mono-tabular text-[#94A3B8]">
                      Unlocked {new Date(unlocked.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </SystemFrame>
            );
          })}
        </div>
      )}
    </div>
  );
}
