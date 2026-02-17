import axios from 'axios';
import type {
  Overview,
  PackageGraph,
  FunctionNeighborhood,
  CallChainResult,
  SourceResult,
  CpgNode,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export interface HealthStatus {
  status: 'ok' | 'db_not_ready';
  db: string;
  dbReady: boolean;
}

export const fetchHealth = (): Promise<HealthStatus> =>
  api.get('/health').then(r => r.data).catch(() => ({ status: 'db_not_ready' as const, db: '', dbReady: false }));

export const fetchOverview = (): Promise<Overview> =>
  api.get('/overview').then(r => r.data);

export const fetchPackageGraph = (limit = 30, module?: string): Promise<PackageGraph> =>
  api.get('/packages/graph', { params: { limit, ...(module ? { module } : {}) } }).then(r => r.data);

export const fetchPackageFunctions = (pkg: string): Promise<CpgNode[]> =>
  api.get(`/packages/${encodeURIComponent(pkg)}/functions`).then(r => r.data);

export const searchFunctions = (q: string): Promise<CpgNode[]> =>
  api.get('/functions/search', { params: { q, limit: 30 } }).then(r => r.data);

export const fetchNeighborhood = (id: string): Promise<FunctionNeighborhood> =>
  api.get(`/functions/${encodeURIComponent(id)}/neighborhood`).then(r => r.data);

export const fetchCallChain = (id: string, depth = 4): Promise<CallChainResult> =>
  api.get(`/functions/${encodeURIComponent(id)}/call-chain`, { params: { depth } }).then(r => r.data);

export const fetchSource = (id: string): Promise<SourceResult> =>
  api.get(`/functions/${encodeURIComponent(id)}/source`).then(r => r.data);

export const fetchFunction = (id: string): Promise<CpgNode> =>
  api.get(`/functions/${encodeURIComponent(id)}`).then(r => r.data);
