import { describe, expect, it } from "vitest";
import { radioStations, radioStationsSchema } from "./radio";

describe("editable radio catalog", () => {
  it("ships distinct permitted HTTPS player entries", () => {
    expect(radioStations).toHaveLength(6);
    expect(radioStations.every(station => station.permissionUrl && station.embedUrl)).toBe(true);
  });
  it("rejects duplicate IDs, unsafe URLs and ambiguous playback methods", () => {
    const station = radioStations[0];
    expect(radioStationsSchema.safeParse([station, station]).success).toBe(false);
    expect(radioStationsSchema.safeParse([{ ...station, embedUrl: "javascript:alert(1)" }]).success).toBe(false);
    expect(radioStationsSchema.safeParse([{ ...station, streamUrl: "https://example.test/radio.mp3" }]).success).toBe(false);
    expect(radioStationsSchema.safeParse([{ ...station, permissionUrl: null }]).success).toBe(false);
  });
});
