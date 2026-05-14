import { z } from 'zod';
import { fileMap } from './project.js';

export const progressStep = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'done']),
  order: z.number(),
});
export type ProgressStep = z.infer<typeof progressStep>;

export const stuckLevel = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type StuckLevel = z.infer<typeof stuckLevel>;

export const breakdownRequest = z.object({
  goal: z.string().min(1),
  template: z.string().nullable().optional(),
});
export type BreakdownRequest = z.infer<typeof breakdownRequest>;

export const breakdownResult = z.object({
  steps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  initialSkills: z.array(z.string()).default([]),
});
export type BreakdownResult = z.infer<typeof breakdownResult>;

export const stuckRequest = z.object({
  projectId: z.string(),
  level: stuckLevel,
  currentFile: z.string(),
  cursor: z.number().optional(),
  question: z.string().optional(),
  files: fileMap,
});
export type StuckRequest = z.infer<typeof stuckRequest>;

export const commitReviewRequest = z.object({
  projectId: z.string(),
  files: fileMap,
  focus: z.string().optional(),
});
export type CommitReviewRequest = z.infer<typeof commitReviewRequest>;

export const inlineHintRequest = z.object({
  projectId: z.string(),
  file: z.string(),
  code: z.string(),
  cursor: z.number(),
});
export type InlineHintRequest = z.infer<typeof inlineHintRequest>;

export const aiSource = z.enum(['local', 'cloud']);
export type AISource = z.infer<typeof aiSource>;
