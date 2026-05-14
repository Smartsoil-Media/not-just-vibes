import { z } from 'zod';
import { aiSource } from './tutor.js';

export const chatRole = z.enum(['user', 'assistant', 'system']);
export type ChatRole = z.infer<typeof chatRole>;

export const chatMessage = z.object({
  id: z.string(),
  projectId: z.string(),
  role: chatRole,
  source: aiSource.nullable(),
  content: z.string(),
  createdAt: z.number(),
});
export type ChatMessage = z.infer<typeof chatMessage>;
