import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { localPreviewAudio } from "@/lib/audio/localPreview";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) return new Response(null, { status: 404, headers });
  const { id } = await context.params;
  const entry = Object.values(localPreviewAudio).find(entry => entry.file === id);
  if (!entry) return new Response(null, { status: 404, headers });
  try {
    // The filename comes exclusively from the fixed catalog, never a user path.
    const bytes = await readFile(resolve(process.cwd(), ".local/audio", entry.file));
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "audio/mpeg", "Content-Length": String(bytes.length) } });
  } catch { return new Response(null, { status: 404, headers }); }
}
