import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from './db/schema.js';

export type Db = LibSQLDatabase<typeof schema>;

export interface CachedSystemBlock {
  text: string;
  cache: boolean;
}

/**
 * The surface area of the AI clients that routes depend on.
 * Tests inject mock implementations; production wires in OpenAI + Anthropic.
 */
export interface AIClient {
  localComplete: (
    system: string,
    user: string,
    opts?: { json?: boolean; temperature?: number },
  ) => Promise<string>;
  localStream: (
    system: string,
    user: string,
    opts?: { temperature?: number },
  ) => AsyncIterable<string>;
  cloudComplete: (
    systemBlocks: CachedSystemBlock[],
    user: string,
    opts?: { maxTokens?: number },
  ) => Promise<string>;
  cloudStream: (
    systemBlocks: CachedSystemBlock[],
    user: string,
    opts?: { maxTokens?: number },
  ) => AsyncIterable<string>;
}

export interface Deps {
  db: Db;
  ai: AIClient;
}
