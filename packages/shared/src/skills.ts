import { z } from 'zod';
import { fileMap } from './project.js';

export const skillLevel = z.enum(['unseen', 'introduced', 'practiced', 'mastered']);
export type SkillLevel = z.infer<typeof skillLevel>;

export const skillState = z.object({
  projectId: z.string(),
  skillId: z.string(),
  level: skillLevel,
  confidence: z.number().min(0).max(1),
  lastSeen: z.number(),
});
export type SkillState = z.infer<typeof skillState>;

export const detectSkillsRequest = z.object({
  projectId: z.string(),
  diff: z.string(),
  files: fileMap,
});
export type DetectSkillsRequest = z.infer<typeof detectSkillsRequest>;

export const detectedSkill = z.object({
  skillId: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional(),
});
export type DetectedSkill = z.infer<typeof detectedSkill>;

export const detectSkillsResult = z.object({
  detected: z.array(detectedSkill),
});
export type DetectSkillsResult = z.infer<typeof detectSkillsResult>;

export const sideQuest = z.object({
  id: z.string(),
  projectId: z.string(),
  skillId: z.string(),
  title: z.string(),
  prompt: z.string(),
  status: z.enum(['open', 'done', 'skipped']),
});
export type SideQuest = z.infer<typeof sideQuest>;
