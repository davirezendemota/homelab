import path from "path";

export const DOCKER_SOCKET =
  process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";
export const HOST_ROOT = (process.env.HOST_ROOT ?? "/host").replace(/\/$/, "");
export const DB_PATH =
  process.env.DB_PATH ??
  path.join(process.cwd(), "data", "homepage.db");

export const CACHE_FAST_INTERVAL_MS = 5000;
export const CACHE_STORAGE_INTERVAL_MS = 60_000;
export const LOG_TAIL = 200;

function readBuildEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Estável entre workers (evita reload em loop no dev com vários processos). */
export const MODULE_BUILD =
  readBuildEnv("HOMELAB_BUILD_ID") ??
  readBuildEnv("NEXT_DEPLOYMENT_ID") ??
  (process.env.NODE_ENV === "development" ? "dev" : "production");

export const DEFAULT_SETTINGS = {
  compactView: false,
  truncateNames: false,
  verticalMeters: false,
} as const;
