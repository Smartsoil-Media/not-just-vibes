import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, type Edge, type Node } from 'react-flow-renderer';
import type { SkillState } from '@njv/shared';
import { skills } from '@njv/skills-catalog';
import { api } from '@/lib/api';
import { useProjectStore } from '@/stores/project';

const COLUMNS = ['language', 'types', 'react', 'state', 'async', 'testing', 'tooling'] as const;

function colorFor(level: SkillState['level'] | 'unseen') {
  switch (level) {
    case 'mastered':
      return '#10b981';
    case 'practiced':
      return '#60a5fa';
    case 'introduced':
      return '#f59e0b';
    default:
      return '#374151';
  }
}

export function SkillTree() {
  const project = useProjectStore((s) => s.project);
  const [state, setState] = useState<SkillState[]>([]);

  useEffect(() => {
    if (!project) return;
    const tick = () => api.skillsState(project.id).then(setState).catch(() => {});
    tick();
    const t = window.setInterval(tick, 5000);
    return () => window.clearInterval(t);
  }, [project?.id]);

  const byId = useMemo(() => Object.fromEntries(state.map((s) => [s.skillId, s])), [state]);

  const nodes: Node[] = useMemo(() => {
    const byCat = new Map<string, number>();
    return skills.map((s) => {
      const colIdx = COLUMNS.indexOf(s.category as typeof COLUMNS[number]);
      const rowIdx = byCat.get(s.category) ?? 0;
      byCat.set(s.category, rowIdx + 1);
      const lvl = byId[s.id]?.level ?? 'unseen';
      return {
        id: s.id,
        position: { x: colIdx * 170, y: rowIdx * 70 },
        data: { label: s.name },
        style: {
          background: colorFor(lvl),
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: 11,
          width: 150,
          padding: 6,
        },
      };
    });
  }, [byId]);

  const edges: Edge[] = useMemo(
    () =>
      skills.flatMap((s) =>
        s.prerequisites.map((p) => ({
          id: `${p}->${s.id}`,
          source: p,
          target: s.id,
          style: { stroke: '#4b5563', strokeWidth: 1 },
        })),
      ),
    [],
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Start a project to track skills.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} fitView panOnDrag zoomOnScroll>
        <Background gap={20} color="#1f2937" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
