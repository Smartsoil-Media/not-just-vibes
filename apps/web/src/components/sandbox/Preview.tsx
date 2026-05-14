import { Suspense, lazy, useMemo } from 'react';
import { useProjectStore } from '@/stores/project';

const SandpackImpl = lazy(() =>
  import('./SandpackImpl').then((m) => ({ default: m.SandpackImpl })),
);

export function Preview() {
  const project = useProjectStore((s) => s.project);

  const files = useMemo(() => {
    if (!project) return {};
    const f: Record<string, string> = { ...project.files };
    if (!f['/index.tsx']) {
      f['/index.tsx'] = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '.${project.entry}';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
`;
    }
    return f;
  }, [project]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preview will appear when a project is loaded.
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading sandbox…
        </div>
      }
    >
      <SandpackImpl projectKey={project.id} files={files} />
    </Suspense>
  );
}
