import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import {
  breakdownRequest,
  breakdownResult,
  commitReviewRequest,
  stuckRequest,
  inlineHintRequest,
} from '@njv/shared';
import { schema } from '../db/client.js';
import {
  BREAKDOWN_SYSTEM,
  COMMIT_REVIEW_SYSTEM,
  STUCK_SYSTEM_LEVELS,
  TUTOR_SYSTEM,
  renderFileTree,
  renderFiles,
} from '../ai/prompts.js';
import { clampCodeBlocks, tryParseJson } from '../ai/postprocess.js';
import { streamFromAsyncIterable } from '../lib/sse.js';
import { route } from '../ai/router.js';
import type { Deps } from '../types.js';

export function createTutorRouter({ db, ai }: Deps) {
  const router = new Hono();

  async function persistMessage(
    projectId: string,
    role: 'user' | 'assistant',
    source: 'local' | 'cloud' | null,
    content: string,
  ) {
    await db.insert(schema.chatMessages).values({
      id: nanoid(10),
      projectId,
      role,
      source,
      content,
      createdAt: Date.now(),
    });
  }

  router.post('/breakdown', async (c) => {
    const parsed = breakdownRequest.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const userMsg = `Project goal:\n${parsed.data.goal}\n\nTemplate: ${parsed.data.template ?? 'none'}`;
    const raw = await ai.cloudComplete(
      [{ text: BREAKDOWN_SYSTEM, cache: true }],
      userMsg,
      { maxTokens: 1500 },
    );
    const json = tryParseJson(raw);
    const validated = breakdownResult.safeParse(json);
    if (!validated.success) {
      return c.json({ error: 'breakdown_parse_failed', raw }, 502);
    }
    return c.json(validated.data);
  });

  router.post('/stuck', async (c) => {
    const parsed = stuckRequest.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const level = parsed.data.level;
    const source = route({ kind: 'stuck', level });
    const system = STUCK_SYSTEM_LEVELS[level];
    const userMsg = [
      `Current file: ${parsed.data.currentFile}`,
      parsed.data.question ? `User question: ${parsed.data.question}` : '',
      `Project tree:\n${renderFileTree(parsed.data.files)}`,
      `Current file contents:\n${parsed.data.files[parsed.data.currentFile] ?? ''}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    await persistMessage(
      parsed.data.projectId,
      'user',
      null,
      `[I'm stuck L${level}] ${parsed.data.question ?? ''}`,
    );

    const iter =
      source === 'local'
        ? ai.localStream(system, userMsg)
        : ai.cloudStream([{ text: system, cache: true }], userMsg, { maxTokens: 1024 });

    return streamFromAsyncIterable(c, iter, {
      onDone: (full) =>
        persistMessage(parsed.data.projectId, 'assistant', source, clampCodeBlocks(full)),
    });
  });

  router.post('/inline-hint', async (c) => {
    const parsed = inlineHintRequest.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const before = parsed.data.code.slice(
      Math.max(0, parsed.data.cursor - 400),
      parsed.data.cursor,
    );
    const after = parsed.data.code.slice(parsed.data.cursor, parsed.data.cursor + 200);
    const text = await ai.localComplete(
      `${TUTOR_SYSTEM}\nReply with ONE short sentence (max 18 words) suggesting the next concept or check. No code.`,
      `File: ${parsed.data.file}\nBefore cursor:\n${before}\n[CURSOR]\nAfter cursor:\n${after}`,
      { temperature: 0.3 },
    );
    return c.json({ hint: clampCodeBlocks(text.trim()) });
  });

  router.post('/commit-review', async (c) => {
    const parsed = commitReviewRequest.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const project = (
      await db.select().from(schema.projects).where(eq(schema.projects.id, parsed.data.projectId))
    )[0];
    const goal = project?.goal ?? '(unknown)';

    await persistMessage(parsed.data.projectId, 'user', null, '[Commit to AI]');

    const iter = ai.cloudStream(
      [
        { text: COMMIT_REVIEW_SYSTEM, cache: true },
        { text: `Project goal: ${goal}`, cache: true },
        { text: `File tree:\n${renderFileTree(parsed.data.files)}`, cache: true },
        { text: `Full codebase:\n${renderFiles(parsed.data.files)}`, cache: true },
      ],
      parsed.data.focus ?? 'Do a thorough review of the project so far.',
      { maxTokens: 2048 },
    );
    return streamFromAsyncIterable(c, iter, {
      onDone: (full) =>
        persistMessage(parsed.data.projectId, 'assistant', 'cloud', clampCodeBlocks(full)),
    });
  });

  router.get('/messages/:projectId', async (c) => {
    const id = c.req.param('projectId');
    const rows = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.projectId, id))
      .orderBy(schema.chatMessages.createdAt);
    return c.json(rows);
  });

  return router;
}
