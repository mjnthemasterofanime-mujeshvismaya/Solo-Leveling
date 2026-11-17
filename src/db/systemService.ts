import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  achievements,
  dailyQuests,
  fitnessProfiles,
  inventory,
  notifications,
  playerStatus,
  profiles,
  questHistory,
  questMissions,
  questProgressLogs,
  rewards,
  skills,
  specialQuests,
  titles,
} from './schema.ts';
import {
  ACHIEVEMENTS_CATALOG,
  computeAdaptiveTargets,
  DAILY_EXERCISES,
  DifficultyMode,
  EMERGENCY_QUEST_TEMPLATES,
  ExerciseKey,
  expRequiredForLevel,
  getHunterRankForLevel,
  ITEMS_CATALOG,
  MAIN_QUEST_TEMPLATES,
  rollLootBox,
  SKILLS_CATALOG,
} from '../shared/systemData.ts';

function formatQuestDateForTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function addNotification(
  userId: number,
  notificationType: string,
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'gold' | 'monarch' = 'info'
) {
  await db.insert(notifications).values({
    userId,
    notificationType,
    title,
    message,
    severity,
  });
}

async function applyExpAndLevelUps(userId: number, gainedExp: number) {
  const status = await db.query.playerStatus.findFirst({
    where: eq(playerStatus.userId, userId),
  });
  if (!status || gainedExp <= 0) return { leveledUp: false, newLevel: status?.level || 1 };

  let level = status.level;
  let exp = status.exp + gainedExp;
  const totalExp = status.totalExp + gainedExp;
  let availableStatPoints = status.availableStatPoints;
  let strength = status.strength;
  let stamina = status.stamina;
  let agility = status.agility;
  let intelligence = status.intelligence;
  let sense = status.sense;
  let hp = status.hp;
  let mp = status.mp;
  let leveledUp = false;

  while (exp >= expRequiredForLevel(level)) {
    exp -= expRequiredForLevel(level);
    level += 1;
    leveledUp = true;
    strength += 1;
    stamina += 1;
    agility += 1;
    intelligence += 1;
    sense += 1;
    availableStatPoints += 3;
    hp += 25;
    mp += 15;
  }

  const highestLevel = Math.max(status.highestLevel, level);
  const newRankTier = getHunterRankForLevel(level);
  const rankChanged = newRankTier.rank !== status.hunterRank;

  await db
    .update(playerStatus)
    .set({
      level,
      exp,
      totalExp,
      hunterRank: newRankTier.rank,
      availableStatPoints,
      strength,
      stamina,
      agility,
      intelligence,
      sense,
      hp,
      mp,
      highestLevel,
      updatedAt: new Date(),
    })
    .where(eq(playerStatus.userId, userId));

  if (leveledUp) {
    await addNotification(
      userId,
      'LEVEL_UP',
      'LEVEL UP!',
      `You have reached Level ${level}. Base attributes increased (+1 each) and +3 Stat Points granted.`,
      'gold'
    );
  }

  if (rankChanged) {
    await addNotification(
      userId,
      'RANK_UP',
      `HUNTER RANK PROMOTION: ${newRankTier.rank}`,
      `You have ascended to ${newRankTier.rank} (${newRankTier.title}) at Level ${level}.`,
      'gold'
    );

    if (['C-RANK', 'B-RANK', 'A-RANK', 'S-RANK'].includes(newRankTier.rank)) {
      await grantTitleIfMissing(userId, 'shadow_hunter');
    }
  }

  return { leveledUp, newLevel: level };
}

async function grantTitleIfMissing(userId: number, titleId: string) {
  const existing = await db
    .select()
    .from(titles)
    .where(and(eq(titles.userId, userId), eq(titles.titleId, titleId)));
  if (existing.length === 0) {
    await db.insert(titles).values({
      userId,
      titleId,
      equipped: false,
    });
    await addNotification(
      userId,
      'NEW_TITLE_ACQUIRED',
      'NEW TITLE ACQUIRED',
      `Title unlocked: [${titleId.replace(/_/g, ' ').toUpperCase()}].`,
      'gold'
    );
    return true;
  }
  return false;
}

async function grantAchievementIfMissing(userId: number, achievementId: string) {
  const existing = await db
    .select()
    .from(achievements)
    .where(and(eq(achievements.userId, userId), eq(achievements.achievementId, achievementId)));
  if (existing.length === 0) {
    const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === achievementId);
    await db.insert(achievements).values({
      userId,
      achievementId,
    });
    if (def) {
      const status = await db.query.playerStatus.findFirst({
        where: eq(playerStatus.userId, userId),
      });
      if (status) {
        await db
          .update(playerStatus)
          .set({ gold: status.gold + def.goldReward, updatedAt: new Date() })
          .where(eq(playerStatus.userId, userId));
      }
      await applyExpAndLevelUps(userId, def.xpReward);
      await addNotification(
        userId,
        def.hidden ? 'HIDDEN_QUEST_DISCOVERED' : 'REWARD_RECEIVED',
        def.hidden ? 'HIDDEN QUEST DISCOVERED' : 'ACHIEVEMENT UNLOCKED',
        `${def.name}: ${def.description} (+${def.xpReward} EXP, +${def.goldReward} Gold)`,
        def.hidden ? 'monarch' : 'gold'
      );
    }
    return true;
  }
  return false;
}

async function addItemToInventory(userId: number, itemId: string, qty = 1) {
  const existing = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
  if (existing.length > 0) {
    await db
      .update(inventory)
      .set({ quantity: existing[0].quantity + qty })
      .where(eq(inventory.id, existing[0].id));
  } else {
    await db.insert(inventory).values({
      userId,
      itemId,
      quantity: qty,
    });
  }
}

async function syncHunterRankAndMilestones(userId: number) {
  const status = await db.query.playerStatus.findFirst({
    where: eq(playerStatus.userId, userId),
  });
  if (!status) return;

  // Check hidden & milestone achievements
  if (status.completedQuestsCount >= 1) {
    await grantAchievementIfMissing(userId, 'first_daily_clear');
  }
  if (status.streak >= 3) {
    await grantTitleIfMissing(userId, 'the_persistent_one');
  }
  if (status.completedQuestsCount >= 7) {
    await grantAchievementIfMissing(userId, 'streak_7');
  }
  if (status.totalPushups >= 1000) {
    await grantAchievementIfMissing(userId, 'pushups_1000');
    await grantTitleIfMissing(userId, 'iron_body');
  }
  if (status.completedQuestsCount >= 15) {
    await grantTitleIfMissing(userId, 'elite_hunter');
  }
  if (status.completedQuestsCount >= 30) {
    await grantAchievementIfMissing(userId, 'quests_30');
    await grantTitleIfMissing(userId, 'the_unbreakable');
  }

  // Re-fetch status after milestone achievements
  const updatedStatus = await db.query.playerStatus.findFirst({
    where: eq(playerStatus.userId, userId),
  });

  if (!updatedStatus) return;

  const newRankTier = getHunterRankForLevel(updatedStatus.level);
  if (newRankTier.rank !== updatedStatus.hunterRank) {
    await db
      .update(playerStatus)
      .set({ hunterRank: newRankTier.rank, updatedAt: new Date() })
      .where(eq(playerStatus.userId, userId));

    await addNotification(
      userId,
      'RANK_UP',
      `HUNTER RANK PROMOTION: ${newRankTier.rank}`,
      `You have ascended to ${newRankTier.rank} (${newRankTier.title}).`,
      'gold'
    );

    if (['C-RANK', 'B-RANK', 'A-RANK', 'S-RANK'].includes(newRankTier.rank)) {
      await grantTitleIfMissing(userId, 'shadow_hunter');
    }
  }

  // Sync Main Quest progress
  const userSpecials = await db
    .select()
    .from(specialQuests)
    .where(and(eq(specialQuests.userId, userId), eq(specialQuests.category, 'main')));

  for (const sq of userSpecials) {
    if (sq.status === 'claimed') continue;
    let currentProgress = sq.progressValue;
    if (sq.targetMetric === 'totalPushups') currentProgress = updatedStatus.totalPushups;
    else if (sq.targetMetric === 'totalSquats') currentProgress = updatedStatus.totalSquats;
    else if (sq.targetMetric === 'totalPullups') currentProgress = updatedStatus.totalPullups;

    const completed = currentProgress >= sq.targetValue;
    await db
      .update(specialQuests)
      .set({
        progressValue: currentProgress,
        status: completed ? 'completed' : 'active',
        completedAt: completed && !sq.completedAt ? new Date() : sq.completedAt,
      })
      .where(eq(specialQuests.id, sq.id));
  }

  // Check if Job Change Quest just became available
  if (updatedStatus.level >= 5 && !updatedStatus.jobChangeCompleted && updatedStatus.jobChangeStage === 0) {
    const existingNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.notificationType, 'JOB_CHANGE_AVAILABLE')));
    if (existingNotifs.length === 0) {
      await addNotification(
        userId,
        'JOB_CHANGE_AVAILABLE',
        'JOB CHANGE QUEST AVAILABLE',
        'You have met the threshold for Class Ascension. Open Special Quests to face the Job Change Trial.',
        'monarch'
      );
    }
  }
}

export async function ensureDailyQuest(userId: number) {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
  const fitness = await db.query.fitnessProfiles.findFirst({ where: eq(fitnessProfiles.userId, userId) });

  if (!profile || !status || !fitness || !profile.onboardingCompleted) {
    return null;
  }

  const todayKey = formatQuestDateForTimezone(profile.timezone || 'UTC');
  const existingQuests = await db
    .select()
    .from(dailyQuests)
    .where(eq(dailyQuests.userId, userId))
    .orderBy(desc(dailyQuests.createdAt))
    .limit(5);

  const now = new Date();

  // Check if latest active quest has expired
  const latest = existingQuests[0];
  if (latest && latest.status === 'active' && new Date(latest.deadline).getTime() < now.getTime()) {
    // Expired without completion -> Penalty Event unless recovery mode
    const finalStatus = latest.recoveryOverrideUsed || fitness.recoveryMode ? 'recovery' : 'failed';
    await db
      .update(dailyQuests)
      .set({ status: finalStatus })
      .where(eq(dailyQuests.id, latest.id));

    await db.insert(questHistory).values({
      userId,
      questId: latest.id,
      questDate: latest.questDate,
      finalStatus,
      expEarned: 0,
      goldEarned: 0,
      completionPercentage: latest.completionPercentage,
      streakAtTime: status.streak,
    });

    if (finalStatus === 'failed') {
      await db
        .update(playerStatus)
        .set({
          streak: 0,
          failedQuestsCount: status.failedQuestsCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(playerStatus.userId, userId));

      await addNotification(
        userId,
        'PENALTY_QUEST',
        'WARNING! DAILY QUEST FAILED',
        'PENALTY QUEST ACTIVATED: Penalty Zone event triggered for missed Daily Quest objectives.',
        'warning'
      );
    }
  }

  // Re-check if a quest exists for todayKey
  const todayQuest = existingQuests.find((q) => q.questDate === todayKey);
  if (todayQuest) {
    return todayQuest;
  }

  // Create today's new Daily Quest
  const mode = (fitness.adaptiveDifficulty || 'classic') as DifficultyMode;
  const adaptiveTargets = computeAdaptiveTargets({
    experienceLevel: fitness.experienceLevel,
    level: status.level,
    capabilities: fitness.exerciseCapabilities,
    limitations: fitness.limitations,
    recoveryMode: fitness.recoveryMode,
    completedQuestsCount: status.completedQuestsCount,
  });

  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [newQuest] = await db
    .insert(dailyQuests)
    .values({
      userId,
      questDate: todayKey,
      title: 'PREPARATION TO BECOME POWERFUL',
      difficultyMode: mode,
      status: 'active',
      deadline,
      completionPercentage: 0,
      recoveryOverrideUsed: fitness.recoveryMode,
    })
    .returning();

  for (const ex of DAILY_EXERCISES) {
    let target = adaptiveTargets[ex.key];
    if (mode === 'classic') {
      target = ex.classicTarget;
    } else if (mode === 'custom' && fitness.customTargets && typeof fitness.customTargets[ex.key] === 'number') {
      target = Math.max(1, fitness.customTargets[ex.key]);
    }

    await db.insert(questMissions).values({
      questId: newQuest.id,
      exerciseKey: ex.key,
      exerciseName: ex.name,
      target,
      completedAmount: 0,
      unit: ex.unit,
      xpPerUnit: ex.xpPerUnit,
      instructions: ex.instructions,
      restGuidance: ex.restGuidance,
      status: 'pending',
    });
  }

  await addNotification(
    userId,
    'DAILY_QUEST_ARRIVAL',
    'DAILY QUEST ARRIVED',
    '[Daily Quest: Strength Training has arrived.] Complete all 7 missions before the 24-hour deadline.',
    'info'
  );

  return newQuest;
}

export async function getFullPlayerState(userId: number) {
  try {
    await ensureDailyQuest(userId);

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    const fitness = await db.query.fitnessProfiles.findFirst({ where: eq(fitnessProfiles.userId, userId) });

    const quests = await db
      .select()
      .from(dailyQuests)
      .where(eq(dailyQuests.userId, userId))
      .orderBy(desc(dailyQuests.createdAt))
      .limit(2);

    const activeQuest = quests[0] || null;
    if (activeQuest) {
      // Remove any legacy running mission from active Daily Quests and recalculate completion
      const removed = await db
        .delete(questMissions)
        .where(and(eq(questMissions.questId, activeQuest.id), eq(questMissions.exerciseKey, 'running')))
        .returning();
      if (removed.length > 0) {
        const remainingMissions = await db
          .select()
          .from(questMissions)
          .where(eq(questMissions.questId, activeQuest.id));
        const pct =
          remainingMissions.length > 0
            ? Math.round(
                (remainingMissions.reduce(
                  (sum, m) => sum + Math.min(1, m.completedAmount / Math.max(0.01, m.target)),
                  0
                ) /
                  remainingMissions.length) *
                  100
              )
            : 0;
        const done = remainingMissions.length > 0 && remainingMissions.every((m) => m.completedAmount >= m.target);
        await db
          .update(dailyQuests)
          .set({
            completionPercentage: pct,
            status: done ? 'completed' : activeQuest.status === 'failed' ? 'failed' : 'active',
          })
          .where(eq(dailyQuests.id, activeQuest.id));
        activeQuest.completionPercentage = pct;
        if (done) activeQuest.status = 'completed';
      }
    }

    const missions = activeQuest
      ? await db
          .select()
          .from(questMissions)
          .where(eq(questMissions.questId, activeQuest.id))
          .orderBy(questMissions.id)
      : [];

    // Remove legacy 50km running main quest if present
    await db
      .delete(specialQuests)
      .where(and(eq(specialQuests.userId, userId), eq(specialQuests.questKey, 'main_50km_running')));

    const userInventory = await db.select().from(inventory).where(eq(inventory.userId, userId));
    const userAchievements = await db.select().from(achievements).where(eq(achievements.userId, userId));
    const userTitles = await db.select().from(titles).where(eq(titles.userId, userId));
    const userSkills = await db.select().from(skills).where(eq(skills.userId, userId));
    const userSpecialQuests = await db
      .select()
      .from(specialQuests)
      .where(eq(specialQuests.userId, userId))
      .orderBy(specialQuests.id);
    const userHistory = await db
      .select()
      .from(questHistory)
      .where(eq(questHistory.userId, userId))
      .orderBy(desc(questHistory.recordedAt))
      .limit(40);
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
    const userRewards = await db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId))
      .orderBy(desc(rewards.createdAt))
      .limit(25);

    let syncedRank = status?.hunterRank || 'E-RANK';
    if (status) {
      const expectedRank = getHunterRankForLevel(status.level).rank;
      if (status.hunterRank !== expectedRank) {
        syncedRank = expectedRank;
        await db
          .update(playerStatus)
          .set({ hunterRank: expectedRank, updatedAt: new Date() })
          .where(eq(playerStatus.userId, userId));
      }
    }

    return {
      profile,
      status: status
        ? {
            ...status,
            hunterRank: syncedRank,
            nextLevelExp: expRequiredForLevel(status.level),
          }
        : null,
      fitnessProfile: fitness,
      dailyQuest: activeQuest ? { ...activeQuest, missions } : null,
      recentFailedQuest: quests.find((q) => q.status === 'failed') || null,
      inventory: userInventory,
      achievements: userAchievements,
      titles: userTitles,
      skills: userSkills,
      specialQuests: userSpecialQuests,
      questHistory: userHistory,
      notifications: userNotifications,
      rewards: userRewards,
    };
  } catch (error) {
    console.error('getFullPlayerState failed:', error);
    throw new Error('Failed to load System state.', { cause: error });
  }
}

export async function completeOnboarding(
  userId: number,
  input: {
    username: string;
    age: number;
    heightCm: number;
    weightKg: number;
    fitnessGoal: string;
    timezone: string;
    experienceLevel: string;
    equipment: string[];
    exerciseCapabilities: Record<string, number>;
    limitations: string;
  }
) {
  try {
    await db
      .update(profiles)
      .set({
        username: input.username.trim().slice(0, 40) || 'Player',
        age: Math.max(13, Math.min(100, Number(input.age) || 24)),
        heightCm: Math.max(100, Math.min(240, Number(input.heightCm) || 175)),
        weightKg: Math.max(30, Math.min(300, Number(input.weightKg) || 70)),
        fitnessGoal: input.fitnessGoal || 'Strength & Conditioning',
        timezone: input.timezone || 'UTC',
        qualificationAccepted: true,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    await db
      .update(fitnessProfiles)
      .set({
        experienceLevel: input.experienceLevel || 'beginner',
        equipment: input.equipment || [],
        exerciseCapabilities: input.exerciseCapabilities || {},
        limitations: input.limitations || '',
        adaptiveDifficulty: 'classic',
        updatedAt: new Date(),
      })
      .where(eq(fitnessProfiles.userId, userId));

    const existingTodayQuest = await db
      .select()
      .from(dailyQuests)
      .where(eq(dailyQuests.userId, userId))
      .orderBy(desc(dailyQuests.createdAt))
      .limit(1);

    if (existingTodayQuest[0]) {
      await switchDifficultyMode(userId, existingTodayQuest[0].id, 'classic');
    }

    await grantAchievementIfMissing(userId, 'first_awakening');
    await grantTitleIfMissing(userId, 'the_awakened');
    await addNotification(
      userId,
      'PLAYER_REGISTRATION',
      'PLAYER REGISTRATION COMPLETE',
      'Status Window unlocked. Your Daily Quest targets are active.',
      'info'
    );

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('completeOnboarding failed:', error);
    throw new Error('Failed to complete player registration.', { cause: error });
  }
}

export async function logMissionProgress(
  userId: number,
  questId: number,
  missionId: number,
  amount: number
) {
  try {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
      throw new Error('Invalid progress increment.');
    }

    const quest = await db.query.dailyQuests.findFirst({
      where: and(eq(dailyQuests.id, questId), eq(dailyQuests.userId, userId)),
    });
    if (!quest) throw new Error('Quest not found.');

    const mission = await db.query.questMissions.findFirst({
      where: and(eq(questMissions.id, missionId), eq(questMissions.questId, questId)),
    });
    if (!mission) throw new Error('Mission not found.');

    const previousCompleted = mission.completedAmount;
    const newCompleted = Number((previousCompleted + amount).toFixed(2));
    const newlyCompletedForXp = Math.max(0, Math.min(mission.target, newCompleted) - Math.min(mission.target, previousCompleted));
    const xpAwarded = Math.round(newlyCompletedForXp * mission.xpPerUnit);

    const newStatus = newCompleted >= mission.target ? 'completed' : 'pending';

    await db
      .update(questMissions)
      .set({
        completedAmount: newCompleted,
        status: newStatus,
      })
      .where(eq(questMissions.id, mission.id));

    await db.insert(questProgressLogs).values({
      userId,
      questId,
      missionId,
      exerciseKey: mission.exerciseKey,
      amount,
      xpAwarded,
    });

    // Update lifetime totals
    const status = await db.query.playerStatus.findFirst({
      where: eq(playerStatus.userId, userId),
    });

    if (status) {
      const updates: Partial<typeof playerStatus.$inferInsert> = {
        fatigue: Math.min(100, status.fatigue + 4),
        updatedAt: new Date(),
      };
      const ex = mission.exerciseKey as ExerciseKey;
      if (ex === 'pushups') updates.totalPushups = status.totalPushups + Math.round(amount);
      if (ex === 'situps') updates.totalSitups = status.totalSitups + Math.round(amount);
      if (ex === 'squats') updates.totalSquats = status.totalSquats + Math.round(amount);
      if (ex === 'lunges') updates.totalLunges = status.totalLunges + Math.round(amount);
      if (ex === 'pullups') updates.totalPullups = status.totalPullups + Math.round(amount);
      if (ex === 'plank') updates.totalPlankSeconds = status.totalPlankSeconds + Math.round(amount);
      if (ex === 'superman') updates.totalSupermanSeconds = status.totalSupermanSeconds + Math.round(amount);

      await db.update(playerStatus).set(updates).where(eq(playerStatus.userId, userId));
    }

    if (xpAwarded > 0) {
      await applyExpAndLevelUps(userId, xpAwarded);
    }

    // Recompute completion percentage across all active daily missions
    const allMissions = await db
      .select()
      .from(questMissions)
      .where(eq(questMissions.questId, questId));

    const totalPct =
      allMissions.reduce((sum, m) => sum + Math.min(1, m.completedAmount / Math.max(0.01, m.target)), 0) /
      Math.max(1, allMissions.length);
    const completionPercentage = Math.round(totalPct * 100);
    const allDone = allMissions.every((m) => m.completedAmount >= m.target);

    await db
      .update(dailyQuests)
      .set({
        completionPercentage,
        status: allDone ? 'completed' : quest.status === 'failed' ? 'failed' : 'active',
        completedAt: allDone && !quest.completedAt ? new Date() : quest.completedAt,
      })
      .where(eq(dailyQuests.id, questId));

    if (allDone && quest.status !== 'completed') {
      await addNotification(
        userId,
        'QUEST_COMPLETED',
        'DAILY QUEST COMPLETE',
        '[CONGRATULATIONS, PLAYER.] All Daily Quest objectives satisfied. Claim your rewards.',
        'gold'
      );
    }

    await syncHunterRankAndMilestones(userId);
    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('logMissionProgress failed:', error);
    throw new Error('Failed to log exercise progress.', { cause: error });
  }
}

export async function claimDailyQuestRewards(userId: number, questId: number) {
  try {
    const result = await db.transaction(async (tx) => {
      const quest = await tx.query.dailyQuests.findFirst({
        where: and(eq(dailyQuests.id, questId), eq(dailyQuests.userId, userId)),
      });
      if (!quest) throw new Error('Quest not found.');
      if (quest.status !== 'completed') throw new Error('Quest is not yet completed.');
      if (quest.rewardsClaimed) throw new Error('Rewards have already been claimed for this quest.');

      await tx
        .update(dailyQuests)
        .set({ rewardsClaimed: true })
        .where(and(eq(dailyQuests.id, questId), eq(dailyQuests.rewardsClaimed, false)));

      const status = await tx.query.playerStatus.findFirst({
        where: eq(playerStatus.userId, userId),
      });
      if (!status) throw new Error('Player status missing.');

      const newStreak = status.streak + 1;
      const highestStreak = Math.max(status.highestStreak, newStreak);
      const bonusGold = 120;
      const bonusStatPoints = 3;
      const bonusExp = getHunterRankForLevel(status.level).dailyQuestBonusExp;

      await tx
        .update(playerStatus)
        .set({
          gold: status.gold + bonusGold,
          availableStatPoints: status.availableStatPoints + bonusStatPoints,
          fatigue: 0,
          hp: 100 + (status.level - 1) * 25,
          mp: 50 + (status.level - 1) * 15,
          streak: newStreak,
          highestStreak,
          completedQuestsCount: status.completedQuestsCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(playerStatus.userId, userId));

      await tx.insert(rewards).values([
        {
          userId,
          rewardType: 'STATUS_RECOVERY',
          rewardValue: 'HP/MP Restored · Fatigue Cleared',
          sourceQuestId: questId,
        },
        {
          userId,
          rewardType: 'STAT_POINTS',
          rewardValue: `+3 Distributable Stat Points · +${bonusExp} Bonus EXP`,
          sourceQuestId: questId,
        },
        {
          userId,
          rewardType: 'LOOT_BOX',
          rewardValue: 'System Supply Box x1',
          sourceQuestId: questId,
        },
      ]);

      await tx.insert(questHistory).values({
        userId,
        questId,
        questDate: quest.questDate,
        finalStatus: 'completed',
        expEarned: bonusExp,
        goldEarned: bonusGold,
        completionPercentage: 100,
        streakAtTime: newStreak,
      });

      return { bonusGold, bonusStatPoints, bonusExp };
    });

    await addItemToInventory(userId, 'random_loot_box', 1);
    await applyExpAndLevelUps(userId, result.bonusExp);
    await addNotification(
      userId,
      'REWARD_RECEIVED',
      'DAILY QUEST REWARDS RECEIVED',
      `Status Recovery applied · +3 Stat Points · +${result.bonusExp} Bonus EXP · +120 Gold · System Supply Box added to Inventory.`,
      'gold'
    );
    await syncHunterRankAndMilestones(userId);

    return {
      state: await getFullPlayerState(userId),
      claimed: result,
    };
  } catch (error) {
    console.error('claimDailyQuestRewards failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to claim quest rewards.', { cause: error });
  }
}

export async function allocateStatPoint(
  userId: number,
  stat: 'strength' | 'stamina' | 'agility' | 'intelligence' | 'sense',
  amount = 1
) {
  try {
    const qty = Math.max(1, Math.min(50, Math.floor(amount)));
    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (!status) throw new Error('Status not found.');
    if (status.availableStatPoints < qty) throw new Error('Insufficient Stat Points.');

    const updates: Partial<typeof playerStatus.$inferInsert> = {
      availableStatPoints: status.availableStatPoints - qty,
      updatedAt: new Date(),
    };
    updates[stat] = status[stat] + qty;
    if (stat === 'stamina') updates.hp = status.hp + qty * 10;
    if (stat === 'intelligence') updates.mp = status.mp + qty * 8;

    await db.update(playerStatus).set(updates).where(eq(playerStatus.userId, userId));
    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('allocateStatPoint failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to allocate stat points.', { cause: error });
  }
}

export async function switchDifficultyMode(
  userId: number,
  questId: number,
  mode: DifficultyMode,
  customTargets?: Record<string, number>
) {
  try {
    const fitness = await db.query.fitnessProfiles.findFirst({ where: eq(fitnessProfiles.userId, userId) });
    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (!fitness || !status) throw new Error('Profile missing.');

    const mergedCustom = customTargets ? { ...fitness.customTargets, ...customTargets } : fitness.customTargets;

    await db
      .update(fitnessProfiles)
      .set({
        adaptiveDifficulty: mode,
        customTargets: mergedCustom,
        updatedAt: new Date(),
      })
      .where(eq(fitnessProfiles.userId, userId));

    const adaptiveTargets = computeAdaptiveTargets({
      experienceLevel: fitness.experienceLevel,
      level: status.level,
      capabilities: fitness.exerciseCapabilities,
      limitations: fitness.limitations,
      recoveryMode: fitness.recoveryMode,
      completedQuestsCount: status.completedQuestsCount,
    });

    const missions = await db.select().from(questMissions).where(eq(questMissions.questId, questId));
    for (const m of missions) {
      const ex = DAILY_EXERCISES.find((e) => e.key === m.exerciseKey);
      if (!ex) continue;
      let newTarget = adaptiveTargets[ex.key];
      if (mode === 'classic') newTarget = ex.classicTarget;
      else if (mode === 'custom' && typeof mergedCustom[ex.key] === 'number' && mergedCustom[ex.key] > 0) {
        newTarget = mergedCustom[ex.key];
      }
      await db
        .update(questMissions)
        .set({
          target: newTarget,
          status: m.completedAmount >= newTarget ? 'completed' : 'pending',
        })
        .where(eq(questMissions.id, m.id));
    }

    const updatedMissions = await db.select().from(questMissions).where(eq(questMissions.questId, questId));
    const totalPct =
      updatedMissions.reduce((sum, m) => sum + Math.min(1, m.completedAmount / Math.max(0.01, m.target)), 0) /
      Math.max(1, updatedMissions.length);
    const completionPercentage = Math.round(totalPct * 100);
    const allDone = updatedMissions.every((m) => m.completedAmount >= m.target);

    await db
      .update(dailyQuests)
      .set({
        difficultyMode: mode,
        completionPercentage,
        status: allDone ? 'completed' : 'active',
      })
      .where(eq(dailyQuests.id, questId));

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('switchDifficultyMode failed:', error);
    throw new Error('Failed to update quest difficulty.', { cause: error });
  }
}

export async function toggleRecoveryOverride(userId: number, questId: number, enabled: boolean) {
  try {
    await db
      .update(fitnessProfiles)
      .set({ recoveryMode: enabled, updatedAt: new Date() })
      .where(eq(fitnessProfiles.userId, userId));

    await db
      .update(dailyQuests)
      .set({ recoveryOverrideUsed: enabled })
      .where(and(eq(dailyQuests.id, questId), eq(dailyQuests.userId, userId)));

    if (enabled) {
      await grantAchievementIfMissing(userId, 'recovery_wisdom');
      await addNotification(
        userId,
        'RECOVERY_MODE',
        'RECOVERY OVERRIDE ACTIVE',
        'Rest protocol enabled. Targets reduced by 50% and Penalty Zone penalties suspended while protecting your streak.',
        'info'
      );
    }

    // Recompute adaptive targets if currently in adaptive mode
    const fitness = await db.query.fitnessProfiles.findFirst({ where: eq(fitnessProfiles.userId, userId) });
    if (fitness && fitness.adaptiveDifficulty === 'adaptive') {
      return await switchDifficultyMode(userId, questId, 'adaptive');
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('toggleRecoveryOverride failed:', error);
    throw new Error('Failed to update recovery override.', { cause: error });
  }
}

export async function triggerPenaltySimulation(userId: number, questId: number) {
  try {
    const quest = await db.query.dailyQuests.findFirst({
      where: and(eq(dailyQuests.id, questId), eq(dailyQuests.userId, userId)),
    });
    if (!quest) throw new Error('Quest not found.');

    await addNotification(
      userId,
      'PENALTY_QUEST',
      'WARNING! PENALTY QUEST ACTIVATED',
      'Simulated Penalty Zone initiated. Remember: you can enable Recovery Override anytime if resting from soreness or injury.',
      'warning'
    );

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('triggerPenaltySimulation failed:', error);
    throw new Error('Failed to trigger penalty event.', { cause: error });
  }
}

export async function openLootBox(userId: number) {
  try {
    const boxRows = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemId, 'random_loot_box')));

    if (boxRows.length === 0 || boxRows[0].quantity < 1) {
      throw new Error('No System Supply Box available in Inventory.');
    }

    if (boxRows[0].quantity === 1) {
      await db.delete(inventory).where(eq(inventory.id, boxRows[0].id));
    } else {
      await db
        .update(inventory)
        .set({ quantity: boxRows[0].quantity - 1 })
        .where(eq(inventory.id, boxRows[0].id));
    }

    const drop = rollLootBox();
    if (drop.type === 'gold' && drop.goldAmount) {
      const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
      if (status) {
        await db
          .update(playerStatus)
          .set({ gold: status.gold + drop.goldAmount, updatedAt: new Date() })
          .where(eq(playerStatus.userId, userId));
      }
    } else if (drop.type === 'item' && drop.id) {
      await addItemToInventory(userId, drop.id, 1);
    } else if (drop.type === 'title' && drop.id) {
      await grantTitleIfMissing(userId, drop.id);
    }

    await db.insert(rewards).values({
      userId,
      rewardType: 'LOOT_BOX_OPENED',
      rewardValue: `${drop.label} (${drop.rarity})`,
    });

    await addNotification(
      userId,
      'ITEM_ACQUIRED',
      'LOOT BOX OPENED',
      `Received [${drop.label}] (${drop.rarity}).`,
      drop.rarity === 'Legendary' || drop.rarity === 'Monarch' ? 'monarch' : 'gold'
    );

    return {
      drop,
      state: await getFullPlayerState(userId),
    };
  } catch (error) {
    console.error('openLootBox failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to open Loot Box.', { cause: error });
  }
}

export async function purchaseShopItem(userId: number, itemId: string) {
  try {
    const item = ITEMS_CATALOG.find((i) => i.id === itemId);
    if (!item || item.priceGold <= 0) throw new Error('Item not available in System Shop.');

    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (!status) throw new Error('Player status missing.');
    if (status.gold < item.priceGold) throw new Error('Insufficient Gold.');

    await db
      .update(playerStatus)
      .set({ gold: status.gold - item.priceGold, updatedAt: new Date() })
      .where(eq(playerStatus.userId, userId));

    if (item.titleGrantId) {
      await grantTitleIfMissing(userId, item.titleGrantId);
    } else {
      await addItemToInventory(userId, item.id, 1);
    }

    await addNotification(
      userId,
      'ITEM_ACQUIRED',
      'SYSTEM SHOP PURCHASE',
      `Acquired [${item.name}] for ${item.priceGold} Gold.`,
      'info'
    );

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('purchaseShopItem failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Purchase failed.', { cause: error });
  }
}

export async function useOrEquipInventoryItem(userId: number, itemId: string) {
  try {
    const item = ITEMS_CATALOG.find((i) => i.id === itemId);
    if (!item) throw new Error('Item not found.');

    const inv = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)));
    if (inv.length === 0 || inv[0].quantity < 1) throw new Error('Item not owned.');

    if (item.themeKey) {
      await db
        .update(profiles)
        .set({ activeTheme: item.themeKey, updatedAt: new Date() })
        .where(eq(profiles.userId, userId));
    } else if (item.frameKey) {
      await db
        .update(profiles)
        .set({ activeAvatarFrame: item.frameKey, updatedAt: new Date() })
        .where(eq(profiles.userId, userId));
    } else if (item.id === 'status_recovery_elixir') {
      if (inv[0].quantity === 1) {
        await db.delete(inventory).where(eq(inventory.id, inv[0].id));
      } else {
        await db
          .update(inventory)
          .set({ quantity: inv[0].quantity - 1 })
          .where(eq(inventory.id, inv[0].id));
      }
      const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
      if (status) {
        await db
          .update(playerStatus)
          .set({
            fatigue: 0,
            hp: 100 + (status.level - 1) * 25,
            mp: 50 + (status.level - 1) * 15,
            updatedAt: new Date(),
          })
          .where(eq(playerStatus.userId, userId));
      }
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('useOrEquipInventoryItem failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to use item.', { cause: error });
  }
}

export async function unlockOrUpgradeSkill(userId: number, skillId: string) {
  try {
    const def = SKILLS_CATALOG.find((s) => s.id === skillId);
    if (!def) throw new Error('Skill not found.');

    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (!status) throw new Error('Player status missing.');

    if (skillId === 'shadow_extraction' && !status.jobChangeCompleted) {
      throw new Error('Complete the Job Change Quest to unlock Shadow Extraction.');
    }
    if (status.level < def.unlockLevel) {
      throw new Error(`Requires Player Level ${def.unlockLevel}.`);
    }

    const existing = await db
      .select()
      .from(skills)
      .where(and(eq(skills.userId, userId), eq(skills.skillId, skillId)));

    if (existing.length === 0) {
      await db.insert(skills).values({
        userId,
        skillId,
        level: 1,
      });
      await addNotification(userId, 'SKILL_UNLOCKED', 'SKILL UNLOCKED', `Skill [${def.name}] unlocked!`, 'gold');
    } else {
      const currentLv = existing[0].level;
      if (currentLv >= def.maxLevel) throw new Error('Skill is already at maximum level.');
      const cost = def.upgradeGoldBase * currentLv;
      if (status.gold < cost) throw new Error(`Requires ${cost} Gold to upgrade.`);

      await db
        .update(playerStatus)
        .set({ gold: status.gold - cost, updatedAt: new Date() })
        .where(eq(playerStatus.userId, userId));
      await db
        .update(skills)
        .set({ level: currentLv + 1 })
        .where(eq(skills.id, existing[0].id));
      await addNotification(
        userId,
        'SKILL_UNLOCKED',
        'SKILL UPGRADED',
        `Skill [${def.name}] upgraded to Lv.${currentLv + 1}.`,
        'info'
      );
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('unlockOrUpgradeSkill failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Skill action failed.', { cause: error });
  }
}

export async function equipTitle(userId: number, titleId: string) {
  try {
    const owned = await db
      .select()
      .from(titles)
      .where(and(eq(titles.userId, userId), eq(titles.titleId, titleId)));
    if (owned.length === 0) throw new Error('Title not yet unlocked.');

    await db.update(titles).set({ equipped: false }).where(eq(titles.userId, userId));
    await db
      .update(titles)
      .set({ equipped: true })
      .where(and(eq(titles.userId, userId), eq(titles.titleId, titleId)));

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('equipTitle failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to equip title.', { cause: error });
  }
}

export async function claimSpecialQuest(userId: number, specialQuestId: number) {
  try {
    const sq = await db.query.specialQuests.findFirst({
      where: and(eq(specialQuests.id, specialQuestId), eq(specialQuests.userId, userId)),
    });
    if (!sq) throw new Error('Special Quest not found.');
    if (sq.rewardsClaimed || sq.status === 'claimed') throw new Error('Rewards already claimed.');
    if (sq.status !== 'completed') throw new Error('Quest objectives not yet met.');

    await db
      .update(specialQuests)
      .set({ status: 'claimed', rewardsClaimed: true })
      .where(eq(specialQuests.id, sq.id));

    const mainTpl = MAIN_QUEST_TEMPLATES.find((m) => m.key === sq.questKey);
    const emgTpl = EMERGENCY_QUEST_TEMPLATES.find((e) => e.key === sq.questKey);
    const xpReward = mainTpl?.xpReward || emgTpl?.xpReward || 150;
    const goldReward = mainTpl?.goldReward || emgTpl?.goldReward || 200;

    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (status) {
      await db
        .update(playerStatus)
        .set({ gold: status.gold + goldReward, updatedAt: new Date() })
        .where(eq(playerStatus.userId, userId));
    }

    await applyExpAndLevelUps(userId, xpReward);
    await addNotification(
      userId,
      'REWARD_RECEIVED',
      'SPECIAL QUEST CLEARED',
      `[${sq.title}] claimed (+${xpReward} EXP, +${goldReward} Gold).`,
      'gold'
    );
    await syncHunterRankAndMilestones(userId);
    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('claimSpecialQuest failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to claim special quest.', { cause: error });
  }
}

export async function acceptOrCompleteEmergencyQuest(
  userId: number,
  action: 'spawn' | 'complete',
  specialQuestId?: number
) {
  try {
    if (action === 'spawn') {
      const existingActive = await db
        .select()
        .from(specialQuests)
        .where(
          and(
            eq(specialQuests.userId, userId),
            eq(specialQuests.category, 'emergency'),
            eq(specialQuests.status, 'active')
          )
        );
      if (existingActive.length > 0) return await getFullPlayerState(userId);

      const tpl = EMERGENCY_QUEST_TEMPLATES[Math.floor(Math.random() * EMERGENCY_QUEST_TEMPLATES.length)];
      await db.insert(specialQuests).values({
        userId,
        questKey: tpl.key,
        category: 'emergency',
        title: tpl.title,
        description: tpl.description,
        targetMetric: tpl.targetMetric,
        targetValue: tpl.targetValue,
        progressValue: 0,
        status: 'active',
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });

      await addNotification(
        userId,
        'EMERGENCY_QUEST',
        'EMERGENCY QUEST ISSUED',
        `${tpl.title}: Optional 2-hour sprint challenge ready in Special Quests.`,
        'warning'
      );
      return await getFullPlayerState(userId);
    }

    if (action === 'complete' && specialQuestId) {
      const sq = await db.query.specialQuests.findFirst({
        where: and(eq(specialQuests.id, specialQuestId), eq(specialQuests.userId, userId)),
      });
      if (!sq) throw new Error('Emergency Quest not found.');
      await db
        .update(specialQuests)
        .set({
          progressValue: sq.targetValue,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(specialQuests.id, sq.id));
      return await claimSpecialQuest(userId, sq.id);
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('acceptOrCompleteEmergencyQuest failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Emergency quest error.', { cause: error });
  }
}

export async function advanceJobChangeStage(userId: number) {
  try {
    const status = await db.query.playerStatus.findFirst({ where: eq(playerStatus.userId, userId) });
    if (!status) throw new Error('Player status missing.');
    if (status.jobChangeCompleted) return await getFullPlayerState(userId);
    if (status.level < 5 && status.completedQuestsCount < 3) {
      throw new Error('Reach Level 5 or complete 3 Daily Quests to unlock the Job Change Trial.');
    }

    const nextStage = status.jobChangeStage + 1;
    if (nextStage < 3) {
      await db
        .update(playerStatus)
        .set({
          jobChangeStage: nextStage,
          job: nextStage === 1 ? 'Trial Challenger' : 'Necromancer Candidate',
          updatedAt: new Date(),
        })
        .where(eq(playerStatus.userId, userId));
    } else {
      await db
        .update(playerStatus)
        .set({
          jobChangeStage: 3,
          jobChangeCompleted: true,
          job: 'SHADOW MONARCH',
          gold: status.gold + 500,
          availableStatPoints: status.availableStatPoints + 5,
          updatedAt: new Date(),
        })
        .where(eq(playerStatus.userId, userId));

      await grantTitleIfMissing(userId, 'shadow_monarch');
      await grantAchievementIfMissing(userId, 'job_change_monarch');
      await db.insert(skills).values({
        userId,
        skillId: 'shadow_extraction',
        level: 1,
      });
      await addNotification(
        userId,
        'JOB_CHANGE_AVAILABLE',
        'ARISE — CLASS EVOLUTION COMPLETE',
        'You have cleared the Job Change Trial! New Class: [SHADOW MONARCH]. Skill [Shadow Extraction] unlocked.',
        'monarch'
      );
      await syncHunterRankAndMilestones(userId);
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('advanceJobChangeStage failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to advance Job Change trial.', { cause: error });
  }
}

export async function updateSettings(
  userId: number,
  input: Partial<{
    username: string;
    age: number;
    heightCm: number;
    weightKg: number;
    fitnessGoal: string;
    timezone: string;
    activeTheme: string;
    soundEnabled: boolean;
    animationsEnabled: boolean;
    notificationsEnabled: boolean;
    experienceLevel: string;
    limitations: string;
  }>
) {
  try {
    const profilePatch: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    if (input.username !== undefined) profilePatch.username = input.username.trim().slice(0, 40) || 'Player';
    if (input.age !== undefined) profilePatch.age = Number(input.age);
    if (input.heightCm !== undefined) profilePatch.heightCm = Number(input.heightCm);
    if (input.weightKg !== undefined) profilePatch.weightKg = Number(input.weightKg);
    if (input.fitnessGoal !== undefined) profilePatch.fitnessGoal = input.fitnessGoal;
    if (input.timezone !== undefined) profilePatch.timezone = input.timezone;
    if (input.activeTheme !== undefined) profilePatch.activeTheme = input.activeTheme;
    if (input.soundEnabled !== undefined) profilePatch.soundEnabled = Boolean(input.soundEnabled);
    if (input.animationsEnabled !== undefined) profilePatch.animationsEnabled = Boolean(input.animationsEnabled);
    if (input.notificationsEnabled !== undefined) profilePatch.notificationsEnabled = Boolean(input.notificationsEnabled);

    await db.update(profiles).set(profilePatch).where(eq(profiles.userId, userId));

    if (input.experienceLevel !== undefined || input.limitations !== undefined) {
      const fitnessPatch: Partial<typeof fitnessProfiles.$inferInsert> = { updatedAt: new Date() };
      if (input.experienceLevel !== undefined) fitnessPatch.experienceLevel = input.experienceLevel;
      if (input.limitations !== undefined) fitnessPatch.limitations = input.limitations;
      await db.update(fitnessProfiles).set(fitnessPatch).where(eq(fitnessProfiles.userId, userId));
    }

    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('updateSettings failed:', error);
    throw new Error('Failed to save settings.', { cause: error });
  }
}

export async function markNotificationsRead(userId: number) {
  try {
    await db
      .update(notifications)
      .set({ readStatus: true })
      .where(eq(notifications.userId, userId));
    return await getFullPlayerState(userId);
  } catch (error) {
    console.error('markNotificationsRead failed:', error);
    throw new Error('Failed to update notifications.', { cause: error });
  }
}
