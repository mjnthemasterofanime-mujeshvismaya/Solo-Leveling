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
} from '../shared/systemData';
import {
  DailyQuest,
  FullPlayerState,
  QuestMission,
  SpecialQuestEntry,
  SystemNotification,
} from '../types/system';

const STORAGE_KEY = 'the_system_standalone_player_state_v1';

let idCounter = Date.now();
function nextId(): number {
  idCounter += 1;
  return idCounter;
}

function getTodayDateKey(timezone: string): string {
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

function createInitialState(): FullPlayerState {
  const nowIso = new Date().toISOString();
  const specialQuests: SpecialQuestEntry[] = MAIN_QUEST_TEMPLATES.map((mq, idx) => ({
    id: idx + 1,
    userId: 1,
    questKey: mq.key,
    category: 'main',
    title: mq.title,
    description: mq.description,
    targetMetric: mq.targetMetric,
    targetValue: mq.targetValue,
    progressValue: 0,
    status: 'active',
    deadline: null,
    rewardsClaimed: false,
    completedAt: null,
  }));

  const state: FullPlayerState = {
    profile: {
      id: 1,
      userId: 1,
      username: 'Player',
      age: 24,
      heightCm: 176,
      weightKg: 72,
      fitnessGoal: 'Strength & Conditioning',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      onboardingCompleted: false,
      qualificationAccepted: false,
      activeTheme: 'abyssal_blue',
      activeAvatarFrame: 'default',
      soundEnabled: true,
      animationsEnabled: true,
      notificationsEnabled: true,
    },
    status: {
      id: 1,
      userId: 1,
      level: 1,
      exp: 0,
      totalExp: 0,
      nextLevelExp: expRequiredForLevel(1),
      gold: 0,
      hunterRank: 'E-RANK',
      job: 'None',
      availableStatPoints: 0,
      strength: 10,
      stamina: 10,
      agility: 10,
      intelligence: 10,
      sense: 10,
      hp: 100,
      mp: 50,
      fatigue: 0,
      streak: 0,
      highestStreak: 0,
      highestLevel: 1,
      completedQuestsCount: 0,
      failedQuestsCount: 0,
      totalPushups: 0,
      totalSitups: 0,
      totalSquats: 0,
      totalLunges: 0,
      totalPullups: 0,
      totalPlankSeconds: 0,
      totalSupermanSeconds: 0,
      totalRunningKm: 0,
      jobChangeStage: 0,
      jobChangeCompleted: false,
    },
    fitnessProfile: {
      id: 1,
      userId: 1,
      experienceLevel: 'beginner',
      equipment: ['Bodyweight Only'],
      exerciseCapabilities: {},
      limitations: '',
      adaptiveDifficulty: 'classic',
      recoveryMode: false,
      customTargets: {},
    },
    dailyQuest: null,
    recentFailedQuest: null,
    inventory: [],
    achievements: [],
    titles: [
      {
        id: 1,
        userId: 1,
        titleId: 'the_awakened',
        equipped: true,
        unlockedAt: nowIso,
      },
    ],
    skills: [
      {
        id: 1,
        userId: 1,
        skillId: 'sprint',
        level: 1,
        unlockedAt: nowIso,
      },
    ],
    specialQuests,
    questHistory: [],
    notifications: [],
    rewards: [],
  };

  ensureDailyQuest(state);
  return state;
}

function loadState(): FullPlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FullPlayerState;
      ensureDailyQuest(parsed);
      parsed.status.hunterRank = getHunterRankForLevel(parsed.status.level).rank;
      parsed.status.nextLevelExp = expRequiredForLevel(parsed.status.level);
      return parsed;
    }
  } catch {
    // Fall back to fresh state
  }
  const fresh = createInitialState();
  saveState(fresh);
  return fresh;
}

function saveState(state: FullPlayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

function pushNotif(
  state: FullPlayerState,
  notificationType: string,
  title: string,
  message: string,
  severity: SystemNotification['severity'] = 'info'
) {
  state.notifications.unshift({
    id: nextId(),
    userId: 1,
    notificationType,
    title,
    message,
    severity,
    readStatus: false,
    createdAt: new Date().toISOString(),
  });
  state.notifications = state.notifications.slice(0, 30);
}

function grantTitle(state: FullPlayerState, titleId: string) {
  if (!state.titles.some((t) => t.titleId === titleId)) {
    state.titles.push({
      id: nextId(),
      userId: 1,
      titleId,
      equipped: false,
      unlockedAt: new Date().toISOString(),
    });
    pushNotif(
      state,
      'NEW_TITLE_ACQUIRED',
      'NEW TITLE ACQUIRED',
      `Title unlocked: [${titleId.replace(/_/g, ' ').toUpperCase()}].`,
      'gold'
    );
  }
}

function applyExp(state: FullPlayerState, gainedExp: number) {
  if (gainedExp <= 0) return;
  const s = state.status;
  s.exp += gainedExp;
  s.totalExp += gainedExp;
  let leveledUp = false;

  while (s.exp >= expRequiredForLevel(s.level)) {
    s.exp -= expRequiredForLevel(s.level);
    s.level += 1;
    leveledUp = true;
    s.strength += 1;
    s.stamina += 1;
    s.agility += 1;
    s.intelligence += 1;
    s.sense += 1;
    s.availableStatPoints += 3;
    s.hp += 25;
    s.mp += 15;
  }

  s.highestLevel = Math.max(s.highestLevel, s.level);
  s.nextLevelExp = expRequiredForLevel(s.level);

  const newRankTier = getHunterRankForLevel(s.level);
  const rankChanged = newRankTier.rank !== s.hunterRank;
  s.hunterRank = newRankTier.rank;

  if (leveledUp) {
    pushNotif(
      state,
      'LEVEL_UP',
      'LEVEL UP!',
      `You have reached Level ${s.level}. Base attributes increased (+1 each) and +3 Stat Points granted.`,
      'gold'
    );
  }
  if (rankChanged) {
    pushNotif(
      state,
      'RANK_UP',
      `HUNTER RANK PROMOTION: ${newRankTier.rank}`,
      `You have ascended to ${newRankTier.rank} (${newRankTier.title}) at Level ${s.level}.`,
      'gold'
    );
    if (['C-RANK', 'B-RANK', 'A-RANK', 'S-RANK'].includes(newRankTier.rank)) {
      grantTitle(state, 'shadow_hunter');
    }
  }
}

function grantAchievement(state: FullPlayerState, achievementId: string) {
  if (state.achievements.some((a) => a.achievementId === achievementId)) return;
  const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === achievementId);
  state.achievements.push({
    id: nextId(),
    userId: 1,
    achievementId,
    unlockedAt: new Date().toISOString(),
  });
  if (def) {
    state.status.gold += def.goldReward;
    applyExp(state, def.xpReward);
    pushNotif(
      state,
      def.hidden ? 'HIDDEN_QUEST_DISCOVERED' : 'REWARD_RECEIVED',
      def.hidden ? 'HIDDEN QUEST DISCOVERED' : 'ACHIEVEMENT UNLOCKED',
      `${def.name}: ${def.description} (+${def.xpReward} EXP, +${def.goldReward} Gold)`,
      def.hidden ? 'monarch' : 'gold'
    );
  }
}

function addItem(state: FullPlayerState, itemId: string, qty = 1) {
  const existing = state.inventory.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.inventory.push({
      id: nextId(),
      userId: 1,
      itemId,
      quantity: qty,
      acquiredAt: new Date().toISOString(),
    });
  }
}

function syncMilestones(state: FullPlayerState) {
  const s = state.status;
  if (s.completedQuestsCount >= 1) grantAchievement(state, 'first_daily_clear');
  if (s.streak >= 3) grantTitle(state, 'the_persistent_one');
  if (s.completedQuestsCount >= 7) grantAchievement(state, 'streak_7');
  if (s.totalPushups >= 1000) {
    grantAchievement(state, 'pushups_1000');
    grantTitle(state, 'iron_body');
  }
  if (s.completedQuestsCount >= 15) grantTitle(state, 'elite_hunter');
  if (s.completedQuestsCount >= 30) {
    grantAchievement(state, 'quests_30');
    grantTitle(state, 'the_unbreakable');
  }

  for (const sq of state.specialQuests) {
    if (sq.category !== 'main' || sq.status === 'claimed') continue;
    if (sq.targetMetric === 'totalPushups') sq.progressValue = s.totalPushups;
    else if (sq.targetMetric === 'totalSquats') sq.progressValue = s.totalSquats;
    else if (sq.targetMetric === 'totalPullups') sq.progressValue = s.totalPullups;
    if (sq.progressValue >= sq.targetValue) {
      sq.status = 'completed';
      sq.completedAt = sq.completedAt || new Date().toISOString();
    } else {
      sq.status = 'active';
    }
  }
}

function ensureDailyQuest(state: FullPlayerState) {
  const todayKey = getTodayDateKey(state.profile.timezone || 'UTC');
  const current = state.dailyQuest;

  if (current && current.questDate !== todayKey && current.status === 'active') {
    const finalStatus = current.recoveryOverrideUsed || state.fitnessProfile.recoveryMode ? 'recovery' : 'failed';
    current.status = finalStatus;
    state.questHistory.unshift({
      id: nextId(),
      userId: 1,
      questId: current.id,
      questDate: current.questDate,
      finalStatus,
      expEarned: 0,
      goldEarned: 0,
      completionPercentage: current.completionPercentage,
      streakAtTime: state.status.streak,
      recordedAt: new Date().toISOString(),
    });
    if (finalStatus === 'failed') {
      state.recentFailedQuest = current;
      state.status.streak = 0;
      state.status.failedQuestsCount += 1;
      pushNotif(
        state,
        'PENALTY_QUEST',
        'WARNING! DAILY QUEST FAILED',
        'PENALTY QUEST ACTIVATED: Penalty Zone event triggered for missed Daily Quest objectives.',
        'warning'
      );
    }
  }

  if (current && current.questDate === todayKey) {
    return;
  }

  const mode = (state.fitnessProfile.adaptiveDifficulty || 'classic') as DifficultyMode;
  const adaptiveTargets = computeAdaptiveTargets({
    experienceLevel: state.fitnessProfile.experienceLevel,
    level: state.status.level,
    capabilities: state.fitnessProfile.exerciseCapabilities,
    limitations: state.fitnessProfile.limitations,
    recoveryMode: state.fitnessProfile.recoveryMode,
    completedQuestsCount: state.status.completedQuestsCount,
  });

  const questId = nextId();
  const missions: QuestMission[] = DAILY_EXERCISES.map((ex) => {
    let target = ex.classicTarget;
    if (mode === 'adaptive') target = adaptiveTargets[ex.key];
    else if (mode === 'custom' && typeof state.fitnessProfile.customTargets[ex.key] === 'number') {
      target = Math.max(1, state.fitnessProfile.customTargets[ex.key]);
    }
    return {
      id: nextId(),
      questId,
      exerciseKey: ex.key,
      exerciseName: ex.name,
      target,
      completedAmount: 0,
      unit: ex.unit,
      xpPerUnit: ex.xpPerUnit,
      instructions: ex.instructions,
      restGuidance: ex.restGuidance,
      status: 'pending',
    };
  });

  const newQuest: DailyQuest = {
    id: questId,
    userId: 1,
    questDate: todayKey,
    title: 'PREPARATION TO BECOME POWERFUL',
    difficultyMode: mode,
    status: 'active',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completionPercentage: 0,
    rewardsClaimed: false,
    recoveryOverrideUsed: state.fitnessProfile.recoveryMode,
    completedAt: null,
    missions,
  };

  state.dailyQuest = newQuest;
  pushNotif(
    state,
    'DAILY_QUEST_ARRIVAL',
    'DAILY QUEST ARRIVED',
    '[Daily Quest: Strength Training has arrived.] Complete all 7 missions before the 24-hour deadline.',
    'info'
  );
}

function recomputeDifficulty(state: FullPlayerState, mode: DifficultyMode, customTargets?: Record<string, number>) {
  if (customTargets) {
    state.fitnessProfile.customTargets = { ...state.fitnessProfile.customTargets, ...customTargets };
  }
  state.fitnessProfile.adaptiveDifficulty = mode;
  if (!state.dailyQuest) return;

  const adaptiveTargets = computeAdaptiveTargets({
    experienceLevel: state.fitnessProfile.experienceLevel,
    level: state.status.level,
    capabilities: state.fitnessProfile.exerciseCapabilities,
    limitations: state.fitnessProfile.limitations,
    recoveryMode: state.fitnessProfile.recoveryMode,
    completedQuestsCount: state.status.completedQuestsCount,
  });

  for (const m of state.dailyQuest.missions) {
    const ex = DAILY_EXERCISES.find((e) => e.key === m.exerciseKey);
    if (!ex) continue;
    let newTarget = adaptiveTargets[ex.key];
    if (mode === 'classic') newTarget = ex.classicTarget;
    else if (mode === 'custom' && typeof state.fitnessProfile.customTargets[ex.key] === 'number') {
      newTarget = Math.max(1, state.fitnessProfile.customTargets[ex.key]);
    }
    m.target = newTarget;
    m.status = m.completedAmount >= newTarget ? 'completed' : 'pending';
  }

  const missions = state.dailyQuest.missions;
  const pct =
    missions.reduce((sum, m) => sum + Math.min(1, m.completedAmount / Math.max(0.01, m.target)), 0) /
    Math.max(1, missions.length);
  state.dailyQuest.difficultyMode = mode;
  state.dailyQuest.completionPercentage = Math.round(pct * 100);
  state.dailyQuest.status = missions.every((m) => m.completedAmount >= m.target) ? 'completed' : 'active';
}

export async function handleLocalApiRequest<T>(
  path: string,
  _method: 'GET' | 'POST',
  body?: any
): Promise<T> {
  const state = loadState();

  switch (path) {
    case '/api/player/state': {
      saveState(state);
      return state as T;
    }

    case '/api/player/onboarding': {
      state.profile.username = String(body.username || 'Player').trim().slice(0, 40) || 'Player';
      state.profile.age = Math.max(13, Math.min(100, Number(body.age) || 24));
      state.profile.heightCm = Math.max(100, Math.min(240, Number(body.heightCm) || 176));
      state.profile.weightKg = Math.max(30, Math.min(300, Number(body.weightKg) || 72));
      state.profile.fitnessGoal = body.fitnessGoal || 'Strength & Conditioning';
      state.profile.timezone = body.timezone || state.profile.timezone || 'UTC';
      state.profile.qualificationAccepted = true;
      state.profile.onboardingCompleted = true;

      state.fitnessProfile.experienceLevel = body.experienceLevel || 'beginner';
      state.fitnessProfile.equipment = body.equipment || [];
      state.fitnessProfile.exerciseCapabilities = body.exerciseCapabilities || {};
      state.fitnessProfile.limitations = body.limitations || '';
      recomputeDifficulty(state, 'classic');

      grantAchievement(state, 'first_awakening');
      grantTitle(state, 'the_awakened');
      pushNotif(
        state,
        'PLAYER_REGISTRATION',
        'PLAYER REGISTRATION COMPLETE',
        'Status Window unlocked. Your Daily Quest targets are active.',
        'info'
      );
      saveState(state);
      return state as T;
    }

    case '/api/player/quest/progress': {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
        throw new Error('Invalid progress increment.');
      }
      const mission = state.dailyQuest?.missions.find((m) => m.id === Number(body.missionId));
      if (!state.dailyQuest || !mission) throw new Error('Mission not found.');

      const prev = mission.completedAmount;
      const nextVal = Number((prev + amount).toFixed(2));
      const newlyCompleted = Math.max(0, Math.min(mission.target, nextVal) - Math.min(mission.target, prev));
      const xpAwarded = Math.round(newlyCompleted * mission.xpPerUnit);
      mission.completedAmount = nextVal;
      mission.status = nextVal >= mission.target ? 'completed' : 'pending';

      const s = state.status;
      if (mission.exerciseKey === 'pushups') s.totalPushups += Math.round(amount);
      else if (mission.exerciseKey === 'situps') s.totalSitups += Math.round(amount);
      else if (mission.exerciseKey === 'squats') s.totalSquats += Math.round(amount);
      else if (mission.exerciseKey === 'lunges') s.totalLunges += Math.round(amount);
      else if (mission.exerciseKey === 'pullups') s.totalPullups += Math.round(amount);
      else if (mission.exerciseKey === 'plank') s.totalPlankSeconds += Math.round(amount);
      else if (mission.exerciseKey === 'superman') s.totalSupermanSeconds += Math.round(amount);
      s.fatigue = Math.min(100, s.fatigue + Math.max(1, Math.round(amount / 15)));

      if (xpAwarded > 0) applyExp(state, xpAwarded);

      const ms = state.dailyQuest.missions;
      const pct = Math.round(
        (ms.reduce((sum, m) => sum + Math.min(1, m.completedAmount / Math.max(0.01, m.target)), 0) /
          Math.max(1, ms.length)) *
          100
      );
      state.dailyQuest.completionPercentage = pct;
      const allDone = ms.every((m) => m.completedAmount >= m.target);
      if (allDone && state.dailyQuest.status !== 'completed') {
        state.dailyQuest.status = 'completed';
        state.dailyQuest.completedAt = new Date().toISOString();
        pushNotif(
          state,
          'QUEST_COMPLETED',
          'DAILY QUEST COMPLETED',
          'All Daily Quest objectives satisfied. Claim your rewards inside the Daily Quest window.',
          'gold'
        );
      }

      syncMilestones(state);
      saveState(state);
      return state as T;
    }

    case '/api/player/quest/claim': {
      if (!state.dailyQuest || state.dailyQuest.status !== 'completed' || state.dailyQuest.rewardsClaimed) {
        throw new Error('Quest rewards cannot be claimed.');
      }
      state.dailyQuest.rewardsClaimed = true;
      const bonusGold = 120;
      const bonusStatPoints = 3;
      const bonusExp = getHunterRankForLevel(state.status.level).dailyQuestBonusExp;

      state.status.gold += bonusGold;
      state.status.availableStatPoints += bonusStatPoints;
      state.status.fatigue = 0;
      state.status.hp = 100 + (state.status.level - 1) * 25;
      state.status.mp = 50 + (state.status.level - 1) * 15;
      state.status.streak += 1;
      state.status.highestStreak = Math.max(state.status.highestStreak, state.status.streak);
      state.status.completedQuestsCount += 1;

      state.questHistory.unshift({
        id: nextId(),
        userId: 1,
        questId: state.dailyQuest.id,
        questDate: state.dailyQuest.questDate,
        finalStatus: 'completed',
        expEarned: bonusExp,
        goldEarned: bonusGold,
        completionPercentage: 100,
        streakAtTime: state.status.streak,
        recordedAt: new Date().toISOString(),
      });

      addItem(state, 'random_loot_box', 1);
      applyExp(state, bonusExp);
      pushNotif(
        state,
        'REWARD_RECEIVED',
        'DAILY QUEST REWARDS RECEIVED',
        `Status Recovery applied · +3 Stat Points · +${bonusExp} Bonus EXP · +120 Gold · System Supply Box added to Inventory.`,
        'gold'
      );
      syncMilestones(state);
      saveState(state);
      return {
        state,
        claimed: { bonusGold, bonusStatPoints, bonusExp },
      } as T;
    }

    case '/api/player/quest/difficulty': {
      recomputeDifficulty(state, body.mode as DifficultyMode, body.customTargets);
      saveState(state);
      return state as T;
    }

    case '/api/player/quest/recovery': {
      const enabled = Boolean(body.enabled);
      state.fitnessProfile.recoveryMode = enabled;
      if (state.dailyQuest) state.dailyQuest.recoveryOverrideUsed = enabled;
      if (enabled) {
        grantAchievement(state, 'recovery_wisdom');
        pushNotif(
          state,
          'RECOVERY_MODE',
          'RECOVERY OVERRIDE ACTIVE',
          'Rest protocol enabled. Targets reduced by 50% and Penalty Zone penalties suspended while protecting your streak.',
          'info'
        );
      }
      if (state.fitnessProfile.adaptiveDifficulty === 'adaptive') {
        recomputeDifficulty(state, 'adaptive');
      }
      saveState(state);
      return state as T;
    }

    case '/api/player/quest/penalty-event': {
      pushNotif(
        state,
        'PENALTY_QUEST',
        'WARNING! PENALTY QUEST ACTIVATED',
        'Simulated Penalty Zone initiated. Remember: you can enable Recovery Override anytime if resting from soreness or injury.',
        'warning'
      );
      saveState(state);
      return state as T;
    }

    case '/api/player/status/allocate': {
      const stat = body.stat as 'strength' | 'stamina' | 'agility' | 'intelligence' | 'sense';
      const qty = Math.max(1, Math.min(50, Math.floor(Number(body.amount) || 1)));
      if (state.status.availableStatPoints < qty) throw new Error('Insufficient Stat Points.');
      state.status.availableStatPoints -= qty;
      state.status[stat] += qty;
      if (stat === 'stamina') state.status.hp += qty * 10;
      if (stat === 'intelligence') state.status.mp += qty * 8;
      saveState(state);
      return state as T;
    }

    case '/api/player/inventory/open-box': {
      const box = state.inventory.find((i) => i.itemId === 'random_loot_box');
      if (!box || box.quantity <= 0) throw new Error('No System Supply Boxes in inventory.');
      box.quantity -= 1;
      if (box.quantity <= 0) {
        state.inventory = state.inventory.filter((i) => i.id !== box.id);
      }
      const drop = rollLootBox();
      if (drop.type === 'gold' && drop.goldAmount) state.status.gold += drop.goldAmount;
      else if (drop.type === 'item' && drop.id) addItem(state, drop.id, 1);
      else if (drop.type === 'title' && drop.id) grantTitle(state, drop.id);
      pushNotif(state, 'REWARD_RECEIVED', 'LOOT BOX OPENED', `Obtained: ${drop.label} [${drop.rarity}]`, 'gold');
      saveState(state);
      return { drop, state } as T;
    }

    case '/api/player/inventory/use': {
      const itemId = String(body.itemId);
      const itemDef = ITEMS_CATALOG.find((i) => i.id === itemId);
      const row = state.inventory.find((i) => i.itemId === itemId);
      if (!itemDef || !row || row.quantity <= 0) throw new Error('Item not found in inventory.');

      if (itemDef.category === 'Consumable') {
        row.quantity -= 1;
        if (row.quantity <= 0) state.inventory = state.inventory.filter((i) => i.id !== row.id);
        state.status.fatigue = 0;
        state.status.hp = 100 + (state.status.level - 1) * 25;
        state.status.mp = 50 + (state.status.level - 1) * 15;
        pushNotif(state, 'ITEM_USED', 'CONSUMABLE USED', `${itemDef.name} consumed.`, 'info');
      } else if (itemDef.themeKey) {
        state.profile.activeTheme = itemDef.themeKey;
        pushNotif(state, 'THEME_CHANGED', 'SYSTEM THEME APPLIED', `Theme changed to ${itemDef.name}.`, 'monarch');
      } else if (itemDef.frameKey) {
        state.profile.activeAvatarFrame = itemDef.frameKey;
      }
      saveState(state);
      return state as T;
    }

    case '/api/player/shop/buy': {
      const itemDef = ITEMS_CATALOG.find((i) => i.id === String(body.itemId));
      if (!itemDef || itemDef.priceGold <= 0) throw new Error('Item unavailable.');
      if (state.status.gold < itemDef.priceGold) throw new Error('Insufficient Gold.');
      state.status.gold -= itemDef.priceGold;
      if (itemDef.titleGrantId) grantTitle(state, itemDef.titleGrantId);
      else addItem(state, itemDef.id, 1);
      pushNotif(state, 'SHOP_PURCHASE', 'SYSTEM SHOP PURCHASE', `Acquired ${itemDef.name} for ${itemDef.priceGold} Gold.`, 'gold');
      saveState(state);
      return state as T;
    }

    case '/api/player/skills/upgrade': {
      const skillDef = SKILLS_CATALOG.find((s) => s.id === String(body.skillId));
      if (!skillDef) throw new Error('Skill not found.');
      if (state.status.level < skillDef.unlockLevel) {
        throw new Error(`Requires Player Level ${skillDef.unlockLevel}.`);
      }
      const existing = state.skills.find((s) => s.skillId === skillDef.id);
      const nextLv = existing ? existing.level + 1 : 1;
      if (nextLv > skillDef.maxLevel) throw new Error('Skill is already at max level.');
      const cost = skillDef.upgradeGoldBase * nextLv;
      if (state.status.gold < cost) throw new Error(`Need ${cost} Gold.`);
      state.status.gold -= cost;
      if (existing) existing.level = nextLv;
      else state.skills.push({ id: nextId(), userId: 1, skillId: skillDef.id, level: 1, unlockedAt: new Date().toISOString() });
      saveState(state);
      return state as T;
    }

    case '/api/player/titles/equip': {
      const titleId = String(body.titleId);
      if (!state.titles.some((t) => t.titleId === titleId)) throw new Error('Title not unlocked.');
      for (const t of state.titles) t.equipped = t.titleId === titleId;
      saveState(state);
      return state as T;
    }

    case '/api/player/special-quests/claim': {
      const sq = state.specialQuests.find((q) => q.id === Number(body.specialQuestId));
      if (!sq || sq.status !== 'completed' || sq.rewardsClaimed) throw new Error('Special Quest not ready to claim.');
      sq.rewardsClaimed = true;
      sq.status = 'claimed';
      const tpl = [...MAIN_QUEST_TEMPLATES, ...EMERGENCY_QUEST_TEMPLATES].find((t) => t.key === sq.questKey);
      const xpReward = tpl?.xpReward || 200;
      const goldReward = tpl?.goldReward || 250;
      state.status.gold += goldReward;
      applyExp(state, xpReward);
      pushNotif(state, 'REWARD_RECEIVED', 'SPECIAL QUEST CLEARED', `[${sq.title}] claimed (+${xpReward} EXP, +${goldReward} Gold).`, 'gold');
      syncMilestones(state);
      saveState(state);
      return state as T;
    }

    case '/api/player/special-quests/emergency': {
      if (body.action === 'spawn') {
        const active = state.specialQuests.some((q) => q.category === 'emergency' && q.status === 'active');
        if (!active) {
          const tpl = EMERGENCY_QUEST_TEMPLATES[Math.floor(Math.random() * EMERGENCY_QUEST_TEMPLATES.length)];
          state.specialQuests.push({
            id: nextId(),
            userId: 1,
            questKey: tpl.key,
            category: 'emergency',
            title: tpl.title,
            description: tpl.description,
            targetMetric: tpl.targetMetric,
            targetValue: tpl.targetValue,
            progressValue: 0,
            status: 'active',
            deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            rewardsClaimed: false,
            completedAt: null,
          });
          pushNotif(state, 'EMERGENCY_QUEST', 'EMERGENCY QUEST ISSUED', `${tpl.title}: Optional 2-hour sprint challenge ready.`, 'warning');
        }
      } else if (body.action === 'complete') {
        const sq = state.specialQuests.find((q) => q.id === Number(body.specialQuestId));
        if (sq) {
          sq.progressValue = sq.targetValue;
          sq.status = 'completed';
          sq.completedAt = new Date().toISOString();
          saveState(state);
          return handleLocalApiRequest<T>('/api/player/special-quests/claim', 'POST', { specialQuestId: sq.id });
        }
      }
      saveState(state);
      return state as T;
    }

    case '/api/player/special-quests/job-change': {
      if (state.status.jobChangeCompleted) return state as T;
      if (state.status.level < 5 && state.status.completedQuestsCount < 3) {
        throw new Error('Reach Level 5 or complete 3 Daily Quests to unlock the Job Change Trial.');
      }
      const nextStage = state.status.jobChangeStage + 1;
      if (nextStage < 3) {
        state.status.jobChangeStage = nextStage;
        state.status.job = nextStage === 1 ? 'Trial Challenger' : 'Necromancer Candidate';
      } else {
        state.status.jobChangeStage = 3;
        state.status.jobChangeCompleted = true;
        state.status.job = 'SHADOW MONARCH';
        state.status.gold += 500;
        state.status.availableStatPoints += 5;
        grantTitle(state, 'shadow_monarch');
        grantAchievement(state, 'job_change_monarch');
        if (!state.skills.some((s) => s.skillId === 'shadow_extraction')) {
          state.skills.push({ id: nextId(), userId: 1, skillId: 'shadow_extraction', level: 1, unlockedAt: new Date().toISOString() });
        }
        pushNotif(state, 'JOB_CHANGE_AVAILABLE', 'ARISE — CLASS EVOLUTION COMPLETE', 'New Class: [SHADOW MONARCH]. Skill [Shadow Extraction] unlocked.', 'monarch');
      }
      saveState(state);
      return state as T;
    }

    case '/api/player/settings': {
      if (body.username !== undefined) state.profile.username = String(body.username).trim().slice(0, 40) || 'Player';
      if (body.age !== undefined) state.profile.age = Number(body.age);
      if (body.heightCm !== undefined) state.profile.heightCm = Number(body.heightCm);
      if (body.weightKg !== undefined) state.profile.weightKg = Number(body.weightKg);
      if (body.fitnessGoal !== undefined) state.profile.fitnessGoal = body.fitnessGoal;
      if (body.timezone !== undefined) state.profile.timezone = body.timezone;
      if (body.activeTheme !== undefined) state.profile.activeTheme = body.activeTheme;
      if (body.soundEnabled !== undefined) state.profile.soundEnabled = Boolean(body.soundEnabled);
      if (body.animationsEnabled !== undefined) state.profile.animationsEnabled = Boolean(body.animationsEnabled);
      if (body.notificationsEnabled !== undefined) state.profile.notificationsEnabled = Boolean(body.notificationsEnabled);
      if (body.experienceLevel !== undefined) state.fitnessProfile.experienceLevel = body.experienceLevel;
      if (body.limitations !== undefined) state.fitnessProfile.limitations = body.limitations;
      saveState(state);
      return state as T;
    }

    case '/api/player/notifications/read': {
      for (const n of state.notifications) n.readStatus = true;
      saveState(state);
      return state as T;
    }

    default:
      throw new Error(`Unsupported local action: ${path}`);
  }
}
