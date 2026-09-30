import { jsonResponse } from "@/lib/api-utils";
import { getPagePayload } from "@/lib/metrics-cache";
import { requestHost } from "@/lib/request-host";

export const runtime = "nodejs";

export async function GET() {
  const host = await requestHost();
  const payload = await getPagePayload(host);
  return jsonResponse(payload);
}
