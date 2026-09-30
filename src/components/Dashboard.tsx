"use client";

import { useCallback, useState } from "react";
import {
  DashboardEmptyShell,
  DashboardErrorContent,
  DashboardHiddenStacksShell,
  DashboardMeters,
  DashboardStacksContent,
} from "@/components/dashboard/DashboardLive";
import {
  DashboardHeaderBlock,
  DashboardOverlaysBlock,
  DashboardToolbarBlock,
} from "@/components/dashboard/DashboardStaticBlocks";
import {
  DashboardStatusProvider,
  useDashboardStatus,
} from "@/components/dashboard/DashboardStatusProvider";
import {
  emptyPrefsSnapshot,
  prefsSnapshotEqual,
} from "@/lib/dashboard-bridge";
import type { DashboardPrefsSnapshot } from "@/lib/dashboard-view-model";
import type { PagePayload } from "@/lib/metrics-cache";

function DashboardLiveBody({ prefs }: { prefs: DashboardPrefsSnapshot }) {
  const { data, displayError } = useDashboardStatus();

  return (
    <>
      <div className="meters" id="meters">
        <DashboardMeters meters={data.meters} />
      </div>
      <DashboardErrorContent error={displayError} />
      <DashboardToolbarBlock />
      <div id="stacks">
        <DashboardStacksContent data={data} prefs={prefs} />
      </div>
      <DashboardHiddenStacksShell data={data} prefs={prefs} />
      <DashboardEmptyShell data={data} prefs={prefs} />
    </>
  );
}

export function Dashboard({ initialData }: { initialData: PagePayload }) {
  const [prefs, setPrefs] = useState<DashboardPrefsSnapshot>(emptyPrefsSnapshot);

  const onPrefsChange = useCallback((snap: DashboardPrefsSnapshot) => {
    setPrefs((prev) => (prefsSnapshotEqual(prev, snap) ? prev : snap));
  }, []);

  return (
    <>
      <div className="page">
        <div className="wrap">
          <DashboardHeaderBlock />
          <DashboardStatusProvider
            initialData={initialData}
            onPrefsChange={onPrefsChange}
          >
            <DashboardLiveBody prefs={prefs} />
          </DashboardStatusProvider>
        </div>
      </div>
      <DashboardOverlaysBlock />
    </>
  );
}
