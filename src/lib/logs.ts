import { PassThrough } from "stream";
import {
  containerHasTty,
  dockerOpenStream,
  openContainerLogsPath,
  validateContainerRef,
} from "./docker";

export async function openContainerLogStream(
  ref: string,
): Promise<NodeJS.ReadableStream> {
  validateContainerRef(ref);
  const path = await openContainerLogsPath(ref);
  const tty = await containerHasTty(ref);
  const { stream } = await dockerOpenStream(path);

  if (tty) {
    return stream;
  }

  return demuxDockerLogs(stream);
}

function demuxDockerLogs(stream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const out = new PassThrough();

  stream.on("data", (chunk: Buffer) => {
    let offset = 0;
    while (offset + 8 <= chunk.length) {
      const size = chunk.readUInt32BE(offset + 4);
      offset += 8;
      if (size <= 0) continue;
      if (offset + size > chunk.length) break;
      out.write(chunk.subarray(offset, offset + size));
      offset += size;
    }
  });
  stream.on("end", () => out.end());
  stream.on("error", (err) => out.destroy(err));

  return out;
}
