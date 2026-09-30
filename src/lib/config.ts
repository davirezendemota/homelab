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

export const MODULE_BUILD = String(Date.now());

export const DEFAULT_SETTINGS = {
  compactView: false,
  truncateNames: false,
} as const;
