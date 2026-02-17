export interface CpgNode {
  id: string;
  name: string;
  kind: string;
  package: string;
  file: string | null;
  line: number | null;
  end_line: number | null;
  type_info?: string;
}

export interface CpgEdge {
  source: string;
  target: string;
  kind?: string;
}

export interface PackageNode {
  id: string;
  label: string;
  fullPath: string;
  total_loc: number;
  total_complexity: number;
  function_count: number;
}

export interface PackageEdge {
  source: string;
  target: string;
  weight: number;
}

export interface PackageGraph {
  nodes: PackageNode[];
  edges: PackageEdge[];
}

export interface FunctionNeighborhood {
  center: CpgNode;
  callees: Array<CpgNode & { role: 'callee' }>;
  callers: Array<CpgNode & { role: 'caller' }>;
}

export interface CallChainResult {
  nodes: Array<CpgNode & { depth: number }>;
  edges: CpgEdge[];
}

export interface SourceResult {
  source: string | null;
  file: string | null;
  line: number | null;
  end_line: number | null;
  fullSource?: string;
}

export interface OverviewStat {
  key: string;
  value: string;
}

export interface HotspotFunction {
  function_id: string;
  name: string;
  package: string;
  hotspot_score: number;
  complexity: number;
  fan_in: number;
  fan_out: number;
  loc: number;
}

export interface Overview {
  stats: OverviewStat[];
  hotspots: HotspotFunction[];
  nodeDistribution: Array<{ kind: string; count: number }>;
  edgeDistribution: Array<{ kind: string; count: number }>;
}
