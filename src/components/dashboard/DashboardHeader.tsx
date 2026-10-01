"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setDashboardCompactView,
  setDashboardTruncateNames,
} from "@/lib/dashboard-client";
import type { DashboardPrefsSnapshot } from "@/lib/dashboard-view-model";
import { Maximize2, Minimize2, Settings } from "lucide-react";

const GITHUB_REPO_URL = "https://github.com/davirezendemota/homelab-app";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.09.28-2.26 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function DashboardSettingsMenu({
  prefs,
}: {
  prefs: DashboardPrefsSnapshot;
}) {
  const { compactView, truncateNames } = prefs.settings;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            title="Configurações"
            aria-label="Configurações"
          />
        }
      >
        <Settings className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="header-prefs-dropdown"
      >
        <p className="header-prefs-title">Preferências</p>
        <div className="header-prefs-list">
          <label className="settings-option header-prefs-option" htmlFor="pref-compact-view">
            <Checkbox
              id="pref-compact-view"
              className="mt-0.5"
              checked={compactView}
              onCheckedChange={(checked) => setDashboardCompactView(checked)}
            />
            <span className="settings-option-text">
              <span className="settings-option-label">Visualização compacta</span>
              <span className="settings-option-hint">
                Linhas mais densas, com containers agrupados por stack
              </span>
            </span>
          </label>
          <label className="settings-option header-prefs-option" htmlFor="pref-truncate-names">
            <Checkbox
              id="pref-truncate-names"
              className="mt-0.5"
              checked={truncateNames}
              onCheckedChange={(checked) => setDashboardTruncateNames(checked)}
            />
            <span className="settings-option-text">
              <span className="settings-option-label">Truncar nome do container</span>
              <span className="settings-option-hint">
                Exibe reticências quando o nome não couber na coluna
              </span>
            </span>
          </label>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardHeader({
  prefs,
}: {
  prefs: DashboardPrefsSnapshot;
}) {
  return (
    <div className="header-island-wrap">
      <header
        className="header-island border-border bg-background/80 backdrop-blur-md"
        role="banner"
      >
        <h1 className="header-island-title">Containers ativos</h1>
        <span className="header-island-sep" aria-hidden="true" />
        <div className="clock header-island-clock">
          <span className="clock-dot" />
          Atualizado <span id="clock" />
        </div>
        <div className="header-island-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            id="fullscreen-toggle"
            title="Tela cheia"
            aria-label="Tela cheia"
          >
            <Maximize2
              className="fullscreen-enter-icon size-4"
              aria-hidden="true"
            />
            <Minimize2
              className="fullscreen-exit-icon hidden size-4"
              aria-hidden="true"
            />
          </Button>
          <DashboardSettingsMenu prefs={prefs} />
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            title="Repositório no GitHub"
            aria-label="Repositório no GitHub"
          >
            <GitHubIcon className="size-4" />
          </Button>
        </div>
      </header>
    </div>
  );
}
