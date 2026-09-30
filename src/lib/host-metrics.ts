import os from "os";
import fs from "fs";
import path from "path";
import { HOST_ROOT } from "./config";

export const MAIN_DISK_COLOR = "#3fb950";
export const MOUNT_COLORS = [
  "#6cb6ff",
  "#a371f7",
  "#e3b341",
  "#f778ba",
  "#56d4dd",
  "#ffa657",
];

const PSEUDO_FSTYPES = new Set([
  "proc",
  "sysfs",
  "devtmpfs",
  "devpts",
  "tmpfs",
  "securityfs",
  "cgroup",
  "cgroup2",
  "pstore",
  "bpf",
  "mqueue",
  "hugetlbfs",
  "debugfs",
  "tracefs",
  "fusectl",
  "configfs",
  "rpc_pipefs",
  "autofs",
  "binfmt_misc",
  "efivarfs",
  "nsfs",
]);

const PREFERRED_HWMON = new Set([
  "coretemp",
  "k10temp",
  "zenpower",
  "applesmc",
  "cpu_thermal",
  "soc_thermal",
]);
const SKIP_HWMON = new Set(["acpitz"]);
const SKIP_STORAGE_MOUNTS = new Set(["/boot", "/boot/efi"]);
const HOST_MOUNT_PARENTS = ["mnt", "media", "srv"];

export type StorageMount = {
  path: string;
  label: string;
  pct: number;
  used_gb: number;
  total_gb: number;
  color: string;
};

function usingHostStorage(): boolean {
  return Boolean(HOST_ROOT) && fs.existsSync(HOST_ROOT);
}

function sysfsRoots(): string[] {
  if (usingHostStorage()) {
    return [path.join(HOST_ROOT, "sys"), "/sys"];
  }
  return ["/sys"];
}

function sysfsPath(root: string, ...parts: string[]): string {
  return path.join(root, ...parts);
}

function readTempMillidegrees(filePath: string): number | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    const val = parseInt(raw, 10);
    return Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

function mountUsage(mountpoint: string): [number, number, number] | null {
  try {
    const s = fs.statfsSync(mountpoint);
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bfree) * Number(s.bsize);
    if (total <= 0) return null;
    const used = total - free;
    const pct = Math.round((used / total) * 100);
    return [pct, used / 1024 ** 3, total / 1024 ** 3];
  } catch {
    return null;
  }
}

export async function cpuPercent(): Promise<[number, number]> {
  const ncpu = osCpuCount();
  try {
    const [t0, i0] = readCpuTimes();
    await sleep(120);
    const [t1, i1] = readCpuTimes();
    const dt = t1 - t0;
    const di = i1 - i0;
    const pct =
      dt <= 0
        ? 0
        : Math.round(Math.max(0, Math.min(100, (1 - di / dt) * 100)));
    return [pct, ncpu];
  } catch {
    return [0, ncpu];
  }
}

function osCpuCount(): number {
  return os.availableParallelism?.() ?? os.cpus().length ?? 1;
}

function readCpuTimes(): [number, number] {
  const line = fs.readFileSync("/proc/stat", "utf8").split("\n")[0] ?? "";
  const parts = line.split(/\s+/).slice(1).map((x) => parseInt(x, 10));
  const total = parts.reduce((a, b) => a + b, 0);
  const idle = (parts[3] ?? 0) + (parts[4] ?? 0);
  return [total, idle];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ramStats(): [number, number, number] {
  const info: Record<string, number> = {};
  try {
    const lines = fs.readFileSync("/proc/meminfo", "utf8").split("\n");
    for (const line of lines) {
      const [key, rest] = line.split(":");
      if (key === "MemTotal" || key === "MemAvailable") {
        info[key] = parseInt(rest.trim().split(/\s+/)[0] ?? "0", 10);
      }
    }
  } catch {
    return [0, 0, 0];
  }
  const totalKb = info.MemTotal ?? 0;
  const availKb = info.MemAvailable ?? 0;
  if (totalKb <= 0) return [0, 0, 0];
  const usedKb = Math.max(0, totalKb - availKb);
  const pct = Math.round((usedKb / totalKb) * 100);
  return [pct, usedKb / 1024 ** 2, totalKb / 1024 ** 2];
}

function hwmonReadings(root: string): Array<[string, number]> {
  const rows: Array<[string, number]> = [];
  const hwmonDir = sysfsPath(root, "class", "hwmon");
  let entries: string[];
  try {
    entries = fs.readdirSync(hwmonDir);
  } catch {
    return rows;
  }
  for (const entry of entries) {
    if (!entry.startsWith("hwmon")) continue;
    const base = path.join(hwmonDir, entry);
    let chip = "sensor";
    try {
      chip = fs.readFileSync(path.join(base, "name"), "utf8").trim() || chip;
    } catch {
      /* ignore */
    }
    let files: string[];
    try {
      files = fs.readdirSync(base);
    } catch {
      continue;
    }
    for (const fname of files) {
      if (!fname.startsWith("temp") || !fname.endsWith("_input")) continue;
      const val = readTempMillidegrees(path.join(base, fname));
      if (val != null) rows.push([chip, val]);
    }
  }
  return rows;
}

function thermalZoneReadings(root: string): Array<[string, number]> {
  const rows: Array<[string, number]> = [];
  const thermalDir = sysfsPath(root, "class", "thermal");
  let zones: string[];
  try {
    zones = fs.readdirSync(thermalDir);
  } catch {
    return rows;
  }
  for (const entry of zones) {
    if (!entry.startsWith("thermal_zone")) continue;
    const base = path.join(thermalDir, entry);
    let zoneType = "thermal";
    try {
      zoneType =
        fs.readFileSync(path.join(base, "type"), "utf8").trim() || zoneType;
    } catch {
      /* ignore */
    }
    const val = readTempMillidegrees(path.join(base, "temp"));
    if (val != null) rows.push([zoneType, val]);
  }
  return rows;
}

export function temperatureStats(): [number | null, string] {
  const hwmon: Array<[string, number]> = [];
  const thermal: Array<[string, number]> = [];
  for (const root of sysfsRoots()) {
    hwmon.push(...hwmonReadings(root));
    thermal.push(...thermalZoneReadings(root));
  }

  const preferredHwmon = hwmon
    .filter(([name]) => PREFERRED_HWMON.has(name))
    .map(([, val]) => val);
  if (preferredHwmon.length) {
    return [Math.max(...preferredHwmon) / 1000, "CPU"];
  }

  const pkgThermal = thermal
    .filter(
      ([name]) =>
        name.toLowerCase().includes("pkg") ||
        name.toLowerCase().includes("cpu"),
    )
    .map(([, val]) => val);
  if (pkgThermal.length) {
    return [Math.max(...pkgThermal) / 1000, "CPU"];
  }

  const fallbackHwmon = hwmon
    .filter(([name]) => !SKIP_HWMON.has(name))
    .map(([, val]) => val);
  if (fallbackHwmon.length) {
    return [Math.max(...fallbackHwmon) / 1000, "CPU"];
  }

  if (thermal.length) {
    return [Math.max(...thermal.map(([, v]) => v)) / 1000, "Sistema"];
  }

  return [null, ""];
}

export function temperatureColor(celsius: number): string {
  if (celsius >= 85) return "#f85149";
  if (celsius >= 65) return "#e3b341";
  return "#3fb950";
}

export function meterColor(pct: number): string {
  if (pct >= 85) return "#f85149";
  if (pct >= 65) return "#e3b341";
  return "#3fb950";
}

function diskStats(): [number, number, number] {
  const mountPath = usingHostStorage() ? HOST_ROOT : "/";
  const stats = mountUsage(mountPath);
  return stats ?? [0, 0, 0];
}

function fstabMountpoints(fstabPath: string): string[] {
  const points: string[] = [];
  try {
    const lines = fs.readFileSync(fstabPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      const mountpoint = parts[1]!;
      if (!points.includes(mountpoint)) points.push(mountpoint);
    }
  } catch {
    /* ignore */
  }
  return points;
}

function hostMountPath(hostRoot: string, mountpoint: string): string {
  return mountpoint === "/" ? hostRoot : `${hostRoot}${mountpoint}`;
}

function discoverMountpoints(hostRoot: string): string[] {
  const mounts: string[] = [];
  const add = (p: string) => {
    try {
      if (!mounts.includes(p) && fs.statSync(p).isDirectory()) {
        const dev = fs.statSync(p).dev;
        const parentDev = fs.statSync(path.dirname(p)).dev;
        if (dev !== parentDev || p === hostRoot) mounts.push(p);
      }
    } catch {
      /* ignore */
    }
  };

  add(hostRoot);
  for (const mp of fstabMountpoints(path.join(hostRoot, "etc/fstab"))) {
    add(hostMountPath(hostRoot, mp));
  }
  for (const parentName of HOST_MOUNT_PARENTS) {
    const parent = path.join(hostRoot, parentName);
    if (!fs.existsSync(parent)) continue;
    add(parent);
    try {
      for (const name of fs.readdirSync(parent)) {
        add(path.join(parent, name));
      }
    } catch {
      /* ignore */
    }
  }
  return mounts;
}

function displayPath(mountPath: string, hostRoot: string): string {
  if (mountPath === hostRoot) return "/";
  if (mountPath.startsWith(`${hostRoot}/`)) {
    return mountPath.slice(hostRoot.length);
  }
  return mountPath;
}

function splitStorageRows(
  rows: Array<{ path: string; pct: number; used_gb: number; total_gb: number }>,
): [StorageMount, StorageMount[]] {
  rows.sort((a, b) => {
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return a.path.localeCompare(b.path);
  });

  let main: StorageMount | null = null;
  const others: StorageMount[] = [];
  let colorIdx = 0;
  for (const row of rows) {
    if (row.path === "/") {
      main = { ...row, label: "/", color: MAIN_DISK_COLOR };
      continue;
    }
    others.push({
      ...row,
      label: row.path,
      color: MOUNT_COLORS[colorIdx % MOUNT_COLORS.length]!,
    });
    colorIdx += 1;
  }

  if (!main) {
    const [pct, used_gb, total_gb] = diskStats();
    main = {
      path: "/",
      label: "/",
      pct,
      used_gb,
      total_gb,
      color: MAIN_DISK_COLOR,
    };
  }

  return [main, others];
}

function storageMountsFromHost(hostRoot: string): [StorageMount, StorageMount[]] {
  const rows: Array<{ path: string; pct: number; used_gb: number; total_gb: number }> =
    [];
  const seenDevices = new Set<number>();

  for (const mountPath of discoverMountpoints(hostRoot)) {
    let deviceId: number;
    try {
      deviceId = fs.statSync(mountPath).dev;
    } catch {
      continue;
    }
    if (seenDevices.has(deviceId)) continue;
    const stats = mountUsage(mountPath);
    if (!stats) continue;
    seenDevices.add(deviceId);
    const [pct, used_gb, total_gb] = stats;
    const display = displayPath(mountPath, hostRoot);
    if (SKIP_STORAGE_MOUNTS.has(display)) continue;
    rows.push({ path: display, pct, used_gb, total_gb });
  }

  return splitStorageRows(rows);
}

function skipMount(mountpoint: string, fstype: string, usingHost: boolean): boolean {
  if (PSEUDO_FSTYPES.has(fstype)) return true;
  if (usingHost) return false;
  if (mountpoint.startsWith("/app")) return true;
  if (/\.(py|js|json|yaml|yml)$/.test(mountpoint)) return true;
  return false;
}

function storageMountsFromProc(): [StorageMount, StorageMount[]] {
  const rows: Array<{ path: string; pct: number; used_gb: number; total_gb: number }> =
    [];
  const seenDevices = new Set<string>();
  const usingHost = usingHostStorage();

  try {
    const lines = fs.readFileSync("/proc/mounts", "utf8").split("\n");
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;
      const mountpoint = parts[1]!;
      const fstype = parts[2]!;
      if (skipMount(mountpoint, fstype, usingHost)) continue;
      const device = parts[0]!;
      if (seenDevices.has(device)) continue;
      const stats = mountUsage(mountpoint);
      if (!stats) continue;
      seenDevices.add(device);
      const [pct, used_gb, total_gb] = stats;
      if (SKIP_STORAGE_MOUNTS.has(mountpoint)) continue;
      rows.push({ path: mountpoint, pct, used_gb, total_gb });
    }
  } catch {
    /* ignore */
  }

  return splitStorageRows(rows);
}

export function storageMounts(): [StorageMount, StorageMount[]] {
  if (usingHostStorage()) {
    return storageMountsFromHost(HOST_ROOT);
  }
  return storageMountsFromProc();
}

function storageAggregate(
  main: StorageMount,
  extras: StorageMount[],
): [number, number, number] {
  const mounts = [main, ...extras];
  const totalUsed = mounts.reduce((s, m) => s + m.used_gb, 0);
  const totalGb = mounts.reduce((s, m) => s + m.total_gb, 0);
  const pct = totalGb > 0 ? Math.round((totalUsed / totalGb) * 100) : 0;
  return [pct, totalUsed, totalGb];
}

export async function buildMeters(): Promise<Record<string, unknown>[]> {
  const [cpu, ncpu] = await cpuPercent();
  const [ramPct, ramUsed, ramTotal] = ramStats();
  const [tempC, tempLabel] = temperatureStats();
  const [mainDisk, extraMounts] = storageMounts();
  const [storagePct, storageUsed, storageTotal] = storageAggregate(
    mainDisk,
    extraMounts,
  );

  let tempMeter: Record<string, unknown>;
  if (tempC == null) {
    tempMeter = {
      label: "Temperatura",
      display: "—",
      sub: "indisponível",
      showSub: true,
      color: "#8b94a3",
      barWidth: "0%",
      showBar: false,
      showCaption: false,
      caption: "",
      detailKey: "temp",
    };
  } else {
    const tempPct = Math.round(Math.min(100, Math.max(0, tempC)));
    tempMeter = {
      label: "Temperatura",
      display: `${tempC.toFixed(0)}°C`,
      sub: tempLabel,
      showSub: true,
      color: temperatureColor(tempC),
      barWidth: `${tempPct}%`,
      showBar: true,
      showChart: true,
      chartKey: "temp",
      pct: tempPct,
      showCaption: false,
      caption: "",
      detailKey: "temp",
    };
  }

  return [
    {
      label: "CPU",
      display: `${cpu}%`,
      sub: `${ncpu} cores`,
      showSub: true,
      color: meterColor(cpu),
      barWidth: `${cpu}%`,
      showBar: true,
      showChart: true,
      chartKey: "cpu",
      pct: cpu,
      showCaption: false,
      caption: "",
      detailKey: "cpu",
    },
    {
      label: "RAM",
      display: `${ramPct}%`,
      sub: `${ramUsed.toFixed(1)} / ${ramTotal.toFixed(0)} GB`,
      showSub: true,
      color: meterColor(ramPct),
      barWidth: `${ramPct}%`,
      showBar: true,
      showChart: true,
      chartKey: "ram",
      pct: ramPct,
      showCaption: false,
      caption: "",
      detailKey: "ram",
    },
    tempMeter,
    {
      label: "Armazenamento",
      type: "storage",
      display: `${storagePct}%`,
      sub: `${storageUsed.toFixed(1)} / ${storageTotal.toFixed(0)} GB`,
      showSub: true,
      color: meterColor(storagePct),
      barWidth: `${storagePct}%`,
      showBar: false,
      showCaption: false,
      caption: "",
      main: mainDisk,
      mounts: extraMounts,
      detailKey: "storage",
    },
  ];
}

export function formatBytes(size: number): string {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export function formatPct(value: number): string {
  if (value >= 10) return `${value.toFixed(0)}%`;
  if (value >= 1) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
}

export function temperatureSensorDetails(): Array<{
  name: string;
  value: number;
  display: string;
}> {
  const rows: Array<{ name: string; value: number; display: string }> = [];
  const seen = new Set<string>();

  for (const root of sysfsRoots()) {
    const hwmonDir = sysfsPath(root, "class", "hwmon");
    let entries: string[];
    try {
      entries = fs.readdirSync(hwmonDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("hwmon")) continue;
      const base = path.join(hwmonDir, entry);
      let chip = "sensor";
      try {
        chip = fs.readFileSync(path.join(base, "name"), "utf8").trim() || chip;
      } catch {
        /* ignore */
      }
      let files: string[];
      try {
        files = fs.readdirSync(base);
      } catch {
        continue;
      }
      for (const fname of files) {
        if (!fname.startsWith("temp") || !fname.endsWith("_input")) continue;
        const val = readTempMillidegrees(path.join(base, fname));
        if (val == null) continue;
        let label = chip;
        const labelPath = path.join(
          base,
          fname.replace("_input", "_label"),
        );
        try {
          const part = fs.readFileSync(labelPath, "utf8").trim();
          if (part) label = `${chip} · ${part}`;
        } catch {
          /* ignore */
        }
        const key = `${root}:${label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const celsius = val / 1000;
        rows.push({
          name: label,
          value: celsius,
          display: `${celsius.toFixed(0)}°C`,
        });
      }
    }

    const thermalDir = sysfsPath(root, "class", "thermal");
    let zones: string[];
    try {
      zones = fs.readdirSync(thermalDir);
    } catch {
      continue;
    }
    for (const entry of zones) {
      if (!entry.startsWith("thermal_zone")) continue;
      const base = path.join(thermalDir, entry);
      let zoneType = "thermal";
      try {
        zoneType =
          fs.readFileSync(path.join(base, "type"), "utf8").trim() || zoneType;
      } catch {
        /* ignore */
      }
      const val = readTempMillidegrees(path.join(base, "temp"));
      if (val == null) continue;
      const label = `${entry} · ${zoneType}`;
      const key = `${root}:${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const celsius = val / 1000;
      rows.push({
        name: label,
        value: celsius,
        display: `${celsius.toFixed(0)}°C`,
      });
    }
  }

  rows.sort((a, b) => b.value - a.value);
  return rows;
}

export { storageAggregate };
