import { z } from "zod";
import entries from "./radio-stations.json";

const httpsUrl = z.url().refine(value => new URL(value).protocol === "https:");
export const radioStationsSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), website: httpsUrl,
  streamUrl: httpsUrl.nullable(), embedUrl: httpsUrl.nullable(), permissionUrl: httpsUrl,
}).strict().refine(station => Boolean(station.streamUrl) !== Boolean(station.embedUrl), "Choose one playback method"))
  .refine(stations => new Set(stations.map(station => station.id)).size === stations.length, "Station IDs must be unique");
export const radioStations = radioStationsSchema.parse(entries);
