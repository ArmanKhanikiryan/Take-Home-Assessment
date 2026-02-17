import CodeMirror from '@uiw/react-codemirror';
import { go } from '@codemirror/lang-go';
import { oneDark } from '@codemirror/theme-one-dark';
import { useQuery } from '@tanstack/react-query';
import { fetchSource, fetchFunction } from '../api/client';
import { useAppStore } from '../store';

export default function SourcePanel() {
  const { selectedNodeId } = useAppStore();

  const { data: nodeData } = useQuery({
    queryKey: ['function', selectedNodeId],
    queryFn: () => fetchFunction(selectedNodeId!),
    enabled: !!selectedNodeId,
  });

  const { data: sourceData, isLoading } = useQuery({
    queryKey: ['source', selectedNodeId],
    queryFn: () => fetchSource(selectedNodeId!),
    enabled: !!selectedNodeId,
  });

  if (!selectedNodeId) return (
    <div className="w-[380px] shrink-0 flex items-center justify-center border-l border-[#30363d] bg-[#0d1117] text-[#8b949e] text-[13px]">
      <p>Click a node to view source</p>
    </div>
  );

  if (isLoading) return (
    <div className="w-[380px] shrink-0 flex items-center justify-center border-l border-[#30363d] bg-[#0d1117]">
      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const node = nodeData as {
    name?: string; package?: string; file?: string | null; line?: number | null;
    cyclomatic_complexity?: number; fan_in?: number; fan_out?: number; loc?: number;
  } | undefined;

  return (
    <div className="w-[380px] shrink-0 flex flex-col overflow-hidden border-l border-[#30363d] bg-[#0d1117]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
        <div className="text-[13px] font-semibold text-[#e6edf3] mb-1">{node?.name ?? '—'}</div>
        <div className="text-[11px] text-[#8b949e] mb-2">{node?.package}</div>
        {node?.file && (
          <div className="text-[10px] text-[#58a6ff] font-mono">
            {node.file}{node?.line ? `:${node.line}` : ''}
          </div>
        )}
        {node?.cyclomatic_complexity != null && (
          <div className="flex gap-3 mt-2">
            <Metric label="CC" value={node.cyclomatic_complexity} color={node.cyclomatic_complexity > 10 ? '#f85149' : '#3fb950'} />
            <Metric label="Fan-in" value={node.fan_in} color="#58a6ff" />
            <Metric label="Fan-out" value={node.fan_out} color="#d29922" />
            <Metric label="LOC" value={node.loc} color="#8b949e" />
          </div>
        )}
      </div>

      {/* Source code */}
      <div className="flex-1 overflow-auto">
        {sourceData?.source ? (
          <CodeMirror
            value={sourceData.source}
            extensions={[go()]}
            theme={oneDark}
            editable={false}
            basicSetup={{ lineNumbers: true, foldGutter: false, searchKeymap: false }}
            style={{ fontSize: 12, height: '100%' }}
          />
        ) : (
          <div className="p-4 text-[#8b949e] text-xs italic">
            Source not available
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number | null | undefined; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span style={{ color }} className="font-bold text-[13px]">{value ?? '—'}</span>
      <span className="text-[#8b949e] text-[10px]">{label}</span>
    </div>
  );
}
