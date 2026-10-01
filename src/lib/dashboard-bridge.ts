import type { DashboardPrefsSnapshot } from "@/lib/dashboard-view-model";
import type { PagePayload } from "@/lib/metrics-cache";

export type DashboardBridge = {
  /** Polling de /api/status fica no React (useEffect). */
  reactPolling?: boolean;
  onDataUpdate?: (data: PagePayload) => void;
  onUiBump?: () => void;
  getSnapshot?: () => DashboardPrefsSnapshot;
};

export function prefsSnapshotEqual(
  a: DashboardPrefsSnapshot,
  b: DashboardPrefsSnapshot,
): boolean {
  return (
    a.view.query === b.view.query &&
    a.view.sortKey === b.view.sortKey &&
    a.view.sortDir === b.view.sortDir &&
    a.view.showHidden === b.view.showHidden &&
    a.settings.compactView === b.settings.compactView &&
    a.settings.truncateNames === b.settings.truncateNames &&
    a.settings.verticalMeters === b.settings.verticalMeters &&
    JSON.stringify(a.favorites) === JSON.stringify(b.favorites) &&
    JSON.stringify(a.hiddenContainers) === JSON.stringify(b.hiddenContainers) &&
    JSON.stringify(a.hiddenStacks) === JSON.stringify(b.hiddenStacks) &&
    JSON.stringify(a.collapsedStacks) === JSON.stringify(b.collapsedStacks)
  );
}

export const emptyPrefsSnapshot: DashboardPrefsSnapshot = {
  favorites: [],
  hiddenContainers: [],
  hiddenStacks: [],
  collapsedStacks: [],
  settings: {
    compactView: false,
    truncateNames: false,
    verticalMeters: false,
  },
  view: { query: "", sortKey: null, sortDir: 1, showHidden: false },
};
