import { create } from 'zustand';

export type ViewMode = 'packages' | 'callgraph';

interface AppState {
  view: ViewMode;
  selectedNodeId: string | null;
  selectedPackage: string | null;
  sidebarOpen: boolean;
  setView: (v: ViewMode) => void;
  selectNode: (id: string | null) => void;
  selectPackage: (pkg: string | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'packages',
  selectedNodeId: null,
  selectedPackage: null,
  sidebarOpen: true,
  setView: (view) => set({ view }),
  selectNode: (selectedNodeId) => set({ selectedNodeId, ...(selectedNodeId ? { view: 'callgraph' as const } : {}) }),
  selectPackage: (selectedPackage) => set({ selectedPackage }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
