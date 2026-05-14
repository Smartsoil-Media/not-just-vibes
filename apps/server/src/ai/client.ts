import type { AIClient } from '../types.js';
import { localComplete, localStream } from './local.js';
import { cloudComplete, cloudStream } from './cloud.js';

/**
 * Wires real OpenAI (local Ollama) + Anthropic clients into an AIClient.
 * Tests build their own AIClient stub instead of calling this.
 */
export function createAIClient(): AIClient {
  return {
    localComplete,
    localStream,
    cloudComplete,
    cloudStream,
  };
}
