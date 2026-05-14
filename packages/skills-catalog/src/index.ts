export type SkillCategory =
  | 'language'
  | 'react'
  | 'state'
  | 'async'
  | 'types'
  | 'testing'
  | 'tooling';

export interface SkillDef {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  prerequisites: string[];
  /**
   * A short instruction given to the local LLM to detect this skill in a diff.
   * Kept terse so the prompt stays cheap.
   */
  detectorHint: string;
}

export const skills: SkillDef[] = [
  {
    id: 'js.variables',
    name: 'Variables & scope',
    category: 'language',
    description: 'Declaring and using let/const correctly.',
    prerequisites: [],
    detectorHint: 'declares variables with let/const with meaningful names',
  },
  {
    id: 'js.functions',
    name: 'Functions',
    category: 'language',
    description: 'Declares and calls functions, including arrow functions.',
    prerequisites: ['js.variables'],
    detectorHint: 'declares functions or arrow functions and invokes them',
  },
  {
    id: 'js.control-flow',
    name: 'Control flow',
    category: 'language',
    description: 'if/else, loops, early returns.',
    prerequisites: ['js.functions'],
    detectorHint: 'uses if/else, for/while, or early-return patterns',
  },
  {
    id: 'js.array-methods',
    name: 'Array methods',
    category: 'language',
    description: 'map / filter / reduce / find used idiomatically.',
    prerequisites: ['js.functions'],
    detectorHint: 'uses Array#map/filter/reduce/find on real data',
  },
  {
    id: 'ts.basic-types',
    name: 'TypeScript basics',
    category: 'types',
    description: 'Primitive types and function signatures.',
    prerequisites: ['js.functions'],
    detectorHint: 'annotates parameters/returns with primitive TS types',
  },
  {
    id: 'ts.interfaces',
    name: 'Interfaces & object types',
    category: 'types',
    description: 'Models data shapes with interface/type aliases.',
    prerequisites: ['ts.basic-types'],
    detectorHint: 'declares interface or type alias for object shapes',
  },
  {
    id: 'ts.generics',
    name: 'Generics',
    category: 'types',
    description: 'Parameterized types in functions or components.',
    prerequisites: ['ts.interfaces'],
    detectorHint: 'declares a generic type parameter <T> on function/component',
  },
  {
    id: 'react.jsx',
    name: 'JSX & rendering',
    category: 'react',
    description: 'Writes JSX with expressions and conditional rendering.',
    prerequisites: ['js.functions'],
    detectorHint: 'returns JSX with expressions or conditional rendering',
  },
  {
    id: 'react.props',
    name: 'Props',
    category: 'react',
    description: 'Passes and types component props.',
    prerequisites: ['react.jsx', 'ts.interfaces'],
    detectorHint: 'destructures typed props in a component signature',
  },
  {
    id: 'react.useState',
    name: 'useState',
    category: 'react',
    description: 'Local state with useState.',
    prerequisites: ['react.jsx'],
    detectorHint: 'imports and calls useState with a sensible initial value',
  },
  {
    id: 'react.useEffect',
    name: 'useEffect',
    category: 'react',
    description: 'Side effects with dependency arrays.',
    prerequisites: ['react.useState'],
    detectorHint: 'imports useEffect with a dependency array',
  },
  {
    id: 'react.events',
    name: 'Event handling',
    category: 'react',
    description: 'onClick / onChange handlers with proper types.',
    prerequisites: ['react.jsx'],
    detectorHint: 'attaches onClick/onChange handler with typed event',
  },
  {
    id: 'react.lists',
    name: 'Rendering lists',
    category: 'react',
    description: 'Maps arrays to elements with stable keys.',
    prerequisites: ['react.jsx', 'js.array-methods'],
    detectorHint: 'renders array via .map() with key prop',
  },
  {
    id: 'state.lifting',
    name: 'Lifting state up',
    category: 'state',
    description: 'Shared state moved to a common ancestor.',
    prerequisites: ['react.props', 'react.useState'],
    detectorHint: 'state declared in parent, handlers passed down as props',
  },
  {
    id: 'async.promises',
    name: 'Promises & async/await',
    category: 'async',
    description: 'awaits async work and handles results.',
    prerequisites: ['js.functions'],
    detectorHint: 'declares async function and uses await on a promise',
  },
  {
    id: 'async.fetch',
    name: 'fetch & JSON',
    category: 'async',
    description: 'Calls an HTTP endpoint and parses JSON.',
    prerequisites: ['async.promises'],
    detectorHint: 'calls fetch and parses response.json()',
  },
  {
    id: 'async.error-handling',
    name: 'Error handling',
    category: 'async',
    description: 'try/catch around async or risky code.',
    prerequisites: ['async.promises'],
    detectorHint: 'wraps await calls in try/catch and handles the error',
  },
  {
    id: 'testing.basics',
    name: 'Unit tests',
    category: 'testing',
    description: 'Writes a simple test with assertions.',
    prerequisites: ['js.functions'],
    detectorHint: 'writes a test() / it() block with expect()',
  },
];

export const skillById: Record<string, SkillDef> = Object.fromEntries(
  skills.map((s) => [s.id, s]),
);

export const skillIds: string[] = skills.map((s) => s.id);
