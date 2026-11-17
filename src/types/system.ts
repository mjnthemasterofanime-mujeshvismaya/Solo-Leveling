import { DifficultyMode, HunterRank } from '../shared/systemData';

export interface PlayerProfile {
  id: number;
  userId: number;
  username: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  fitnessGoal: string | null;
  timezone: string | null;
  onboardingCompleted: boolean;
  qualificationAccepted: boolean;
  activeTheme: string;
  activeAvatarFrame: string;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface PlayerStatus {
  id: number;
  userId: number;
  level: number;
  exp: number;
  totalExp: number;
  nextLevelExp: number;
  gold: number;
  hunterRank: HunterRank;
  job: string;
  availableStatPoints: number;
  strength: number;
  stamina: number;
  agility: number;
  intelligence: number;
  sense: number;
  hp: number;
  mp: number;
  fatigue: number;
  streak: number;
  highestStreak: number;
  highestLevel: number;
  completedQuestsCount: number;
  failedQuestsCount: number;
  totalPushups: number;
  totalSitups: number;
  totalSquats: number;
  totalLunges: number;
  totalPullups: number;
  totalPlankSeconds: number;
  totalSupermanSeconds: number;
  totalRunningKm: number;
  jobChangeStage: number;
  jobChangeCompleted: boolean;
}

export interface FitnessProfile {
  id: number;
  userId: number;
  experienceLevel: string;
  equipment: string[];
  exerciseCapabilities: Record<string, number>;
  limitations: string;
  adaptiveDifficulty: DifficultyMode;
  recoveryMode: boolean;
  customTargets: Record<string, number>;
}

export interface QuestMission {
  id: number;
  questId: number;
  exerciseKey: string;
  exerciseName: string;
  target: number;
  completedAmount: number;
  unit: 'reps' | 'km' | 'sec';
  xpPerUnit: number;
  instructions: string;
  restGuidance: string;
  status: 'pending' | 'completed';
}

export interface DailyQuest {
  id: number;
  userId: number;
  questDate: string;
  title: string;
  difficultyMode: DifficultyMode;
  status: 'active' | 'completed' | 'failed' | 'recovery';
  deadline: string;
  completionPercentage: number;
  rewardsClaimed: boolean;
  recoveryOverrideUsed: boolean;
  completedAt: string | null;
  missions: QuestMission[];
}

export interface InventoryEntry {
  id: number;
  userId: number;
  itemId: string;
  quantity: number;
  acquiredAt: string;
}

export interface AchievementEntry {
  id: number;
  userId: number;
  achievementId: string;
  unlockedAt: string;
}

export interface TitleEntry {
  id: number;
  userId: number;
  titleId: string;
  equipped: boolean;
  unlockedAt: string;
}

export interface SkillEntry {
  id: number;
  userId: number;
  skillId: string;
  level: number;
  unlockedAt: string;
}

export interface SpecialQuestEntry {
  id: number;
  userId: number;
  questKey: string;
  category: 'main' | 'emergency' | 'hidden' | 'job_change';
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  progressValue: number;
  status: 'active' | 'completed' | 'claimed' | 'expired';
  deadline: string | null;
  rewardsClaimed: boolean;
  completedAt: string | null;
}

export interface QuestHistoryEntry {
  id: number;
  userId: number;
  questId: number;
  questDate: string;
  finalStatus: string;
  expEarned: number;
  goldEarned: number;
  completionPercentage: number;
  streakAtTime: number;
  recordedAt: string;
}

export interface SystemNotification {
  id: number;
  userId: number;
  notificationType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'gold' | 'monarch';
  readStatus: boolean;
  createdAt: string;
}

export interface FullPlayerState {
  profile: PlayerProfile;
  status: PlayerStatus;
  fitnessProfile: FitnessProfile;
  dailyQuest: DailyQuest | null;
  recentFailedQuest: DailyQuest | null;
  inventory: InventoryEntry[];
  achievements: AchievementEntry[];
  titles: TitleEntry[];
  skills: SkillEntry[];
  specialQuests: SpecialQuestEntry[];
  questHistory: QuestHistoryEntry[];
  notifications: SystemNotification[];
  rewards: Array<{
    id: number;
    rewardType: string;
    rewardValue: string;
    createdAt: string;
  }>;
}

export type NavSection =
  | 'dashboard'
  | 'daily-quest'
  | 'status'
  | 'special-quests'
  | 'inventory'
  | 'shop'
  | 'skills'
  | 'titles'
  | 'history'
  | 'settings';
