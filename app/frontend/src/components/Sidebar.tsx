import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { searchFunctions, fetchPackageFunctions } from '../api/client';
import type { CpgNode } from '../types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Sidebar() {
  const { selectedPackage, selectNode, setView, view } = useAppStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: searchResults } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchFunctions(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const { data: pkgFunctions } = useQuery({
    queryKey: ['pkg-functions', selectedPackage],
    queryFn: () => fetchPackageFunctions(selectedPackage!),
    enabled: !!selectedPackage && !debouncedSearch,
  });

  const handleSelectNode = useCallback((node: CpgNode) => {
    selectNode(node.id);
  }, [selectNode]);

  const list = debouncedSearch.length >= 2 ? (searchResults ?? []) : (pkgFunctions ?? []);
  const isSearching = debouncedSearch.length >= 2;

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-r border-[#30363d] bg-[#161b22]">
      {/* Search */}
      <div className="px-3 py-[10px] border-b border-[#30363d]">
        <div className="relative">
          <svg className="absolute left-2 top-2 opacity-50 text-[#8b949e]" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search functions..."
            className="w-full h-[30px] pl-7 pr-2 bg-[#21262d] border border-[#30363d] rounded-md text-[#e6edf3] text-xs outline-none"
          />
        </div>
      </div>

      {/* Package name */}
      {selectedPackage && !isSearching && (
        <div className="px-3 py-2 border-b border-[#30363d] text-[11px] text-[#58a6ff] font-mono break-all">
          📦 {selectedPackage}
        </div>
      )}

      {/* View toggle */}
      <div className="px-3 py-2 border-b border-[#30363d] flex gap-1">
        {(['packages', 'callgraph'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 h-7 text-[11px] rounded-md cursor-pointer transition-colors ${
              view === v
                ? 'bg-[#21262d] border border-[#58a6ff] text-[#58a6ff]'
                : 'bg-transparent border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            {v === 'packages' ? '🗺 Packages' : '📞 Call Graph'}
          </button>
        ))}
      </div>

      {/* Function list */}
      <div className="flex-1 overflow-auto py-1">
        {list.length === 0 && (
          <div className="px-3 py-4 text-[#8b949e] text-xs text-center">
            {isSearching ? 'No results' : selectedPackage ? 'No functions found' : 'Click a package to see its functions'}
          </div>
        )}
        {list.map((fn: CpgNode) => (
          <div
            key={fn.id}
            onClick={() => handleSelectNode(fn)}
            className="px-3 py-[6px] cursor-pointer text-xs border-b border-[#21262d] hover:bg-[#21262d] transition-colors"
          >
            <div className="text-[#e6edf3] font-medium truncate">{fn.name}</div>
            <div className="text-[#8b949e] text-[10px] mt-px truncate">
              {fn.file ? `${fn.file}:${fn.line ?? ''}` : fn.package}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
