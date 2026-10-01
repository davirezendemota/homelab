"use client";

import { useMemo } from "react";
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

const SORT_KEYS = ["status", "port", "name"] as const;

function HideIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

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
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          id="q"
          className="search-input"
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
            <button
              key={key}
              type="button"
              className={`sort-btn${active ? " active" : ""}`}
              data-key={key}
              onClick={() => toggleDashboardSort(key)}
            >
              {label}
              {active ? (
                <span className="arrow">{sortDir === 1 ? "▲" : "▼"}</span>
              ) : null}
            </button>
          );
        })}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className={`hidden-show-toggle${showHidden ? " active" : ""}`}
            id="hidden-show-toggle"
            title={hiddenLabel}
            aria-label={hiddenLabel}
            aria-pressed={showHidden}
            onClick={() => toggleDashboardShowHidden()}
          >
            <HideIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
