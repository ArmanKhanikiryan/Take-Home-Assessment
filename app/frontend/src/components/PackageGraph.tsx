import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useQuery } from '@tanstack/react-query';
import { fetchPackageGraph } from '../api/client';
import { useAppStore } from '../store';
import type { PackageNode } from '../types';

function moduleColor(pkg: string): { bg: string; border: string } {
  if (pkg.startsWith('tsdb')) return { bg: '#1a2744', border: '#58a6ff' };
  if (pkg.startsWith('promql')) return { bg: '#1f2d1f', border: '#3fb950' };
  if (pkg.startsWith('storage')) return { bg: '#2d1f1f', border: '#f85149' };
  if (pkg.startsWith('scrape')) return { bg: '#2a1f2d', border: '#bc8cff' };
  if (pkg.startsWith('rules')) return { bg: '#2d2a1f', border: '#d29922' };
  if (pkg.startsWith('web')) return { bg: '#1f2a2d', border: '#56d364' };
  if (pkg.includes('client_golang')) return { bg: '#1f2530', border: '#79b8ff' };
  if (pkg.startsWith('adapter')) return { bg: '#2d201f', border: '#ffa657' };
  if (pkg.startsWith('cmd')) return { bg: '#252525', border: '#8b949e' };
  return { bg: '#1e1e1e', border: '#484f58' };
}

const NODE_W = 160;
const NODE_H = 44;

function dagreLayout(
  pkgNodes: PackageNode[],
  edges: Array<{ source: string; target: string; weight: number }>
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70, marginx: 40, marginy: 40 });
  pkgNodes.forEach(p => g.setNode(p.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const maxWeight = Math.max(...edges.map(e => e.weight), 1);

  const rfNodes: Node[] = pkgNodes.map(p => {
    const pos = g.node(p.id);
    const { bg, border } = moduleColor(p.id);
    return {
      id: p.id,
      type: 'packageNode',
      data: { label: p.label, fullPath: p.id, function_count: p.function_count, total_complexity: p.total_complexity, border },
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      style: { width: NODE_W, height: NODE_H, background: bg, border: `1.5px solid ${border}`, borderRadius: 6, padding: 0 },
    };
  });

  const rfEdges: Edge[] = edges.map((e, i) => {
    const { border } = moduleColor(e.source);
    const opacity = 0.25 + (e.weight / maxWeight) * 0.55;
    return {
      id: `e${i}`,
      source: e.source,
      target: e.target,
      style: { stroke: border, strokeWidth: Math.max(1, Math.min(3, e.weight / 60)), opacity },
      markerEnd: { type: MarkerType.ArrowClosed, color: border, width: 10, height: 10 },
    };
  });

  return { rfNodes, rfEdges };
}

function PackageNodeComponent({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const border = data.border as string;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: border, width: 6, height: 6, border: 'none' }} />
      <div
        className="w-full h-full flex flex-col justify-center px-[10px] py-1 rounded-md"
        style={{ outline: selected ? `2px solid ${border}` : 'none', outlineOffset: 2 }}
      >
        <div className="text-[11px] font-semibold text-[#e6edf3] truncate">
          {data.label as string}
        </div>
        <div className="text-[9px] text-[#8b949e] mt-px">
          {data.function_count as number} fns · CC {data.total_complexity as number}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: border, width: 6, height: 6, border: 'none' }} />
    </>
  );
}

const nodeTypes = { packageNode: PackageNodeComponent };

const LIMIT_OPTIONS = [25, 50, 100, 150] as const;
const MODULE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'tsdb', value: 'tsdb' },
  { label: 'promql', value: 'promql' },
  { label: 'storage', value: 'storage' },
  { label: 'scrape', value: 'scrape' },
  { label: 'rules', value: 'rules' },
  { label: 'web', value: 'web' },
  { label: 'client_golang', value: 'client_golang' },
  { label: 'adapter', value: 'adapter' },
];

export default function PackageGraph() {
  const [limit, setLimit] = useState<number>(25);
  const [moduleFilter, setModuleFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['packages', limit, moduleFilter],
    queryFn: () => fetchPackageGraph(limit, moduleFilter || undefined),
    staleTime: 30000,
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { selectPackage, selectNode, setView } = useAppStore();

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data) return { rfNodes: [], rfEdges: [] };
    return dagreLayout(data.nodes, data.edges);
  }, [data]);

  useEffect(() => { setNodes(rfNodes); setEdges(rfEdges); }, [rfNodes, rfEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    selectPackage(node.id);
    selectNode(null);
  }, [selectPackage, selectNode]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_evt, node) => {
    selectPackage(node.id);
    setView('callgraph');
  }, [selectPackage, setView]);

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center text-[#8b949e]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full mx-auto mb-3" />
        <p>Laying out package graph…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center text-[#f85149]">
      <p>Failed to load graph. Is the backend running?</p>
    </div>
  );

  return (
    <div className="flex-1 relative flex flex-col bg-[#0d1117]">
      {/* Controls bar */}
      <div className="shrink-0 flex items-center gap-3 px-[14px] py-[6px] bg-[#161b22] border-b border-[#30363d]">
        <span className="text-[11px] text-[#8b949e]">Show top:</span>
        <div className="flex gap-[3px]">
          {LIMIT_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`min-h-fit h-6 px-[10px] text-[11px] rounded cursor-pointer transition-colors ${
                limit === n
                  ? 'bg-[#21262d] border border-[#58a6ff] text-[#58a6ff]'
                  : 'bg-transparent border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {n} pkgs
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#30363d]" />

        <span className="text-[11px] text-[#8b949e]">Module:</span>
        <div className="flex gap-[3px] flex-wrap">
          {MODULE_OPTIONS.map(m => (
            <button
              key={m.value}
              onClick={() => setModuleFilter(m.value)}
              className={`h-6 px-[10px] text-[11px] rounded cursor-pointer transition-colors ${
                moduleFilter === m.value
                  ? 'bg-[#21262d] border border-[#3fb950] text-[#3fb950]'
                  : 'bg-transparent border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="ml-auto flex items-center gap-[6px] text-[11px] text-[#8b949e]">
            <div className="w-[10px] h-[10px] border-[1.5px] border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
            Laying out…
          </div>
        )}
        <span className="ml-auto text-[10px] text-[#484f58]">
          {nodes.length} packages · {edges.length} deps shown
        </span>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick} onNodeDoubleClick={onNodeDoubleClick}
          fitView fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05} maxZoom={3}
          colorMode="dark" proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2530" />
          <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
          <MiniMap
            style={{ background: '#161b22', border: '1px solid #30363d' }}
            nodeColor={n => (n.data?.border as string) ?? '#30363d'}
            maskColor="rgba(13,17,23,0.85)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-[rgba(22,27,34,0.95)] border border-[#30363d] rounded-lg px-[14px] py-[10px] text-[10px] backdrop-blur-sm pointer-events-none">
        <div className="text-[11px] font-semibold text-[#8b949e] mb-[6px]">Subsystems</div>
        {[
          ['#58a6ff', 'tsdb (storage engine)'],
          ['#3fb950', 'promql (query engine)'],
          ['#f85149', 'storage'],
          ['#bc8cff', 'scrape'],
          ['#d29922', 'rules'],
          ['#56d364', 'web / api'],
          ['#79b8ff', 'client_golang'],
          ['#ffa657', 'adapter'],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-[6px] mb-[3px]">
            <div style={{ background: color }} className="w-2 h-2 rounded-sm shrink-0" />
            <span className="text-[#8b949e]">{label}</span>
          </div>
        ))}
        <div className="mt-2 pt-[6px] border-t border-[#21262d] text-[9px] text-[#484f58] leading-relaxed">
          Click → browse functions<br />Double-click → call graph
        </div>
      </div>
    </div>
  );
}
