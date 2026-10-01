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
} from "@/components/dashboard/DashboardStaticBlocks";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar";
import {
  DashboardStatusProvider,
  useDashboardStatus,
} from "@/components/dashboard/DashboardStatusProvider";
import { DashboardProjects } from "@/components/dashboard/DashboardProjects";
import {
  emptyPrefsSnapshot,
  prefsSnapshotEqual,
} from "@/lib/dashboard-bridge";
import type { DashboardPrefsSnapshot } from "@/lib/dashboard-view-model";
import type { PagePayload } from "@/lib/metrics-cache";

function DashboardLiveBody({ prefs }: { prefs: DashboardPrefsSnapshot }) {
  const { data, displayError } = useDashboardStatus();
  const verticalMeters = prefs.settings.verticalMeters;

  const meters = (
    <div className="meters" id="meters">
      <DashboardMeters meters={data.meters} />
    </div>
  );

  const main = (
    <>
      <DashboardProjects />
      {!verticalMeters ? meters : null}
      <DashboardErrorContent error={displayError} />
      <DashboardToolbar prefs={prefs} containers={data.containers} />
      <div id="stacks">
        <DashboardStacksContent data={data} prefs={prefs} />
      </div>
      <DashboardHiddenStacksShell data={data} prefs={prefs} />
      <DashboardEmptyShell data={data} prefs={prefs} />
    </>
  );

  if (!verticalMeters) return main;

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">{main}</div>
      <aside className="dashboard-meters-col" aria-label="Recursos do host">
        {meters}
      </aside>
    </div>
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
