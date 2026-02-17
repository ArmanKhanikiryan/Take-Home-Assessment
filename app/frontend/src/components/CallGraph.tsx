import { useCallback, useEffect, useMemo } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { fetchNeighborhood } from '../api/client';
import { useAppStore } from '../store';

function hierarchyLayout(
  center: { id: string; name: string; package: string },
  callers: Array<{ id: string; name: string; package: string; role: string }>,
  callees: Array<{ id: string; name: string; package: string; role: string }>
) {
  const W = 240;
  const H = 60;
  const GAP_X = 280;
  const GAP_Y = 80;

  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // center
  rfNodes.push({
    id: center.id,
    data: { label: center.name, pkg: center.package },
    position: { x: 0, y: 0 },
    style: {
      width: W, height: H,
      background: '#1c3a5e', border: '2px solid #58a6ff',
      borderRadius: '8px', color: '#e6edf3',
      fontSize: '12px', fontWeight: 600,
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      padding: '4px 8px', cursor: 'pointer',
    },
    type: 'default',
  });

  // callers
  callers.forEach((c, i) => {
    const x = (i - (callers.length - 1) / 2) * GAP_X;
    const y = -2 * GAP_Y;
    rfNodes.push({
      id: c.id,
      data: { label: c.name, pkg: c.package },
      position: { x, y },
      style: {
        width: W, height: H,
        background: '#161b22', border: '1px solid #3fb950',
        borderRadius: '6px', color: '#e6edf3',
        fontSize: '11px', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        padding: '4px 8px', cursor: 'pointer',
      },
    });
    rfEdges.push({
      id: `caller-${c.id}`,
      source: c.id,
      target: center.id,
      animated: true,
      style: { stroke: '#3fb950', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3fb950' },
      label: 'calls',
      labelStyle: { fill: '#3fb950', fontSize: 10 },
    });
  });

  // callees
  callees.forEach((c, i) => {
    const x = (i - (callees.length - 1) / 2) * GAP_X;
    const y = 2 * GAP_Y;
    rfNodes.push({
      id: c.id,
      data: { label: c.name, pkg: c.package },
      position: { x, y },
      style: {
        width: W, height: H,
        background: '#161b22', border: '1px solid #d29922',
        borderRadius: '6px', color: '#e6edf3',
        fontSize: '11px', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        padding: '4px 8px', cursor: 'pointer',
      },
    });
    rfEdges.push({
      id: `callee-${c.id}`,
      source: center.id,
      target: c.id,
      animated: true,
      style: { stroke: '#d29922', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#d29922' },
      label: 'calls',
      labelStyle: { fill: '#d29922', fontSize: 10 },
    });
  });

  return { rfNodes, rfEdges };
}

export default function CallGraph() {
  const { selectedNodeId, selectNode } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['neighborhood', selectedNodeId],
    queryFn: () => fetchNeighborhood(selectedNodeId!),
    enabled: !!selectedNodeId,
  });

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data) return { rfNodes: [], rfEdges: [] };
    return hierarchyLayout(data.center, data.callers, data.callees);
  }, [data]);

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    selectNode(node.id);
  }, [selectNode]);

  if (!selectedNodeId) return (
    <div className="flex-1 flex items-center justify-center text-[#8b949e]">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-base font-medium text-[#e6edf3]">Select a function to explore its call graph</p>
        <p className="text-sm mt-1 text-[#8b949e]">Search a function or click a package first</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="flex-1 bg-[#0d1117]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#21262d" />
        <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        <MiniMap style={{ background: '#161b22', border: '1px solid #30363d' }} nodeColor="#30363d" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-[50px] bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-sm bg-[#3fb950] shrink-0" />
          <span className="text-[#8b949e]">Callers (call this function)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#d29922] shrink-0" />
          <span className="text-[#8b949e]">Callees (called by this function)</span>
        </div>
      </div>
    </div>
  );
}
