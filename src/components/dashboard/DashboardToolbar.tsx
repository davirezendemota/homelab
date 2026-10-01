"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  setDashboardQuery,
  toggleDashboardShowHidden,
  toggleDashboardSort,
} from "@/lib/dashboard-client";
import {
  buildLists,
  type DashboardPrefsSnapshot,
} from "@/lib/dashboard-view-model";
import type { PagePayload } from "@/lib/metrics-cache";
import { EyeOff, Search } from "lucide-react";

const SORT_KEYS = ["status", "port", "name"] as const;

export function DashboardToolbar({
  prefs,
  containers,
}: {
  prefs: DashboardPrefsSnapshot;
  containers: PagePayload["containers"];
}) {
  const hiddenCount = useMemo(
    () => buildLists(containers, prefs).hiddenCount,
    [containers, prefs],
  );
  const { query, sortKey, sortDir, showHidden } = prefs.view;

  const hiddenLabel = showHidden
    ? "Ocultar containers escondidos"
    : `Mostrar containers escondidos (${hiddenCount})`;

  return (
    <div className="toolbar">
      <div className="search-wrap relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="q"
          className="search-input h-9 pl-9"
          type="search"
          placeholder="Filtrar por nome, imagem ou stack…"
          autoComplete="off"
          value={query}
          onChange={(e) => setDashboardQuery(e.target.value)}
        />
      </div>
      <div className="sort">
        <span className="sort-label">Ordenar</span>
        {SORT_KEYS.map((key) => {
          const active = sortKey === key;
          const label =
            key === "status" ? "Status" : key === "port" ? "Porta" : "Nome";
          return (
            <Button
              key={key}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className={`sort-btn rounded-full${active ? " active" : ""}`}
              data-key={key}
              onClick={() => toggleDashboardSort(key)}
            >
              {label}
              {active ? (
                <span className="arrow">{sortDir === 1 ? "▲" : "▼"}</span>
              ) : null}
            </Button>
          );
        })}
        {hiddenCount > 0 ? (
          <Toggle
            variant="outline"
            size="sm"
            className={`hidden-show-toggle size-9 rounded-full p-0${showHidden ? " active" : ""}`}
            id="hidden-show-toggle"
            title={hiddenLabel}
            aria-label={hiddenLabel}
            pressed={showHidden}
            onPressedChange={() => toggleDashboardShowHidden()}
          >
            <EyeOff className="size-4" />
          </Toggle>
        ) : null}
      </div>
    </div>
  );
}
