import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AISource } from '@njv/shared';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  source: AISource | null;
  content: string;
  /** ai-code blocks revealed line-by-line within this message */
  revealed: Record<number, number>;
  streaming?: boolean;
}

interface TutorState {
  messages: TutorMessage[];
  push: (m: Omit<TutorMessage, 'id' | 'revealed'> & Partial<Pick<TutorMessage, 'revealed'>>) => string;
  appendToken: (id: string, t: string) => void;
  endStream: (id: string) => void;
  reveal: (id: string, blockIndex: number) => void;
  reset: () => void;
}

export const useTutorStore = create<TutorState>((set) => ({
  messages: [],
  push: (m) => {
    const id = nanoid(10);
    set((s) => ({
      messages: [
        ...s.messages,
        { id, revealed: {}, streaming: m.role === 'assistant', ...m },
      ],
    }));
    return id;
  },
  appendToken: (id, t) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + t } : m)),
    })),
  endStream: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
    })),
  reveal: (id, blockIndex) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              revealed: { ...m.revealed, [blockIndex]: (m.revealed[blockIndex] ?? 0) + 1 },
            }
          : m,
      ),
    })),
  reset: () => set({ messages: [] }),
}));
