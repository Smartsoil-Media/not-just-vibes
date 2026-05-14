/**
 * Server-side belt-and-braces: cap fenced code blocks to at most 2 lines.
 * Web also enforces the reveal-one-line-at-a-time UI; this just prevents accidental large dumps.
 */
export function clampCodeBlocks(text: string, maxLines = 2): string {
  return text.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, lang: string, body: string) => {
    const lines = body.split('\n');
    if (lines.length <= maxLines) {
      return `\`\`\`${lang}\n${body}\`\`\``;
    }
    const truncated = lines.slice(0, maxLines).join('\n');
    return `\`\`\`${lang}\n${truncated}\n\`\`\`\n\n_(snippet trimmed — try the approach yourself first)_`;
  });
}

export function tryParseJson<T = unknown>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
