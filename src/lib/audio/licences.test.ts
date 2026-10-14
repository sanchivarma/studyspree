import { describe, expect, it } from "vitest";
import { validateAudioLicences } from "../../../scripts/check-audio-licences";

const row = "| rain.webm | Original silence | CC0-1.0 | 2026-10-14 | yes | docs/certificate.md |";
describe("audio licence gate", () => {
  it("accepts recorded commercial permission and a certificate", () => {
    expect(validateAudioLicences(["rain.webm"], row, () => true)).toEqual([]);
  });
  it("rejects every unlisted file, duplicates, incomplete records and missing certificates", () => {
    expect(validateAudioLicences(["rain.webm", "unlicensed.mp3"], row, () => true)).toContain("unlicensed.mp3: expected one recorded licence entry");
    expect(validateAudioLicences(["rain.webm"], `${row}\n${row}`, () => true)).toHaveLength(1);
    expect(validateAudioLicences(["rain.webm"], row.replace("Original silence", ""), () => true)).toContain("rain.webm: incomplete licence metadata");
    expect(validateAudioLicences(["rain.webm"], row, () => false)).toContain("rain.webm: licence certificate is missing");
  });
  it("rejects denied commercial use and an unrecorded date", () => {
    expect(validateAudioLicences(["rain.webm"], row.replace(" yes ", " no "), () => true)).toContain("rain.webm: commercial app use is not permitted");
    expect(validateAudioLicences(["rain.webm"], row.replace("2026-10-14", "unknown"), () => true)).toContain("rain.webm: invalid recorded date");
  });
});
