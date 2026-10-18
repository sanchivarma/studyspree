import { expect, it } from "vitest";
import { LocalRepository } from "@/lib/repo/local";
import { roomAudioSchema, silentRoomAudio } from "@/lib/community/roomControls";

it("retains all three piano selections and independent levels after repository recreation", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const backgroundEffects = ["piano-nocturne", "piano-gymnopedie", "piano-moonlight"] as const;
  const effectVolumes = { "piano-nocturne": 0.25, "piano-gymnopedie": 0.4, "piano-moonlight": 0.6 };
  await new LocalRepository(() => storage).updateProfile({ backgroundEffects: [...backgroundEffects], effectVolumes });
  expect(await new LocalRepository(() => storage).getProfile()).toMatchObject({ backgroundEffects, effectVolumes });
  expect(roomAudioSchema.safeParse({ ...silentRoomAudio, backgroundEffects, effectVolumes }).success).toBe(true);
  expect(roomAudioSchema.safeParse({ ...silentRoomAudio, backgroundEffects: ["piano-nocturne", "piano-nocturne"] }).success).toBe(false);
  expect(roomAudioSchema.safeParse({ ...silentRoomAudio, effectVolumes: { "piano-nocturne": 1.1 } }).success).toBe(false);
});
