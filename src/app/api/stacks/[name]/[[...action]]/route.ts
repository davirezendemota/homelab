import { errorJson, jsonResponse } from "@/lib/api-utils";
import { stackRemove, stackRestart, stackStop } from "@/lib/docker";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string; action?: string[] }> };

export async function POST(_request: Request, { params }: Params) {
  const { name: rawName, action } = await params;
  const stack = decodeURIComponent(rawName);
  const act = action?.[0];
  try {
    if (act === "stop") await stackStop(stack);
    else if (act === "restart") await stackRestart(stack);
    else return errorJson("Not Found", 404);
    return jsonResponse({ ok: true });
  } catch (exc) {
    const message = exc instanceof Error ? exc.message : String(exc);
    if (message.includes("inválido")) return errorJson(message, 400);
    return errorJson(message, 502);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { name: rawName } = await params;
  const stack = decodeURIComponent(rawName);
  try {
    await stackRemove(stack);
    return jsonResponse({ ok: true });
  } catch (exc) {
    const message = exc instanceof Error ? exc.message : String(exc);
    if (message.includes("inválido")) return errorJson(message, 400);
    return errorJson(message, 502);
  }
}
