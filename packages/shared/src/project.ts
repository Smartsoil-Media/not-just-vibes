import { z } from 'zod';

export const fileMap = z.record(z.string(), z.string());
export type FileMap = z.infer<typeof fileMap>;

export const projectFile = z.object({
  path: z.string(),
  content: z.string(),
});
export type ProjectFile = z.infer<typeof projectFile>;

export const project = z.object({
  id: z.string(),
  name: z.string(),
  goal: z.string(),
  template: z.string().nullable(),
  entry: z.string().default('/App.tsx'),
  files: fileMap,
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Project = z.infer<typeof project>;

export const createProjectInput = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  template: z.string().nullable().optional(),
  files: fileMap.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = z.object({
  name: z.string().optional(),
  goal: z.string().optional(),
  files: fileMap.optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;
