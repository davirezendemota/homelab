"use client";

import { Button } from "@/components/ui/button";
import { toggleDashboardMetersLayout } from "@/lib/dashboard-client";
import { LayoutPanelLeft } from "lucide-react";

export function MetersLayoutToggle({
  verticalMeters,
}: {
  verticalMeters: boolean;
}) {
  const label = verticalMeters
    ? "Exibir monitor em linha (horizontal)"
    : "Exibir monitor na lateral (vertical)";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="meters-layout-toggle"
      id="meters-layout-toggle"
      title={label}
      aria-label={label}
      aria-pressed={verticalMeters}
      onClick={() => toggleDashboardMetersLayout()}
    >
      <LayoutPanelLeft className="size-4" />
    </Button>
  );
}
