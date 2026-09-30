"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initDashboard } from "@/lib/dashboard-client";
import {
  DASHBOARD_REFRESH_MS,
  fetchStatusPayload,
  statusPayloadChanged,
  updateDashboardClock,
} from "@/lib/dashboard-status-poll";
import type { DashboardPrefsSnapshot } from "@/lib/dashboard-view-model";
import type { PagePayload } from "@/lib/metrics-cache";
import type { DashboardBridge } from "@/lib/dashboard-bridge";

type StatusContextValue = {
  data: PagePayload;
  displayError: string | null;
};

const StatusContext = createContext<StatusContextValue | null>(null);

function clonePayload(data: PagePayload): PagePayload {
  return JSON.parse(JSON.stringify(data)) as PagePayload;
}

export function DashboardStatusProvider({
  initialData,
  onPrefsChange,
  children,
}: {
  initialData: PagePayload;
  onPrefsChange: (snap: DashboardPrefsSnapshot) => void;
  children: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const buildRef = useRef(initialData.build || initialData.loaded_build);
  const initialRef = useRef(initialData);
  initialRef.current = initialData;

  useEffect(() => {
    setData(initialData);
    buildRef.current = initialData.build || initialData.loaded_build;
  }, [initialData]);

  useLayoutEffect(() => {
    const bridge: DashboardBridge = {
      reactPolling: true,
      onDataUpdate: (next) => {
        if (next.build) buildRef.current = next.build;
        setData((prev) =>
          statusPayloadChanged(prev, next) ? next : prev,
        );
        setFetchError(null);
        updateDashboardClock();
      },
      onUiBump: () => {
        if (bridge.getSnapshot) onPrefsChange(bridge.getSnapshot());
      },
    };

    const cleanup = initDashboard(clonePayload(initialRef.current), bridge);
    if (bridge.getSnapshot) onPrefsChange(bridge.getSnapshot());
    setReady(true);

    return () => {
      cleanup?.();
      setReady(false);
    };
  }, [onPrefsChange]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (cancelled || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const next = await fetchStatusPayload();
        if (cancelled) return;
        if (next.build) buildRef.current = next.build;

        updateDashboardClock();
        setData((prev) =>
          statusPayloadChanged(prev, next) ? next : prev,
        );
        setFetchError(null);
      } catch (e) {
        if (cancelled) return;
        setFetchError(
          "Falha ao atualizar: " +
            (e instanceof Error ? e.message : String(e)),
        );
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(poll, DASHBOARD_REFRESH_MS);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready]);

  const value = useMemo(
    () => ({
      data,
      displayError: fetchError ?? data.error,
    }),
    [data, fetchError],
  );

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export function useDashboardStatus(): StatusContextValue {
  const ctx = useContext(StatusContext);
  if (!ctx) {
    throw new Error(
      "useDashboardStatus must be used within DashboardStatusProvider",
    );
  }
  return ctx;
}
