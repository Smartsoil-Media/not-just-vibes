import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackConsole,
} from '@codesandbox/sandpack-react';

interface Props {
  projectKey: string;
  files: Record<string, string>;
}

export function SandpackImpl({ projectKey, files }: Props) {
  return (
    <SandpackProvider
      key={projectKey}
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
