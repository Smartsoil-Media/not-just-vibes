import { create } from 'zustand';
import type { FileMap, Project } from '@njv/shared';

interface ProjectState {
  project: Project | null;
  activeFile: string;
  setProject: (p: Project | null) => void;
  setActiveFile: (p: string) => void;
  setFile: (path: string, content: string) => void;
  addFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  filesSnapshot: () => FileMap;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  activeFile: '/App.tsx',
  setProject: (p) =>
    set({
      project: p,
      activeFile: p ? (p.entry in p.files ? p.entry : Object.keys(p.files)[0] ?? '/App.tsx') : '/App.tsx',
    }),
  setActiveFile: (p) => set({ activeFile: p }),
  setFile: (path, content) =>
    set((s) =>
      s.project ? { project: { ...s.project, files: { ...s.project.files, [path]: content } } } : s,
    ),
  addFile: (path, content) =>
    set((s) =>
      s.project
        ? {
            project: { ...s.project, files: { ...s.project.files, [path]: content } },
            activeFile: path,
          }
        : s,
    ),
  removeFile: (path) =>
    set((s) => {
      if (!s.project) return s;
      const next = { ...s.project.files };
      delete next[path];
      const keys = Object.keys(next);
      return {
        project: { ...s.project, files: next },
        activeFile: s.activeFile === path ? keys[0] ?? '/App.tsx' : s.activeFile,
      };
    }),
  filesSnapshot: () => get().project?.files ?? {},
}));
