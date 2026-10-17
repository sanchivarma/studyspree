import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const smtp = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), close: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.create } }));
import { deliverInvitation } from "./delivery";
const message = { subject: "Join StudySpree", text: "Join us", html: "<p>Join us</p>" };
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("sends Gmail mail over TLS and never enables file or URL attachments", async () => {
  smtp.create.mockReturnValue({ sendMail: smtp.send, close: smtp.close });
  smtp.send.mockResolvedValue({ accepted: ["friend@example.test"], rejected: [] });
  expect(await deliverInvitation({ kind: "smtp", host: "smtp.gmail.com", port: 465, user: "sender@gmail.com", pass: "test-password", from: "sender@gmail.com", siteUrl: "https://study.example.test" }, "friend@example.test", "request", message)).toBe("sent");
  expect(smtp.create).toHaveBeenCalledWith(expect.objectContaining({ secure: true, disableFileAccess: true, disableUrlAccess: true }));
  expect(smtp.close).toHaveBeenCalledOnce();
});
it("reports SMTP rejection as an error and closes the connection", async () => {
  smtp.create.mockReturnValue({ sendMail: smtp.send, close: smtp.close });
  smtp.send.mockResolvedValue({ accepted: [], rejected: ["friend@example.test"] });
  await expect(deliverInvitation({ kind: "smtp", host: "smtp.gmail.com", port: 587, user: "sender@gmail.com", pass: "test-password", from: "sender@gmail.com", siteUrl: "https://study.example.test" }, "friend@example.test", "request", message)).rejects.toThrow();
  expect(smtp.create).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true }));
  expect(smtp.close).toHaveBeenCalledOnce();
});
it("distinguishes local capture from real delivery and surfaces provider errors", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })); vi.stubGlobal("fetch", fetcher);
  expect(await deliverInvitation({ kind: "mailpit", from: "invites@studyspree.local", siteUrl: "http://localhost:3000" }, "friend@example.test", "request", message)).toBe("captured");
  expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:55324/api/v1/send");
  fetcher.mockResolvedValue(new Response("{}", { status: 503 }));
  await expect(deliverInvitation({ kind: "resend", key: "test-key", from: "sender@example.test", siteUrl: "https://study.example.test" }, "friend@example.test", "request", message)).rejects.toThrow();
});
