export const runtime = "nodejs";

export function jsonResponse(
  payload: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function errorJson(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
