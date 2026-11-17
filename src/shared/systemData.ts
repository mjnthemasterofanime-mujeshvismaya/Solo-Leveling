export type ExerciseKey =
  | 'pushups'
  | 'situps'
  | 'squats'
  | 'lunges'
  | 'plank'
  | 'superman'
  | 'pullups';

export type DifficultyMode = 'adaptive' | 'classic' | 'custom';
export type HunterRank = 'E-RANK' | 'D-RANK' | 'C-RANK' | 'B-RANK' | 'A-RANK' | 'S-RANK';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Monarch';

export interface ExerciseDefinition {
  key: ExerciseKey;
  name: string;
  unit: 'reps' | 'km' | 'sec';
  classicTarget: number;
  xpPerUnit: number;
  isOriginal: boolean;
  instructions: string;
  restGuidance: string;
  quickSteps: number[];
  timerSupported: boolean;
  defaultSetLabel?: string;
}

export const DAILY_EXERCISES: ExerciseDefinition[] = [
  {
    key: 'pushups',
    name: 'Push-Ups',
    unit: 'reps',
    classicTarget: 100,
    xpPerUnit: 1,
    isOriginal: true,
    instructions: 'Hands shoulder-width apart, core braced, chest lowers with control until elbows reach 90 degrees. Scale to incline or knee push-ups if needed.',
    restGuidance: 'Rest 45–90 seconds between sets. Break into manageable sets (e.g., 5–10 sets across the day).',
    quickSteps: [5, 10, 20],
    timerSupported: false,
  },
  {
    key: 'situps',
    name: 'Sit-Ups',
    unit: 'reps',
    classicTarget: 100,
    xpPerUnit: 1,
    isOriginal: true,
    instructions: 'Brace abdominals, avoid pulling on your neck, exhale smoothly as you rise. Substitute controlled crunches if lower back feels tight.',
    restGuidance: 'Rest 45–60 seconds between sets.',
    quickSteps: [10, 25, 50],
    timerSupported: false,
  },
  {
    key: 'squats',
    name: 'Squats',
    unit: 'reps',
    classicTarget: 100,
    xpPerUnit: 1,
    isOriginal: true,
    instructions: 'Feet shoulder-width apart, track knees over toes, sit hips back and keep chest upright. Stop above any joint discomfort.',
    restGuidance: 'Rest 60 seconds between sets of 15–25 repetitions.',
    quickSteps: [10, 20, 25],
    timerSupported: false,
  },
  {
    key: 'lunges',
    name: 'Lunges',
    unit: 'reps',
    classicTarget: 50,
    xpPerUnit: 1,
    isOriginal: false,
    instructions: 'Step forward with balanced posture, lower rear knee gently toward the floor, drive back up through the front heel. Count total alternating reps.',
    restGuidance: 'Rest 45–60 seconds between sets of 10–16 reps.',
    quickSteps: [10, 15, 25],
    timerSupported: false,
  },
  {
    key: 'plank',
    name: 'Plank',
    unit: 'sec',
    classicTarget: 135, // 3 x 45 seconds
    xpPerUnit: 0.1, // 1 XP per 10 seconds
    isOriginal: false,
    instructions: 'Forearms stacked under shoulders, glutes and core engaged, neutral spine from head to heels. Complete 3 sets of 45 seconds (135s total).',
    restGuidance: 'Rest 45–60 seconds between holds.',
    quickSteps: [15, 30, 45],
    timerSupported: true,
    defaultSetLabel: '3 × 45s',
  },
  {
    key: 'superman',
    name: 'Superman Hold',
    unit: 'sec',
    classicTarget: 90, // 3 x 30 seconds
    xpPerUnit: 0.1, // 1 XP per 10 seconds
    isOriginal: false,
    instructions: 'Lie prone, gently lift chest, arms, and legs off the mat to strengthen posterior chain without straining the lower back. Complete 3 sets of 30 seconds (90s total).',
    restGuidance: 'Rest 30–45 seconds between holds.',
    quickSteps: [15, 30, 45],
    timerSupported: true,
    defaultSetLabel: '3 × 30s',
  },
  {
    key: 'pullups',
    name: 'Pull-Ups',
    unit: 'reps',
    classicTarget: 25,
    xpPerUnit: 2,
    isOriginal: false,
    instructions: 'Depress shoulder blades first, pull chest toward bar with controlled descent. Assisted band pull-ups, negative reps, or inverted rows count equally.',
    restGuidance: 'Rest 90 seconds between small quality sets (3–6 reps).',
    quickSteps: [1, 5, 10],
    timerSupported: false,
  },
];

export function formatMissionTarget(exerciseKey: string, target: number, unit: string): string {
  if (exerciseKey === 'plank' && target === 135) {
    return '3 × 45s (135 sec)';
  }
  if (exerciseKey === 'superman' && target === 90) {
    return '3 × 30s (90 sec)';
  }
  return `${target} ${unit}`;
}

export function expRequiredForLevel(level: number): number {
  return getHunterRankForLevel(level).expPerLevel;
}

export function computeAdaptiveTargets(params: {
  experienceLevel: string;
  level: number;
  capabilities?: Record<string, number>;
  limitations?: string;
  recoveryMode?: boolean;
  completedQuestsCount?: number;
}): Record<ExerciseKey, number> {
  const { experienceLevel, level, capabilities = {}, limitations = '', recoveryMode = false, completedQuestsCount = 0 } = params;

  const baseScale =
    experienceLevel === 'athlete'
      ? 0.85
      : experienceLevel === 'advanced'
        ? 0.7
        : experienceLevel === 'intermediate'
          ? 0.45
          : 0.25;

  // Gradual progression capped safely; never spikes every exercise wildly
  const progressionBonus = Math.min(0.35, Math.floor(completedQuestsCount / 3) * 0.04 + Math.floor((level - 1) / 3) * 0.03);
  let factor = Math.min(1.0, baseScale + progressionBonus);

  if (recoveryMode) {
    factor = factor * 0.5;
  }

  const lowerLim = limitations.toLowerCase();
  const kneeSensitive = lowerLim.includes('knee') || lowerLim.includes('ankle') || lowerLim.includes('leg');
  const shoulderSensitive = lowerLim.includes('shoulder') || lowerLim.includes('wrist') || lowerLim.includes('elbow');
  const backSensitive = lowerLim.includes('back') || lowerLim.includes('spine');

  const result = {} as Record<ExerciseKey, number>;

  for (const ex of DAILY_EXERCISES) {
    let target = ex.classicTarget * factor;

    // Incorporate safe initial capability assessment if provided
    const cap = capabilities[ex.key];
    if (typeof cap === 'number' && cap > 0) {
      if (ex.unit === 'km') {
        target = Math.max(1, Math.min(ex.classicTarget, Number((cap * 1.1).toFixed(1))));
      } else {
        target = Math.max(ex.key === 'pullups' ? 3 : 10, Math.min(ex.classicTarget, Math.round(cap * 1.25)));
      }
      if (recoveryMode) target = target * 0.5;
    }

    if (kneeSensitive && (ex.key === 'squats' || ex.key === 'lunges')) {
      target *= 0.65;
    }
    if (shoulderSensitive && (ex.key === 'pushups' || ex.key === 'pullups' || ex.key === 'plank')) {
      target *= 0.65;
    }
    if (backSensitive && (ex.key === 'situps' || ex.key === 'superman')) {
      target *= 0.65;
    }

    if (ex.unit === 'km') {
      result[ex.key] = Math.max(0.5, Math.round(target * 2) / 2);
    } else if (ex.unit === 'sec') {
      result[ex.key] = Math.max(30, Math.round(target / 15) * 15);
    } else if (ex.key === 'pullups') {
      result[ex.key] = Math.max(3, Math.round(target));
    } else {
      result[ex.key] = Math.max(10, Math.round(target / 5) * 5);
    }
  }

  return result;
}

export interface RankTier {
  rank: HunterRank;
  title: string;
  description: string;
  minLevel: number;
  maxLevel: number | null;
  expPerLevel: number;
  dailyQuestBonusExp: number;
  color: string;
}

export const HUNTER_RANKS: RankTier[] = [
  {
    rank: 'E-RANK',
    title: 'Awakened Initiate',
    description: 'Levels 1–25 · 1,000 EXP per level · +500 EXP Daily Quest Bonus.',
    minLevel: 1,
    maxLevel: 25,
    expPerLevel: 1000,
    dailyQuestBonusExp: 500,
    color: '#94A3B8',
  },
  {
    rank: 'D-RANK',
    title: 'Gate Striker',
    description: 'Levels 26–50 · 1,500 EXP per level · +500 EXP Daily Quest Bonus.',
    minLevel: 26,
    maxLevel: 50,
    expPerLevel: 1500,
    dailyQuestBonusExp: 500,
    color: '#38BDF8',
  },
  {
    rank: 'C-RANK',
    title: 'Dungeon Vanguard',
    description: 'Levels 51–75 · 2,000 EXP per level · +750 EXP Daily Quest Bonus.',
    minLevel: 51,
    maxLevel: 75,
    expPerLevel: 2000,
    dailyQuestBonusExp: 750,
    color: '#67E8F9',
  },
  {
    rank: 'B-RANK',
    title: 'Raid Specialist',
    description: 'Levels 76–100 · 2,500 EXP per level · +750 EXP Daily Quest Bonus.',
    minLevel: 76,
    maxLevel: 100,
    expPerLevel: 2500,
    dailyQuestBonusExp: 750,
    color: '#4ADE80',
  },
  {
    rank: 'A-RANK',
    title: 'National Contender',
    description: 'Levels 101–125 · 3,000 EXP per level · +850 EXP Daily Quest Bonus.',
    minLevel: 101,
    maxLevel: 125,
    expPerLevel: 3000,
    dailyQuestBonusExp: 850,
    color: '#FACC15',
  },
  {
    rank: 'S-RANK',
    title: 'Sovereign Apex',
    description: 'Levels 126+ · 3,500 EXP per level · +1,000 EXP Daily Quest Bonus.',
    minLevel: 126,
    maxLevel: null,
    expPerLevel: 3500,
    dailyQuestBonusExp: 1000,
    color: '#A855F7',
  },
];

export function getHunterRankForLevel(level: number): RankTier {
  const safeLevel = Math.max(1, Math.floor(level));
  let current = HUNTER_RANKS[0];
  for (const tier of HUNTER_RANKS) {
    if (safeLevel >= tier.minLevel) {
      current = tier;
    }
  }
  return current;
}

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
  conditionLabel: string;
  rarity: Rarity;
}

export const TITLES_CATALOG: TitleDefinition[] = [
  {
    id: 'the_awakened',
    name: 'The Awakened',
    description: 'Accepted the System Qualification and began the path of the Player.',
    conditionLabel: 'Complete Player Registration',
    rarity: 'Common',
  },
  {
    id: 'the_persistent_one',
    name: 'The Persistent One',
    description: 'Returned day after day despite fatigue and rising quest targets.',
    conditionLabel: 'Reach a 3-Day Daily Quest Streak',
    rarity: 'Uncommon',
  },
  {
    id: 'iron_body',
    name: 'Iron Body',
    description: 'Forged foundational resilience through relentless upper-body reps.',
    conditionLabel: 'Complete 1,000 lifetime Push-Ups',
    rarity: 'Rare',
  },
  {
    id: 'elite_hunter',
    name: 'Elite Hunter',
    description: 'Recognized by the System for sustained mastery across multiple weeks.',
    conditionLabel: 'Complete 15 Daily Quests',
    rarity: 'Epic',
  },
  {
    id: 'shadow_hunter',
    name: 'Shadow Hunter',
    description: 'Ascended beyond ordinary limits in the System trials.',
    conditionLabel: 'Reach Hunter C-Rank or higher',
    rarity: 'Epic',
  },
  {
    id: 'the_unbreakable',
    name: 'The Unbreakable',
    description: 'Refused to falter over a full month of disciplined training.',
    conditionLabel: 'Complete 30 Daily Quests',
    rarity: 'Legendary',
  },
  {
    id: 'shadow_monarch',
    name: 'Shadow Monarch',
    description: 'Cleared the Job Change Quest and claimed sovereignty over the System.',
    conditionLabel: 'Complete the Job Change Evolution',
    rarity: 'Monarch',
  },
  {
    id: 'legendary_player',
    name: 'Legendary Player',
    description: 'Rare title obtainable from high-tier System Loot Boxes or the System Shop.',
    conditionLabel: 'System Shop or Mystery Loot Drop',
    rarity: 'Legendary',
  },
];

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  goldReward: number;
  hidden?: boolean;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_awakening',
    name: 'Double Awakening',
    description: 'Accepted the Player Qualification and initialized your System Status.',
    xpReward: 50,
    goldReward: 100,
  },
  {
    id: 'first_daily_clear',
    name: 'First Preparation',
    description: 'Completed your very first Daily Quest before the 24-hour deadline.',
    xpReward: 75,
    goldReward: 150,
  },
  {
    id: 'streak_7',
    name: 'Seven-Day Discipline',
    description: 'Hidden Milestone: Completed 7 Daily Quests.',
    xpReward: 200,
    goldReward: 350,
    hidden: true,
  },
  {
    id: 'pushups_1000',
    name: 'Thousandfold Strike',
    description: 'Hidden Milestone: Reached 1,000 lifetime Push-Ups.',
    xpReward: 300,
    goldReward: 500,
    hidden: true,
  },
  {
    id: 'quests_30',
    name: 'Relentless Sovereign',
    description: 'Hidden Milestone: Completed 30 Daily Quests.',
    xpReward: 500,
    goldReward: 1000,
    hidden: true,
  },
  {
    id: 'recovery_wisdom',
    name: 'Measured Recovery',
    description: 'Hidden Milestone: Used Recovery Mode responsibly to protect long-term training.',
    xpReward: 50,
    goldReward: 100,
    hidden: true,
  },
  {
    id: 'job_change_monarch',
    name: 'Arise: Shadow Monarch',
    description: 'Completed the Job Change Quest and evolved your Player Class.',
    xpReward: 600,
    goldReward: 1200,
  },
];

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Passive' | 'Active' | 'Monarch';
  unlockLevel: number;
  unlockRank?: HunterRank;
  upgradeGoldBase: number;
  maxLevel: number;
  effectNote: string;
}

export const SKILLS_CATALOG: SkillDefinition[] = [
  {
    id: 'sprint',
    name: 'Sprint',
    description: 'Channel focused breathing to sustain explosive tempo during high-rep sets.',
    category: 'Active',
    unlockLevel: 1,
    upgradeGoldBase: 120,
    maxLevel: 5,
    effectNote: 'Visual System Skill · Explosive conditioning tempo',
  },
  {
    id: 'vitality_surge',
    name: 'Vitality Surge',
    description: 'Disciplined recovery cadence that restores stamina between daily sessions.',
    category: 'Passive',
    unlockLevel: 2,
    upgradeGoldBase: 160,
    maxLevel: 5,
    effectNote: 'Visual System Skill · Recovery focus',
  },
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Quiet control over breath, posture, and core stability during isometric holds.',
    category: 'Active',
    unlockLevel: 3,
    upgradeGoldBase: 200,
    maxLevel: 5,
    effectNote: 'Visual System Skill · Plank & core control',
  },
  {
    id: 'dagger_mastery',
    name: 'Dagger Mastery',
    description: 'Precision repetition form and rapid upper-body lockouts.',
    category: 'Passive',
    unlockLevel: 4,
    upgradeGoldBase: 250,
    maxLevel: 5,
    effectNote: 'Visual System Skill · Push-Up & Pull-Up precision',
  },
  {
    id: 'bloodlust',
    name: 'Willpower Pressure',
    description: 'Mental composure under high-rep fatigue in the final stretch of a quest.',
    category: 'Active',
    unlockLevel: 5,
    upgradeGoldBase: 320,
    maxLevel: 5,
    effectNote: 'Visual System Skill · Final-set focus',
  },
  {
    id: 'rulers_authority',
    name: "Ruler's Authority",
    description: 'Command full-body tension and explosive drive through heavy compound reps.',
    category: 'Monarch',
    unlockLevel: 7,
    upgradeGoldBase: 450,
    maxLevel: 5,
    effectNote: 'Visual System Skill · High-tier Player authority',
  },
  {
    id: 'shadow_extraction',
    name: 'Shadow Extraction',
    description: 'Signature Monarch art unlocked upon clearing the Job Change Quest.',
    category: 'Monarch',
    unlockLevel: 5,
    upgradeGoldBase: 600,
    maxLevel: 5,
    effectNote: 'Unlocks upon Job Change Evolution',
  },
];

export interface ItemDefinition {
  id: string;
  name: string;
  category: 'Loot Box' | 'Consumable' | 'Equipment' | 'Collectible' | 'Cosmetic' | 'Theme';
  rarity: Rarity;
  description: string;
  priceGold: number; // 0 if not directly sold in shop
  themeKey?: string;
  frameKey?: string;
  titleGrantId?: string;
}

export const ITEMS_CATALOG: ItemDefinition[] = [
  {
    id: 'random_loot_box',
    name: 'System Supply Box',
    category: 'Loot Box',
    rarity: 'Rare',
    description: 'A glowing holographic chest issued by the System. Open from Inventory to reveal Gold, Collectibles, Cosmetics, or rare Titles.',
    priceGold: 220,
  },
  {
    id: 'status_recovery_elixir',
    name: 'Status Recovery Elixir',
    category: 'Consumable',
    rarity: 'Uncommon',
    description: 'Digital collectible vial representing post-training hydration, stretching, and restorative rest.',
    priceGold: 80,
  },
  {
    id: 'kasakas_venom_fang_collectible',
    name: "Kasaka's Fang Replica",
    category: 'Collectible',
    rarity: 'Rare',
    description: 'Digital trophy relic inspired by early dungeon clears. Purely decorative collectible.',
    priceGold: 300,
  },
  {
    id: 'knight_killer_crest',
    name: 'Knight Killer Insignia',
    category: 'Equipment',
    rarity: 'Epic',
    description: 'Digital weapon insignia displayed in your Player Inventory.',
    priceGold: 480,
  },
  {
    id: 'demon_kings_crown_relic',
    name: "Baran's Lightning Relic",
    category: 'Collectible',
    rarity: 'Legendary',
    description: 'High-tier digital artifact signifying immense endurance milestones.',
    priceGold: 950,
  },
  {
    id: 'theme_monarch_violet',
    name: 'Theme: Monarch Violet',
    category: 'Theme',
    rarity: 'Monarch',
    description: 'Shifts the holographic System frame accents into deep Shadow Monarch violet.',
    priceGold: 600,
    themeKey: 'monarch_violet',
  },
  {
    id: 'theme_crimson_gate',
    name: 'Theme: Red Gate',
    category: 'Theme',
    rarity: 'Epic',
    description: 'Applies intense crimson dungeon-gate illumination to System borders.',
    priceGold: 450,
    themeKey: 'crimson_gate',
  },
  {
    id: 'theme_sovereign_gold',
    name: 'Theme: Sovereign Gold',
    category: 'Theme',
    rarity: 'Legendary',
    description: 'Refines System telemetry and corners with radiant S-Rank gold.',
    priceGold: 750,
    themeKey: 'sovereign_gold',
  },
  {
    id: 'cosmetic_monarch_frame',
    name: 'Avatar Frame: Shadow Halo',
    category: 'Cosmetic',
    rarity: 'Epic',
    description: 'Equips an illuminated holographic border around your Hunter portrait.',
    priceGold: 350,
    frameKey: 'shadow_halo',
  },
  {
    id: 'title_scroll_legendary',
    name: 'Title Scroll: Legendary Player',
    category: 'Cosmetic',
    rarity: 'Legendary',
    description: 'Unlocks the prestigious [Legendary Player] display title.',
    priceGold: 1100,
    titleGrantId: 'legendary_player',
  },
];

export const LOOT_BOX_DROP_POOL: Array<{
  type: 'gold' | 'item' | 'title';
  id?: string;
  goldAmount?: number;
  label: string;
  rarity: Rarity;
  weight: number;
}> = [
  { type: 'gold', goldAmount: 120, label: '120 Gold Pouch', rarity: 'Common', weight: 30 },
  { type: 'gold', goldAmount: 250, label: '250 Gold Cache', rarity: 'Uncommon', weight: 20 },
  { type: 'item', id: 'status_recovery_elixir', label: 'Status Recovery Elixir', rarity: 'Uncommon', weight: 20 },
  { type: 'item', id: 'kasakas_venom_fang_collectible', label: "Kasaka's Fang Replica", rarity: 'Rare', weight: 12 },
  { type: 'item', id: 'cosmetic_monarch_frame', label: 'Avatar Frame: Shadow Halo', rarity: 'Epic', weight: 8 },
  { type: 'item', id: 'theme_monarch_violet', label: 'Theme: Monarch Violet', rarity: 'Monarch', weight: 5 },
  { type: 'item', id: 'knight_killer_crest', label: 'Knight Killer Insignia', rarity: 'Epic', weight: 3 },
  { type: 'title', id: 'legendary_player', label: 'Title: Legendary Player', rarity: 'Legendary', weight: 2 },
];

export function rollLootBox(): (typeof LOOT_BOX_DROP_POOL)[number] {
  const totalWeight = LOOT_BOX_DROP_POOL.reduce((acc, item) => acc + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const drop of LOOT_BOX_DROP_POOL) {
    r -= drop.weight;
    if (r <= 0) return drop;
  }
  return LOOT_BOX_DROP_POOL[0];
}

export interface MainQuestTemplate {
  key: string;
  title: string;
  description: string;
  targetMetric:
    | 'totalPushups'
    | 'totalSquats'
    | 'totalPlankSeconds'
    | 'totalPullups'
    | 'completedQuestsCount';
  targetValue: number;
  xpReward: number;
  goldReward: number;
}

export const MAIN_QUEST_TEMPLATES: MainQuestTemplate[] = [
  {
    key: 'main_1000_pushups',
    title: 'ACHIEVE YOUR FIRST 1,000 PUSH-UPS',
    description: 'Build upper-body resilience through consistent daily sets until 1,000 lifetime push-ups are recorded.',
    targetMetric: 'totalPushups',
    targetValue: 1000,
    xpReward: 400,
    goldReward: 500,
  },
  {
    key: 'main_1000_squats',
    title: 'PILLAR OF STRENGTH: 1,000 SQUATS',
    description: 'Forge unshakeable lower-body stability by completing 1,000 lifetime squats.',
    targetMetric: 'totalSquats',
    targetValue: 1000,
    xpReward: 400,
    goldReward: 500,
  },
  {
    key: 'main_250_pullups',
    title: 'ASCENSION GRIP: 250 PULL-UPS',
    description: 'Complete 250 lifetime pull-ups or assisted rows to elevate your pulling strength.',
    targetMetric: 'totalPullups',
    targetValue: 250,
    xpReward: 500,
    goldReward: 650,
  },
];

export const EMERGENCY_QUEST_TEMPLATES = [
  {
    key: 'emergency_gate_surge',
    title: 'URGENT: SUDDEN GATE SURGE',
    description: 'Optional 2-hour sprint challenge: log 30 squats and 15 push-ups (via Daily Quest or direct trial) for bonus rewards.',
    targetMetric: 'sessionReps',
    targetValue: 45,
    xpReward: 150,
    goldReward: 200,
  },
  {
    key: 'emergency_core_lock',
    title: 'URGENT: MANA STABILIZATION',
    description: 'Optional 2-hour core stability check: complete 90 seconds of Plank holds.',
    targetMetric: 'sessionPlank',
    targetValue: 90,
    xpReward: 120,
    goldReward: 180,
  },
];

export const SYSTEM_THEMES: Record<
  string,
  {
    name: string;
    primary: string;
    glow: string;
    border: string;
    accentBg: string;
  }
> = {
  abyssal_blue: {
    name: 'Abyssal System Blue',
    primary: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.28)',
    border: '#2879B7',
    accentBg: 'rgba(56, 189, 248, 0.12)',
  },
  monarch_violet: {
    name: 'Shadow Monarch Violet',
    primary: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.3)',
    border: '#7E22CE',
    accentBg: 'rgba(168, 85, 247, 0.14)',
  },
  crimson_gate: {
    name: 'Red Gate Crimson',
    primary: '#F87171',
    glow: 'rgba(239, 68, 68, 0.28)',
    border: '#DC2626',
    accentBg: 'rgba(239, 68, 68, 0.14)',
  },
  sovereign_gold: {
    name: 'Sovereign S-Rank Gold',
    primary: '#FACC15',
    glow: 'rgba(250, 204, 21, 0.28)',
    border: '#CA8A04',
    accentBg: 'rgba(250, 204, 21, 0.14)',
  },
};
