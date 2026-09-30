import {
  containerCpuPct,
  containerMemoryBytes,
  containerName,
  containerStack,
  dockerGet,
  runningContainerStats,
  type ContainerRow,
} from "./docker";
import {
  formatBytes,
  formatPct,
  ramStats,
  storageAggregate,
  storageMounts,
  temperatureSensorDetails,
} from "./host-metrics";

function meterDetailCpuFromStats(
  pairs: Array<{ container: Record<string, unknown>; stats: Record<string, unknown> }>,
): Record<string, unknown> {
  const rows = pairs.map(({ container, stats }) => {
    const pct = containerCpuPct(stats as Parameters<typeof containerCpuPct>[0]);
    return {
      name: containerName(container as Parameters<typeof containerName>[0]),
      sub: containerStack(container as Parameters<typeof containerStack>[0]),
      value: pct,
      display: formatPct(pct),
    };
  });
  rows.sort((a, b) => (b.value as number) - (a.value as number));
  return { rows, total: 100 };
}

function meterDetailRamFromStats(
  pairs: Array<{ container: Record<string, unknown>; stats: Record<string, unknown> }>,
): Record<string, unknown> {
  const [ramPct, ramUsedGb, ramTotalGb] = ramStats();
  const ramTotalBytes = Math.floor(ramTotalGb * 1024 ** 3);
  const rows = pairs.map(({ container, stats }) => {
    const usage = containerMemoryBytes(
      stats as Parameters<typeof containerMemoryBytes>[0],
    );
    const pctOfTotal =
      ramTotalBytes > 0 ? (usage / ramTotalBytes) * 100 : 0;
    return {
      name: containerName(container as Parameters<typeof containerName>[0]),
      sub: containerStack(container as Parameters<typeof containerStack>[0]),
      value: usage,
      display: `${formatBytes(usage)} · ${formatPct(pctOfTotal)}`,
    };
  });
  rows.sort((a, b) => (b.value as number) - (a.value as number));
  return {
    rows,
    total: Math.max(ramTotalBytes, 1),
    summary: {
      sub: `${ramUsedGb.toFixed(1)} / ${ramTotalGb.toFixed(0)} GB`,
      display: `${ramPct}%`,
    },
  };
}

function imageDisplayName(image: Record<string, unknown>): string {
  const tags = (image.RepoTags as string[] | undefined) ?? [];
  if (tags.length) return tags[0]!;
  const imageId = String(image.Id ?? "");
  if (imageId.startsWith("sha256:")) return imageId.slice(7, 19);
  return imageId || "sem tag";
}

async function meterDetailStorage(): Promise<Record<string, unknown>> {
  const df = await dockerGet<Record<string, unknown>>("/system/df");
  const volumes = (df.Volumes as Array<Record<string, unknown>>) ?? [];
  const volumeSizes: Record<string, number> = {};
  for (const vol of volumes) {
    const usage = (vol.UsageData as { Size?: number }) ?? {};
    volumeSizes[String(vol.Name ?? "")] = Number(usage.Size ?? 0);
  }

  const containerRows: Array<Record<string, unknown>> = [];
  for (const raw of (df.Containers as Array<Record<string, unknown>>) ?? []) {
    const container = raw as {
      Names?: string[];
      Id?: string;
      SizeRw?: number;
      SizeRootFs?: number;
      Mounts?: Array<{ Type?: string; Name?: string }>;
      Labels?: Record<string, string>;
    };
    const writable = Number(container.SizeRw ?? 0);
    const imageLayer = Number(container.SizeRootFs ?? 0);
    let volumesSize = 0;
    for (const mount of container.Mounts ?? []) {
      if (String(mount.Type ?? "").toLowerCase() !== "volume") continue;
      volumesSize += volumeSizes[String(mount.Name ?? "")] ?? 0;
    }
    const total = writable + imageLayer + volumesSize;
    containerRows.push({
      name: String(container.Names?.[0] ?? container.Id ?? "").replace(/^\//, ""),
      sub: container.Labels?.["com.docker.compose.project"] ?? "sem stack",
      value: total,
      display: formatBytes(total),
      writable: formatBytes(writable),
      image: formatBytes(imageLayer),
      volumes: formatBytes(volumesSize),
    });
  }
  containerRows.sort((a, b) => (b.value as number) - (a.value as number));

  const imageRows: Array<Record<string, unknown>> = [];
  for (const image of (df.Images as Array<Record<string, unknown>>) ?? []) {
    const size = Number(image.Size ?? 0);
    imageRows.push({
      name: imageDisplayName(image),
      sub: `${image.Containers ?? 0} container(s)`,
      value: size,
      display: formatBytes(size),
    });
  }
  imageRows.sort((a, b) => (b.value as number) - (a.value as number));

  const volumeRows: Array<Record<string, unknown>> = [];
  for (const volume of volumes) {
    const usage = (volume.UsageData as { Size?: number; RefCount?: number }) ??
      {};
    const size = Number(usage.Size ?? 0);
    volumeRows.push({
      name: String(volume.Name ?? "volume"),
      sub: `${usage.RefCount ?? 0} referência(s)`,
      value: size,
      display: formatBytes(size),
    });
  }
  volumeRows.sort((a, b) => (b.value as number) - (a.value as number));

  const buildRows: Array<Record<string, unknown>> = [];
  for (const entry of (df.BuildCache as Array<Record<string, unknown>>) ??
    []) {
    const size = Number(entry.Size ?? 0);
    const description =
      String(entry.Description ?? entry.ID ?? "build cache");
    const shared = entry.Shared ? "compartilhado" : "exclusivo";
    buildRows.push({
      name: description,
      sub: shared,
      value: size,
      display: formatBytes(size),
    });
  }
  buildRows.sort((a, b) => (b.value as number) - (a.value as number));

  const [mainDisk, extraMounts] = storageMounts();
  const [, , storageTotalGb] = storageAggregate(mainDisk, extraMounts);
  const storageTotalBytes = Math.max(
    Math.floor(storageTotalGb * 1024 ** 3),
    1,
  );

  return {
    total: storageTotalBytes,
    sections: [
      {
        title: "Containers",
        rows: containerRows,
        columns: ["writable", "image", "volumes"],
      },
      { title: "Imagens", rows: imageRows },
      { title: "Volumes", rows: volumeRows },
      { title: "Build cache", rows: buildRows },
    ],
  };
}

const HANDLERS: Record<
  string,
  () => Promise<Record<string, unknown>> | Record<string, unknown>
> = {
  cpu: async () => meterDetailCpuFromStats(await runningContainerStats()),
  ram: async () => meterDetailRamFromStats(await runningContainerStats()),
  storage: () => meterDetailStorage(),
  temp: () => ({ rows: temperatureSensorDetails(), total: 100 }),
};

export async function meterDetailPayload(
  kind: string,
): Promise<Record<string, unknown>> {
  const handler = HANDLERS[kind];
  if (!handler) {
    throw new Error("Tipo de métrica inválido");
  }
  const data = await handler();
  return { ...data, kind };
}

export async function refreshMeterDetailCpuRam(
  pairs: Awaited<ReturnType<typeof runningContainerStats>>,
): Promise<{ cpu: Record<string, unknown>; ram: Record<string, unknown> }> {
  return {
    cpu: meterDetailCpuFromStats(pairs),
    ram: meterDetailRamFromStats(pairs),
  };
}
