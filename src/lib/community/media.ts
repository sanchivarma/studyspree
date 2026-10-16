import { validateProfileImage } from "@/lib/profiles/schemas";
export function mediaExtension(bytes: Uint8Array, mime: string): string {
    if (!bytes.length || bytes.length > 10485760)
        throw new Error("Invalid file size");
    if (["image/png", "image/jpeg", "image/webp"].includes(mime)) {
        // Community images have a separate 10 MB budget; signature validation is shared.
        return validateProfileImage(bytes.slice(0, Math.min(bytes.length, 5242880)), mime, "banner");
    }
    const ascii = (length: number) => String.fromCharCode(...bytes.slice(0, length));
    if (mime === "image/gif" && ["GIF87a", "GIF89a"].includes(ascii(6)))
        return "gif";
    if (mime === "application/pdf" && ascii(5) === "%PDF-")
        return "pdf";
    if (mime === "audio/ogg" && ascii(4) === "OggS")
        return "ogg";
    if (mime === "audio/webm" && [26, 69, 223, 163].every((n, i) => bytes[i] === n))
        return "webm";
    if (mime === "audio/mpeg" && (ascii(3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224)))
        return "mp3";
    throw new Error("Invalid media format");
}
export async function boundedMultipart(request: Request, maxBytes = 11010048): Promise<FormData> {
    if (!request.body || !request.headers.get("content-type")?.startsWith("multipart/form-data;"))
        throw new Error("Invalid upload");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            total += value.length;
            if (total > maxBytes) {
                await reader.cancel();
                throw new Error("Upload too large");
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
}
