import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { detectSkillsRequest, detectSkillsResult } from '@njv/shared';
import { skillById, skills } from '@njv/skills-catalog';
import { schema } from '../db/client.js';
import { SIDE_QUEST_SYSTEM, SKILL_DETECT_SYSTEM } from '../ai/prompts.js';
import { tryParseJson } from '../ai/postprocess.js';
import type { Deps } from '../types.js';

function nextLevel(level: string, confidence: number): 'introduced' | 'practiced' | 'mastered' {
  if (level === 'mastered') return 'mastered';
  if (confidence >= 0.85 && (level === 'practiced' || level === 'introduced')) return 'mastered';
  if (level === 'introduced') return 'practiced';
  return 'introduced';
}

export function createSkillsRouter({ db, ai }: Deps) {
  const router = new Hono();

  router.get('/catalog', (c) => c.json(skills));

  router.get('/state/:projectId', async (c) => {
    const id = c.req.param('projectId');
    const rows = await db
      .select()
      .from(schema.skillsState)
      .where(eq(schema.skillsState.projectId, id));
    return c.json(rows);
  });

  router.post('/detect', async (c) => {
    const parsed = detectSkillsRequest.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const raw = await ai.localComplete(
      SKILL_DETECT_SYSTEM,
      `Diff:\n${parsed.data.diff}\n\nCurrent files (for reference):\n${Object.entries(
        parsed.data.files,
      )
        .map(([p, c2]) => `--- ${p} ---\n${c2}`)
        .join('\n\n')}`,
      { json: true, temperature: 0.1 },
    );
    const json = tryParseJson(raw);
    const v = detectSkillsResult.safeParse(json);
    if (!v.success) return c.json({ detected: [] });

    const now = Date.now();
    const filtered = v.data.detected.filter((d) => skillById[d.skillId]);

    for (const d of filtered) {
      const existing = (
        await db
          .select()
          .from(schema.skillsState)
          .where(
            and(
              eq(schema.skillsState.projectId, parsed.data.projectId),
              eq(schema.skillsState.skillId, d.skillId),
            ),
          )
      )[0];
      const newLevel = nextLevel(existing?.level ?? 'unseen', d.confidence);
      const newConfidence = Math.max(existing?.confidence ?? 0, d.confidence);
      await db
        .insert(schema.skillsState)
        .values({
          projectId: parsed.data.projectId,
          skillId: d.skillId,
          level: newLevel,
          confidence: newConfidence,
          lastSeen: now,
        })
        .onConflictDoUpdate({
          target: [schema.skillsState.projectId, schema.skillsState.skillId],
          set: { level: newLevel, confidence: newConfidence, lastSeen: now },
        });
    }

    return c.json({ detected: filtered });
  });

  router.post('/side-quest', async (c) => {
    const body = (await c.req.json()) as { projectId: string; skillId: string };
    const skill = skillById[body.skillId];
    if (!skill) return c.json({ error: 'unknown_skill' }, 400);
    const raw = await ai.localComplete(
      SIDE_QUEST_SYSTEM,
      `Generate a side quest that practices: ${skill.name} (${skill.description}). Detector hint: ${skill.detectorHint}.`,
      { json: true, temperature: 0.6 },
    );
    const json = tryParseJson<{ title?: string; prompt?: string }>(raw);
    if (!json?.title || !json?.prompt) return c.json({ error: 'parse_failed' }, 502);
    const id = nanoid(10);
    await db.insert(schema.sideQuests).values({
      id,
      projectId: body.projectId,
      skillId: body.skillId,
      title: json.title,
      prompt: json.prompt,
      status: 'open',
    });
    return c.json({ id, title: json.title, prompt: json.prompt, skillId: body.skillId });
  });

  router.get('/side-quests/:projectId', async (c) => {
    const rows = await db
      .select()
      .from(schema.sideQuests)
      .where(eq(schema.sideQuests.projectId, c.req.param('projectId')));
    return c.json(rows);
  });

  router.patch('/side-quests/:id', async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json()) as { status: 'open' | 'done' | 'skipped' };
    await db
      .update(schema.sideQuests)
      .set({ status: body.status })
      .where(eq(schema.sideQuests.id, id));
    return c.json({ ok: true });
  });

  return router;
}
