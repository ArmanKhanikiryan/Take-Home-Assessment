import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../api/client';
import { useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HotspotFunction } from '../types';

const COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#56d364'];

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview, staleTime: Infinity });
  const { selectNode, setView } = useAppStore();

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return null;

  const topEdgeKinds = data.edgeDistribution.slice(0, 6);
  const topNodeKinds = data.nodeDistribution.slice(0, 6);

  return (
    <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
      {/* Overview stats */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {data.stats.slice(0, 8).map(s => (
          <div key={s.key} className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3">
            <div className="text-[22px] font-bold text-[#58a6ff]">
              {Number(s.value).toLocaleString()}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-0.5">{s.key}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Edge Types">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topEdgeKinds} layout="vertical" margin={{ left: 60, right: 16 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="kind" tick={{ fill: '#8b949e', fontSize: 10 }} width={55} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 4 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topEdgeKinds.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Node Types">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topNodeKinds} layout="vertical" margin={{ left: 60, right: 16 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="kind" tick={{ fill: '#8b949e', fontSize: 10 }} width={55} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 4 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topNodeKinds.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Hotspot functions */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="px-4 py-3 border-b border-[#30363d] text-[13px] font-semibold text-[#e6edf3]">
          🔥 Hotspot Functions{' '}
          <span className="text-[#8b949e] font-normal text-[11px]">ranked by complexity + fan-in</span>
        </div>
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="text-[#8b949e] border-b border-[#30363d]">
              {['Function', 'Package', 'Score', 'CC', 'Fan-in', 'Fan-out', 'LOC'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.hotspots.map((fn: HotspotFunction) => (
              <tr
                key={fn.function_id}
                onClick={() => { selectNode(fn.function_id); setView('callgraph'); }}
                className="border-b border-[#21262d] cursor-pointer hover:bg-[#21262d] transition-colors"
              >
                <td className="px-3 py-2 text-[#58a6ff] font-mono">{fn.name}</td>
                <td className="px-3 py-2 text-[#8b949e] text-[10px]">{fn.package}</td>
                <td className="px-3 py-2 text-[#f85149] font-semibold">{fn.hotspot_score?.toFixed?.(1)}</td>
                <td className={`px-3 py-2 font-medium ${fn.complexity > 10 ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                  {fn.complexity}
                </td>
                <td className="px-3 py-2 text-[#8b949e]">{fn.fan_in}</td>
                <td className="px-3 py-2 text-[#8b949e]">{fn.fan_out}</td>
                <td className="px-3 py-2 text-[#8b949e]">{fn.loc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3">
      <div className="text-xs font-semibold text-[#8b949e] mb-2">{title}</div>
      {children}
    </div>
  );
}
