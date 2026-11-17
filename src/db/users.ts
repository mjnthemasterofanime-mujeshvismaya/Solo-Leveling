import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  fitnessProfiles,
  playerStatus,
  profiles,
  skills,
  specialQuests,
  titles,
  users,
} from './schema.ts';
import { MAIN_QUEST_TEMPLATES } from '../shared/systemData.ts';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const [user] = await db
      .insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    });

    if (!existingProfile) {
      await db
        .insert(profiles)
        .values({
          userId: user.id,
          username: email.split('@')[0] || 'Player',
        })
        .onConflictDoNothing();
    }

    const existingStatus = await db.query.playerStatus.findFirst({
      where: eq(playerStatus.userId, user.id),
    });

    if (!existingStatus) {
      await db
        .insert(playerStatus)
        .values({
          userId: user.id,
        })
        .onConflictDoNothing();
    }

    const existingFitness = await db.query.fitnessProfiles.findFirst({
      where: eq(fitnessProfiles.userId, user.id),
    });

    if (!existingFitness) {
      await db
        .insert(fitnessProfiles)
        .values({
          userId: user.id,
        })
        .onConflictDoNothing();
    }

    const existingSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.userId, user.id));

    if (existingSkills.length === 0) {
      await db.insert(skills).values({
        userId: user.id,
        skillId: 'sprint',
        level: 1,
      });
    }

    const existingTitles = await db
      .select()
      .from(titles)
      .where(eq(titles.userId, user.id));

    if (existingTitles.length === 0) {
      await db.insert(titles).values({
        userId: user.id,
        titleId: 'the_awakened',
        equipped: true,
      });
    }

    const existingSpecials = await db
      .select()
      .from(specialQuests)
      .where(eq(specialQuests.userId, user.id));

    if (existingSpecials.length === 0) {
      for (const mq of MAIN_QUEST_TEMPLATES) {
        await db.insert(specialQuests).values({
          userId: user.id,
          questKey: mq.key,
          category: 'main',
          title: mq.title,
          description: mq.description,
          targetMetric: mq.targetMetric,
          targetValue: mq.targetValue,
          progressValue: 0,
          status: 'active',
        });
      }
    }

    return user;
  } catch (error) {
    console.error('Failed to getOrCreateUser:', error);
    throw new Error('Failed to synchronize player account.', { cause: error });
  }
}
