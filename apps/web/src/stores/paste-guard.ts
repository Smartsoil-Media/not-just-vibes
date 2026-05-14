/**
 * Tracks recently-revealed AI snippets. If the editor sees a paste whose
 * normalized content matches any of these, it nudges the user to type it themselves.
 * Lives outside React state because it's pure side-channel data the Monaco handler reads.
 */
const recent: { text: string; at: number }[] = [];
const TTL_MS = 10 * 60 * 1000;

function norm(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function rememberAISnippet(text: string) {
  recent.push({ text: norm(text), at: Date.now() });
  prune();
}

export function isLikelyAIPaste(pasted: string): boolean {
  const needle = norm(pasted);
  if (needle.length < 12) return false;
  prune();
  return recent.some((r) => r.text.includes(needle) || needle.includes(r.text));
}

function prune() {
  const cutoff = Date.now() - TTL_MS;
  while (recent.length && recent[0]!.at < cutoff) recent.shift();
}
