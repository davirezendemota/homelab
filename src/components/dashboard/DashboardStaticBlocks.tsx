"use client";

import { memo } from "react";
import {
  dashboardHeaderHtml,
  dashboardOverlaysHtml,
} from "@/lib/dashboard-body.splits";

function HtmlBlock({ html }: { html: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />
  );
}

export const DashboardHeaderBlock = memo(function DashboardHeaderBlock() {
  return <HtmlBlock html={dashboardHeaderHtml} />;
});

export const DashboardOverlaysBlock = memo(function DashboardOverlaysBlock() {
  return <HtmlBlock html={dashboardOverlaysHtml} />;
});
