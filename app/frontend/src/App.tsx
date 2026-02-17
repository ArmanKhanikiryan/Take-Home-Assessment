import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useAppStore } from './store';
import PackageGraph from './components/PackageGraph';
import CallGraph from './components/CallGraph';
import SourcePanel from './components/SourcePanel';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { fetchHealth } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

type Tab = 'explorer' | 'dashboard';

function DbStatusBanner() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: (q) => (q.state.data?.dbReady ? false : 5000),
    staleTime: 0,
  });

  if (!data || data.dbReady) return null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-2 text-xs text-[#d29922] bg-[#2d1b00] border-b border-[#d29922]">
      <div className="shrink-0 animate-spin w-3 h-3 border border-yellow-500 border-t-transparent rounded-full" />
      <span>
        <strong>Database is still generating</strong> — run{' '}
        <code className="bg-[#1a1000] px-1 py-px rounded">tail -f cpg-gen.log</code>
        {' '}to monitor progress. The app will unlock automatically when ready.
      </span>
    </div>
  );
}

function Inner() {
  const { view } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('explorer');

  return (
    <div className="flex flex-col h-screen bg-[#0d1117]">
      {/* Top bar */}
      <header className="shrink-0 h-12 flex items-center gap-4 px-4 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <circle cx="3" cy="6" r="2" />
            <circle cx="21" cy="6" r="2" />
            <circle cx="3" cy="18" r="2" />
            <circle cx="21" cy="18" r="2" />
            <path d="M12 9V6M12 15v3M9.5 10.5L4.5 7.5M14.5 10.5l5-3M9.5 13.5l-5 3M14.5 13.5l5 3" />
          </svg>
          <span className="font-bold text-sm text-[#e6edf3]">CPG Explorer</span>
          <span className="text-[11px] text-[#8b949e] pl-1">Code Property Graph</span>
        </div>

        <div className="flex gap-0.5">
          {(['explorer', 'dashboard'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`h-[30px] px-3 text-xs rounded-md cursor-pointer transition-colors ${
                activeTab === t
                  ? 'bg-[#21262d] border border-[#30363d] text-[#e6edf3]'
                  : 'bg-transparent border border-transparent text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {t === 'explorer' ? '🔭 Graph Explorer' : '📊 Dashboard'}
            </button>
          ))}
        </div>

        <div className="ml-auto text-[11px] text-[#8b949e]">
          {view === 'packages' ? '🗺 Package Architecture' : '📞 Call Graph'}
        </div>
      </header>

      <DbStatusBanner />

      {activeTab === 'dashboard' ? (
        <Dashboard />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex overflow-hidden relative">
            {view === 'packages' ? <PackageGraph /> : <CallGraph />}
          </div>
          <SourcePanel />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner />
    </QueryClientProvider>
  );
}
