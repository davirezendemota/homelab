import { headers } from "next/headers";

function hostFromRaw(raw: string): string {
  const host = raw.split(",")[0]?.split(":")[0]?.trim() || "localhost";
  if (host === "0.0.0.0" || host === "[::]" || host === "::") {
    return "localhost";
  }
  return host;
}

/** Hostname used in container port links (http://HOST:port). */
export function linkHost(requestHost: string): string {
  const override = process.env.LINK_HOST?.trim();
  if (override) {
    return hostFromRaw(override);
  }
  return requestHost;
}

export async function requestHost(): Promise<string> {
  const h = await headers();
  const raw = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  return linkHost(hostFromRaw(raw));
}

export function requestHostFromHeaderValue(raw: string | null): string {
  return linkHost(hostFromRaw(raw ?? "localhost"));
}
