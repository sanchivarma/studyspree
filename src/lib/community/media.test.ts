import { expect, it } from "vitest";
import { boundedMultipart, mediaExtension } from "./media";
it("accepts matching attachment signatures and rejects disguised or oversized files", () => {
    expect(mediaExtension(new TextEncoder().encode("GIF89atest"), "image/gif")).toBe("gif");
    expect(mediaExtension(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe("pdf");
    expect(mediaExtension(new Uint8Array([26, 69, 223, 163]), "audio/webm")).toBe("webm");
    expect(() => mediaExtension(new TextEncoder().encode("<script>"), "image/gif")).toThrow();
    expect(() => mediaExtension(new Uint8Array(10485761), "image/gif")).toThrow();
});
it("bounds upload streams before parsing multipart", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(100)); controller.close(); } });
    const request = new Request("http://localhost/upload", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=test" }, body: stream, duplex: "half" } as RequestInit);
    await expect(boundedMultipart(request, 50)).rejects.toThrow("Upload too large");
});
