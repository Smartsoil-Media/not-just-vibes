import type {
  BreakdownResult,
  CreateProjectInput,
  DetectSkillsResult,
  FileMap,
  Project,
  ProgressStep,
  ChatMessage,
  SkillState,
  SideQuest,
  StuckLevel,
} from '@njv/shared';
import type { SkillDef } from '@njv/skills-catalog';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    json<{ ok: boolean; cloud: boolean; localBaseUrl: string; localModel: string }>('/health'),

  listTemplates: () =>
    json<
      Array<{
        id: string;
        name: string;
        description: string;
        goalHint: string;
        entry: string;
      }>
    >('/api/templates'),

  getTemplate: (id: string) =>
    json<{ id: string; name: string; description: string; entry: string; files: FileMap }>(
      `/api/templates/${id}`,
    ),

  listProjects: () =>
    json<Array<{ id: string; name: string; goal: string; updatedAt: number }>>('/api/projects'),

  createProject: (input: CreateProjectInput) =>
    json<{ id: string }>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),

  getProject: (id: string) => json<Project>(`/api/projects/${id}`),

  updateProject: (id: string, body: { files?: FileMap; name?: string; goal?: string }) =>
    json<{ ok: true }>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteProject: (id: string) => json<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' }),

  deleteFile: (id: string, path: string) =>
    json<{ ok: true }>(`/api/projects/${id}/files${path}`, { method: 'DELETE' }),

  breakdown: (goal: string, template: string | null) =>
    json<BreakdownResult>('/api/tutor/breakdown', {
      method: 'POST',
      body: JSON.stringify({ goal, template }),
    }),

  inlineHint: (input: { projectId: string; file: string; code: string; cursor: number }) =>
    json<{ hint: string }>('/api/tutor/inline-hint', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  chatHistory: (projectId: string) => json<ChatMessage[]>(`/api/tutor/messages/${projectId}`),

  skillsCatalog: () => json<SkillDef[]>('/api/skills/catalog'),
  skillsState: (projectId: string) => json<SkillState[]>(`/api/skills/state/${projectId}`),
  detectSkills: (input: { projectId: string; diff: string; files: FileMap }) =>
    json<DetectSkillsResult>('/api/skills/detect', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  generateSideQuest: (projectId: string, skillId: string) =>
    json<{ id: string; title: string; prompt: string; skillId: string }>(
      '/api/skills/side-quest',
      { method: 'POST', body: JSON.stringify({ projectId, skillId }) },
    ),
  sideQuests: (projectId: string) => json<SideQuest[]>(`/api/skills/side-quests/${projectId}`),

  progress: (projectId: string) => json<ProgressStep[]>(`/api/progress/${projectId}`),
  setProgress: (projectId: string, steps: { title: string; description: string }[]) =>
    json<{ ok: true }>(`/api/progress/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ steps }),
    }),
  updateStep: (projectId: string, stepId: string, status: 'pending' | 'in_progress' | 'done') =>
    json<{ ok: true }>(`/api/progress/${projectId}/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export async function* streamSSE(
  path: string,
  body: unknown,
  init: { signal?: AbortSignal } = {},
): AsyncGenerator<string> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: init.signal,
  });
  if (!res.ok || !res.body) throw new Error(`${path}: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = raw.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).replace(/^ /, '');
      }
      if (event === 'token' && data) yield data;
      if (event === 'done') return;
    }
  }
}

export interface StuckInput {
  projectId: string;
  level: StuckLevel;
  currentFile: string;
  files: FileMap;
  cursor?: number;
  question?: string;
}

export const streamStuck = (input: StuckInput, opts?: { signal?: AbortSignal }) =>
  streamSSE('/api/tutor/stuck', input, opts);

export const streamCommitReview = (
  input: { projectId: string; files: FileMap; focus?: string },
  opts?: { signal?: AbortSignal },
) => streamSSE('/api/tutor/commit-review', input, opts);
