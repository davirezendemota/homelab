import { openContainerLogStream } from "@/lib/logs";

export const runtime = "nodejs";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { ref: raw } = await params;
  const ref = decodeURIComponent(raw);
  try {
    const stream = await openContainerLogStream(ref);
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (exc) {
    const message = exc instanceof Error ? exc.message : String(exc);
    const status = message.includes("inválida") ? 400 : 502;
    return new Response(message, {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
