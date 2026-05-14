import type { FileMap } from '@njv/shared';

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  entry: string;
  goalHint: string;
  files: FileMap;
}

const blankFiles: FileMap = {
  '/App.tsx': `export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Hello!</h1>
      <p>Edit <code>/App.tsx</code> to start building.</p>
    </main>
  );
}
`,
};

const counterFiles: FileMap = {
  '/App.tsx': `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  // TODO: add a decrement button
  // TODO: don't let count go below 0
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </main>
  );
}
`,
};

const todoFiles: FileMap = {
  '/App.tsx': `import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');

  // TODO: implement addTodo
  // TODO: implement toggleTodo
  // TODO: render the list with map() and a stable key

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 480 }}>
      <h1>Todo</h1>
      <form onSubmit={(e) => { e.preventDefault(); /* addTodo */ }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {/* TODO: render todos */}
      </ul>
    </main>
  );
}
`,
};

const fetchFiles: FileMap = {
  '/App.tsx': `import { useEffect, useState } from 'react';

interface Joke {
  setup: string;
  punchline: string;
}

export default function App() {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadJoke() {
    // TODO: setLoading(true), fetch, parse json, setJoke, handle errors, setLoading(false)
  }

  useEffect(() => {
    loadJoke();
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Joke of the moment</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {joke && (
        <article>
          <p>{joke.setup}</p>
          <p><strong>{joke.punchline}</strong></p>
        </article>
      )}
      <button onClick={loadJoke}>Another</button>
    </main>
  );
}
`,
};

export const templates: TemplateDef[] = [
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'Start from a single component.',
    entry: '/App.tsx',
    goalHint: 'Describe what you want to build.',
    files: blankFiles,
  },
  {
    id: 'counter',
    name: 'Counter',
    description: 'A tiny stateful component, with TODOs to extend.',
    entry: '/App.tsx',
    goalHint: 'Add decrement, clamp at zero, then a reset button.',
    files: counterFiles,
  },
  {
    id: 'todo',
    name: 'Todo list',
    description: 'Lifting state, lists with keys, controlled inputs.',
    entry: '/App.tsx',
    goalHint: 'Build a working todo list with add, toggle, and delete.',
    files: todoFiles,
  },
  {
    id: 'fetch',
    name: 'Fetch & display',
    description: 'Async data, useEffect, loading + error states.',
    entry: '/App.tsx',
    goalHint: 'Load jokes from https://official-joke-api.appspot.com/random_joke',
    files: fetchFiles,
  },
];

export const templateById: Record<string, TemplateDef> = Object.fromEntries(
  templates.map((t) => [t.id, t]),
);
