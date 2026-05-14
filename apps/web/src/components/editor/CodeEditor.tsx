import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useProjectStore } from '@/stores/project';
import { api } from '@/lib/api';
import { isLikelyAIPaste } from '@/stores/paste-guard';

function languageFor(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.html')) return 'html';
  return 'plaintext';
}

interface Props {
  onInlineHint?: (hint: string) => void;
  onPasteBlocked?: () => void;
}

export function CodeEditor({ onInlineHint, onPasteBlocked }: Props) {
  const project = useProjectStore((s) => s.project);
  const activeFile = useProjectStore((s) => s.activeFile);
  const setFile = useProjectStore((s) => s.setFile);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const debounceRef = useRef<number | null>(null);
  const saveRef = useRef<number | null>(null);
  const hintRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (saveRef.current) window.clearTimeout(saveRef.current);
    if (hintRef.current) window.clearTimeout(hintRef.current);
  }, []);

  const handleMount: OnMount = (editor, monacoApi) => {
    editorRef.current = editor;
    monacoApi.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monacoApi.languages.typescript.ScriptTarget.ES2020,
      jsx: monacoApi.languages.typescript.JsxEmit.React,
      esModuleInterop: true,
      allowNonTsExtensions: true,
      moduleResolution: monacoApi.languages.typescript.ModuleResolutionKind.NodeJs,
    });
    monacoApi.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    editor.onDidPaste(() => {
      const sel = editor.getSelection();
      if (!sel) return;
      const text = editor.getModel()?.getValueInRange(sel) ?? '';
      if (isLikelyAIPaste(text)) {
        editor.trigger('paste-guard', 'undo', null);
        onPasteBlocked?.();
      }
    });
  };

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No project loaded.
      </div>
    );
  }

  const value = project.files[activeFile] ?? '';

  return (
    <Editor
      key={activeFile}
      theme="vs-dark"
      language={languageFor(activeFile)}
      value={value}
      onMount={handleMount}
      onChange={(v) => {
        const next = v ?? '';
        setFile(activeFile, next);

        if (saveRef.current) window.clearTimeout(saveRef.current);
        saveRef.current = window.setTimeout(() => {
          void api.updateProject(project.id, { files: { [activeFile]: next } });
        }, 500);

        if (onInlineHint) {
          if (hintRef.current) window.clearTimeout(hintRef.current);
          hintRef.current = window.setTimeout(() => {
            const pos = editorRef.current?.getPosition();
            const model = editorRef.current?.getModel();
            if (!pos || !model) return;
            const cursor = model.getOffsetAt(pos);
            void api
              .inlineHint({ projectId: project.id, file: activeFile, code: next, cursor })
              .then((r) => onInlineHint(r.hint));
          }, 1200);
        }
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        lineNumbers: 'on',
        renderLineHighlight: 'gutter',
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
