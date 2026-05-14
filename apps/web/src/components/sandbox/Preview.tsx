import { useMemo } from 'react';
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackConsole } from '@codesandbox/sandpack-react';
import { useProjectStore } from '@/stores/project';

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
    <SandpackProvider
      key={project.id}
      template="react-ts"
      theme="dark"
      files={files}
      options={{ recompileMode: 'delayed', recompileDelay: 600 }}
    >
      <SandpackLayout style={{ height: '100%', border: 'none' }}>
        <SandpackPreview style={{ height: '60%' }} showOpenInCodeSandbox={false} />
        <SandpackConsole style={{ height: '40%' }} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
