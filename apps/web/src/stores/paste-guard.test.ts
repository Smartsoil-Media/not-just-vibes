import { describe, expect, it } from 'vitest';
import { isLikelyAIPaste, rememberAISnippet } from './paste-guard';

describe('paste-guard', () => {
  it('flags a previously-shown snippet on paste', () => {
    rememberAISnippet('const counter = useState(0);');
    expect(isLikelyAIPaste('const counter = useState(0);')).toBe(true);
  });

  it('ignores trivially-short pastes', () => {
    rememberAISnippet('x = 1');
    expect(isLikelyAIPaste('x = 1')).toBe(false);
  });

  it('matches even with whitespace differences', () => {
    rememberAISnippet('function add(a, b) { return a + b; }');
    expect(isLikelyAIPaste('function   add(a, b)\n{ return a + b; }')).toBe(true);
  });

  it('does not match unrelated content', () => {
    rememberAISnippet('export default function App() { return <div/>; }');
    expect(isLikelyAIPaste('console.log("hello world from somewhere else")')).toBe(false);
  });
});
