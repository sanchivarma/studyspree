import { describe, expect, it } from "vitest";
import { profileEditSchema, publicProfileSchema, validateProfileImage } from "./schemas";
const edit = { displayName: "Maya", bio: "Reading", countryCode: "DE", occupation: "Student", interests: ["Books"], lookingFor: [], socials: [], isPublic: false };
describe("profile boundaries", () => {
  it("validates limited fields without accepting account or duration data", () => {
    expect(profileEditSchema.parse(edit)).toEqual(edit);
    for (const extra of [{ email: "a@example.com" }, { id: "other" }, { duration: 4 }, { elapsed: 2 }, { actualSeconds: 30 }]) expect(profileEditSchema.safeParse({ ...edit, ...extra }).success).toBe(false);
  });
  it("rejects long, duplicate or empty tags and unsafe links", () => {
    for (const interests of [["A", "a"], [""], ["x".repeat(41)], Array.from({ length: 11 }, (_, i) => String(i))]) expect(profileEditSchema.safeParse({ ...edit, interests }).success).toBe(false);
    for (const url of ["javascript:alert(1)", "http://example.com", "https://user:password@example.com"]) expect(profileEditSchema.safeParse({ ...edit, socials: [{ label: "Site", url }] }).success).toBe(false);
    expect(profileEditSchema.safeParse({ ...edit, socials: [{ label: "Site", url: "https://example.com" }] }).success).toBe(true);
  });
  it("keeps private flags and personal data outside the public DTO", () => {
    const { isPublic: _visibility, ...fields } = edit;
    const data = { ...fields, id: "10000000-0000-4000-8000-000000000001", username: "maya", joinedAt: "2026-10-15T00:00:00+00:00", avatarPath: null, bannerPath: null, followers: 0, following: 0, isFollowing: false, isSelf: false };
    expect(publicProfileSchema.safeParse(data).success).toBe(true);
    for (const key of ["email", "timezone", "isPublic", "webcamEnabled"]) expect(publicProfileSchema.safeParse({ ...data, [key]: "private" }).success).toBe(false);
    expect(_visibility).toBe(false);
  });
  it("checks upload magic bytes, size and MIME rather than filenames", () => {
    const png = new Uint8Array([137,80,78,71,13,10,26,10]);
    expect(validateProfileImage(png,"image/png","avatar")).toBe("png");
    expect(() => validateProfileImage(png,"image/jpeg","avatar")).toThrow();
    expect(() => validateProfileImage(new TextEncoder().encode("<svg/>"),"image/svg+xml","avatar")).toThrow();
    expect(() => validateProfileImage(new Uint8Array(2 * 1024 * 1024 + 1),"image/png","avatar")).toThrow();
  });
});
