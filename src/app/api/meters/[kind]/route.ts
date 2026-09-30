import { jsonResponse, errorJson } from "@/lib/api-utils";
import { getMeterDetail } from "@/lib/metrics-cache";

export const runtime = "nodejs";

type Params = { params: Promise<{ kind: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { kind: raw } = await params;
  const kind = decodeURIComponent(raw).replace(/\/$/, "");
  try {
    return jsonResponse(await getMeterDetail(kind));
  } catch (exc) {
    return jsonResponse(
      { kind, error: exc instanceof Error ? exc.message : String(exc) },
      400,
    );
  }
}
