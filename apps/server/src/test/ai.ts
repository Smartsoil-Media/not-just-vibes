import type { AIClient, CachedSystemBlock } from '../types.js';

export interface CallLog {
  localComplete: Array<{ system: string; user: string; opts: unknown }>;
  localStream: Array<{ system: string; user: string; opts: unknown }>;
  cloudComplete: Array<{ blocks: CachedSystemBlock[]; user: string; opts: unknown }>;
  cloudStream: Array<{ blocks: CachedSystemBlock[]; user: string; opts: unknown }>;
}

export interface MockAIOptions {
  localComplete?: (system: string, user: string) => string | Promise<string>;
  localStream?: (system: string, user: string) => string[] | Promise<string[]>;
  cloudComplete?: (blocks: CachedSystemBlock[], user: string) => string | Promise<string>;
  cloudStream?: (blocks: CachedSystemBlock[], user: string) => string[] | Promise<string[]>;
}

export interface MockAI {
  ai: AIClient;
  calls: CallLog;
}

async function* fromArray(items: string[]): AsyncGenerator<string> {
  for (const it of items) yield it;
}

/**
 * Builds a mock AIClient with configurable response generators.
 * Defaults return empty/sensible values so tests only override what they care about.
 */
export function mockAI(opts: MockAIOptions = {}): MockAI {
  const calls: CallLog = {
    localComplete: [],
    localStream: [],
    cloudComplete: [],
    cloudStream: [],
  };

  const ai: AIClient = {
    async localComplete(system, user, options) {
      calls.localComplete.push({ system, user, opts: options });
      return opts.localComplete ? Promise.resolve(opts.localComplete(system, user)) : '';
    },
    async *localStream(system, user, options) {
      calls.localStream.push({ system, user, opts: options });
      const chunks = opts.localStream ? await opts.localStream(system, user) : [];
      yield* fromArray(chunks);
    },
    async cloudComplete(blocks, user, options) {
      calls.cloudComplete.push({ blocks, user, opts: options });
      return opts.cloudComplete ? Promise.resolve(opts.cloudComplete(blocks, user)) : '';
    },
    async *cloudStream(blocks, user, options) {
      calls.cloudStream.push({ blocks, user, opts: options });
      const chunks = opts.cloudStream ? await opts.cloudStream(blocks, user) : [];
      yield* fromArray(chunks);
    },
  };

  return { ai, calls };
}
