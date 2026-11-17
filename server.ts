import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  acceptOrCompleteEmergencyQuest,
  advanceJobChangeStage,
  allocateStatPoint,
  claimDailyQuestRewards,
  claimSpecialQuest,
  completeOnboarding,
  equipTitle,
  getFullPlayerState,
  logMissionProgress,
  markNotificationsRead,
  openLootBox,
  purchaseShopItem,
  switchDifficultyMode,
  toggleRecoveryOverride,
  triggerPenaltySimulation,
  unlockOrUpgradeSkill,
  updateSettings,
  useOrEquipInventoryItem,
} from './src/db/systemService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'the-system' });
  });

  async function resolveUser(req: AuthRequest) {
    if (!req.user?.uid) {
      throw new Error('Unauthorized');
    }
    return await getOrCreateUser(req.user.uid, req.user.email || `${req.user.uid}@player.system`);
  }

  app.get('/api/player/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const state = await getFullPlayerState(user.id);
      res.json(state);
    } catch (error: any) {
      console.error('GET /api/player/state error:', error);
      res.status(500).json({ error: error.message || 'Failed to load player state' });
    }
  });

  app.post('/api/player/onboarding', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const state = await completeOnboarding(user.id, req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Onboarding failed' });
    }
  });

  app.post('/api/player/quest/progress', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { questId, missionId, amount } = req.body;
      const state = await logMissionProgress(user.id, Number(questId), Number(missionId), Number(amount));
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update mission progress' });
    }
  });

  app.post('/api/player/quest/claim', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { questId } = req.body;
      const result = await claimDailyQuestRewards(user.id, Number(questId));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to claim rewards' });
    }
  });

  app.post('/api/player/quest/difficulty', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { questId, mode, customTargets } = req.body;
      const state = await switchDifficultyMode(user.id, Number(questId), mode, customTargets);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to change difficulty' });
    }
  });

  app.post('/api/player/quest/recovery', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { questId, enabled } = req.body;
      const state = await toggleRecoveryOverride(user.id, Number(questId), Boolean(enabled));
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update recovery override' });
    }
  });

  app.post('/api/player/quest/penalty-event', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { questId } = req.body;
      const state = await triggerPenaltySimulation(user.id, Number(questId));
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to trigger penalty event' });
    }
  });

  app.post('/api/player/status/allocate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { stat, amount } = req.body;
      const state = await allocateStatPoint(user.id, stat, Number(amount) || 1);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to allocate stat points' });
    }
  });

  app.post('/api/player/inventory/open-box', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const result = await openLootBox(user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to open loot box' });
    }
  });

  app.post('/api/player/inventory/use', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { itemId } = req.body;
      const state = await useOrEquipInventoryItem(user.id, itemId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to use item' });
    }
  });

  app.post('/api/player/shop/buy', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { itemId } = req.body;
      const state = await purchaseShopItem(user.id, itemId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Purchase failed' });
    }
  });

  app.post('/api/player/skills/upgrade', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { skillId } = req.body;
      const state = await unlockOrUpgradeSkill(user.id, skillId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Skill upgrade failed' });
    }
  });

  app.post('/api/player/titles/equip', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { titleId } = req.body;
      const state = await equipTitle(user.id, titleId);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to equip title' });
    }
  });

  app.post('/api/player/special-quests/claim', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { specialQuestId } = req.body;
      const state = await claimSpecialQuest(user.id, Number(specialQuestId));
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to claim special quest' });
    }
  });

  app.post('/api/player/special-quests/emergency', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const { action, specialQuestId } = req.body;
      const state = await acceptOrCompleteEmergencyQuest(
        user.id,
        action,
        specialQuestId ? Number(specialQuestId) : undefined
      );
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Emergency quest error' });
    }
  });

  app.post('/api/player/special-quests/job-change', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const state = await advanceJobChangeStage(user.id);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Job change trial error' });
    }
  });

  app.post('/api/player/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const state = await updateSettings(user.id, req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Settings update failed' });
    }
  });

  app.post('/api/player/notifications/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUser(req);
      const state = await markNotificationsRead(user.id);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to mark notifications read' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`THE SYSTEM server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
