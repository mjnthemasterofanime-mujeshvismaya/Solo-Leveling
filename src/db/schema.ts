import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  username: text('username').notNull().default('Player'),
  age: integer('age').default(24),
  heightCm: integer('height_cm').default(175),
  weightKg: real('weight_kg').default(70),
  fitnessGoal: text('fitness_goal').default('Strength & Conditioning'),
  timezone: text('timezone').default('UTC'),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  qualificationAccepted: boolean('qualification_accepted').default(false).notNull(),
  activeTheme: text('active_theme').default('abyssal_blue').notNull(),
  activeAvatarFrame: text('active_avatar_frame').default('standard_frame').notNull(),
  soundEnabled: boolean('sound_enabled').default(true).notNull(),
  animationsEnabled: boolean('animations_enabled').default(true).notNull(),
  notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playerStatus = pgTable('player_status', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  level: integer('level').default(1).notNull(),
  exp: integer('exp').default(0).notNull(),
  totalExp: integer('total_exp').default(0).notNull(),
  gold: integer('gold').default(150).notNull(),
  hunterRank: text('hunter_rank').default('E-RANK').notNull(),
  job: text('job').default('Awakened Initiate').notNull(),
  availableStatPoints: integer('available_stat_points').default(0).notNull(),
  strength: integer('strength').default(10).notNull(),
  stamina: integer('stamina').default(10).notNull(),
  agility: integer('agility').default(10).notNull(),
  intelligence: integer('intelligence').default(10).notNull(),
  sense: integer('sense').default(10).notNull(),
  hp: integer('hp').default(100).notNull(),
  mp: integer('mp').default(50).notNull(),
  fatigue: integer('fatigue').default(0).notNull(),
  streak: integer('streak').default(0).notNull(),
  highestStreak: integer('highest_streak').default(0).notNull(),
  highestLevel: integer('highest_level').default(1).notNull(),
  completedQuestsCount: integer('completed_quests_count').default(0).notNull(),
  failedQuestsCount: integer('failed_quests_count').default(0).notNull(),
  totalPushups: integer('total_pushups').default(0).notNull(),
  totalSitups: integer('total_situps').default(0).notNull(),
  totalSquats: integer('total_squats').default(0).notNull(),
  totalLunges: integer('total_lunges').default(0).notNull(),
  totalPullups: integer('total_pullups').default(0).notNull(),
  totalPlankSeconds: integer('total_plank_seconds').default(0).notNull(),
  totalSupermanSeconds: integer('total_superman_seconds').default(0).notNull(),
  totalRunningKm: real('total_running_km').default(0).notNull(),
  jobChangeStage: integer('job_change_stage').default(0).notNull(),
  jobChangeCompleted: boolean('job_change_completed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const fitnessProfiles = pgTable('fitness_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  experienceLevel: text('experience_level').default('beginner').notNull(),
  equipment: jsonb('equipment').$type<string[]>().default([]).notNull(),
  exerciseCapabilities: jsonb('exercise_capabilities').$type<Record<string, number>>().default({}).notNull(),
  limitations: text('limitations').default('').notNull(),
  adaptiveDifficulty: text('adaptive_difficulty').default('classic').notNull(),
  recoveryMode: boolean('recovery_mode').default(false).notNull(),
  customTargets: jsonb('custom_targets').$type<Record<string, number>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dailyQuests = pgTable('daily_quests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  questDate: text('quest_date').notNull(),
  title: text('title').default('PREPARATION TO BECOME POWERFUL').notNull(),
  difficultyMode: text('difficulty_mode').default('classic').notNull(),
  status: text('status').default('active').notNull(), // active | completed | failed | recovery
  deadline: timestamp('deadline').notNull(),
  completionPercentage: integer('completion_percentage').default(0).notNull(),
  rewardsClaimed: boolean('rewards_claimed').default(false).notNull(),
  recoveryOverrideUsed: boolean('recovery_override_used').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const questMissions = pgTable('quest_missions', {
  id: serial('id').primaryKey(),
  questId: integer('quest_id')
    .references(() => dailyQuests.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseKey: text('exercise_key').notNull(),
  exerciseName: text('exercise_name').notNull(),
  target: real('target').notNull(),
  completedAmount: real('completed_amount').default(0).notNull(),
  unit: text('unit').notNull(),
  xpPerUnit: real('xp_per_unit').notNull(),
  instructions: text('instructions').notNull(),
  restGuidance: text('rest_guidance').notNull(),
  status: text('status').default('pending').notNull(), // pending | completed
});

export const questProgressLogs = pgTable('quest_progress_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  questId: integer('quest_id')
    .references(() => dailyQuests.id, { onDelete: 'cascade' })
    .notNull(),
  missionId: integer('mission_id')
    .references(() => questMissions.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseKey: text('exercise_key').notNull(),
  amount: real('amount').notNull(),
  xpAwarded: integer('xp_awarded').default(0).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  rewardType: text('reward_type').notNull(),
  rewardValue: text('reward_value').notNull(),
  sourceQuestId: integer('source_quest_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: text('item_id').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
});

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  achievementId: text('achievement_id').notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const titles = pgTable('titles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  titleId: text('title_id').notNull(),
  equipped: boolean('equipped').default(false).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  skillId: text('skill_id').notNull(),
  level: integer('level').default(1).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const specialQuests = pgTable('special_quests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  questKey: text('quest_key').notNull(),
  category: text('category').notNull(), // main | emergency | hidden | job_change
  title: text('title').notNull(),
  description: text('description').notNull(),
  targetMetric: text('target_metric').notNull(),
  targetValue: real('target_value').notNull(),
  progressValue: real('progress_value').default(0).notNull(),
  status: text('status').default('active').notNull(), // active | completed | claimed | expired
  deadline: timestamp('deadline'),
  rewardsClaimed: boolean('rewards_claimed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const questHistory = pgTable('quest_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  questId: integer('quest_id').notNull(),
  questDate: text('quest_date').notNull(),
  finalStatus: text('final_status').notNull(), // completed | failed | recovery
  expEarned: integer('exp_earned').default(0).notNull(),
  goldEarned: integer('gold_earned').default(0).notNull(),
  completionPercentage: integer('completion_percentage').default(0).notNull(),
  streakAtTime: integer('streak_at_time').default(0).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').default('info').notNull(), // info | warning | gold | monarch
  readStatus: boolean('read_status').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  playerStatus: one(playerStatus, {
    fields: [users.id],
    references: [playerStatus.userId],
  }),
  fitnessProfile: one(fitnessProfiles, {
    fields: [users.id],
    references: [fitnessProfiles.userId],
  }),
  dailyQuests: many(dailyQuests),
  inventory: many(inventory),
  achievements: many(achievements),
  titles: many(titles),
  skills: many(skills),
  specialQuests: many(specialQuests),
  questHistory: many(questHistory),
  notifications: many(notifications),
}));

export const dailyQuestsRelations = relations(dailyQuests, ({ one, many }) => ({
  user: one(users, {
    fields: [dailyQuests.userId],
    references: [users.id],
  }),
  missions: many(questMissions),
}));

export const questMissionsRelations = relations(questMissions, ({ one }) => ({
  quest: one(dailyQuests, {
    fields: [questMissions.questId],
    references: [dailyQuests.id],
  }),
}));
