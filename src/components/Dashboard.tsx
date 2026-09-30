"use client";

import { useLayoutEffect } from "react";
import { dashboardBodyHtml } from "@/lib/dashboard-body.html";
import { initDashboard } from "@/lib/dashboard-client";
import type { PagePayload } from "@/lib/metrics-cache";

export function Dashboard({ initialData }: { initialData: PagePayload }) {
  useLayoutEffect(() => {
    const cleanup = initDashboard(JSON.parse(JSON.stringify(initialData)));
    return () => {
      cleanup?.();
    };
  }, [initialData]);

  return (
    <div dangerouslySetInnerHTML={{ __html: dashboardBodyHtml }} suppressHydrationWarning />
  );
}
