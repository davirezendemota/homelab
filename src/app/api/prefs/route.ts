import { jsonResponse, errorJson } from "@/lib/api-utils";
import { getPrefs, updatePrefs } from "@/lib/prefs";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse(getPrefs());
}

export async function PUT(request: Request) {
  try {
    const data = (await request.json()) as Record<string, unknown>;
    if (data && typeof data === "object") {
      return jsonResponse(updatePrefs(data));
    }
    return errorJson("Corpo deve ser um objeto JSON", 400);
  } catch {
    return errorJson("JSON inválido", 400);
  }
}
