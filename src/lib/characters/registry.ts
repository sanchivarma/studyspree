export type CharacterSlug = "rain-desk" | "night-shift" | "balcony-dusk" | "dorm-bunk";

export type Character = {
  slug: CharacterSlug;
  name: string;
  description: string;
  accentColor: string;
  gradient: string;
  mp4: string;
  webm: string;
  poster: string;
};

export const characters: readonly Character[] = [
  {
    slug: "rain-desk",
    name: "Rainy Desk",
    description: "A warm desk light beside a quiet, rain-filled window.",
    accentColor: "#e8a35c",
    gradient:
      "radial-gradient(ellipse at 8% 100%, rgba(232, 163, 92, 0.58) 0%, transparent 58%), linear-gradient(145deg, #081321 0%, #162c43 55%, #674329 100%)",
    mp4: "/characters/rain-desk/loop.mp4",
    webm: "/characters/rain-desk/loop.webm",
    poster: "/characters/rain-desk/poster.jpg",
  },
  {
    slug: "night-shift",
    name: "Night Shift",
    description: "Soft blue night surrounds a few distant, warmly lit windows.",
    accentColor: "#6aa7d8",
    gradient:
      "linear-gradient(rgba(232, 163, 92, 0.14), rgba(232, 163, 92, 0.14)) 18% 34% / 26px 26px no-repeat, linear-gradient(rgba(232, 163, 92, 0.09), rgba(232, 163, 92, 0.09)) 27% 46% / 18px 18px no-repeat, linear-gradient(rgba(232, 163, 92, 0.12), rgba(232, 163, 92, 0.12)) 76% 28% / 22px 22px no-repeat, radial-gradient(ellipse at 70% 85%, #193b56 0%, transparent 65%), linear-gradient(160deg, #05070d 0%, #101d2e 100%)",
    mp4: "/characters/night-shift/loop.mp4",
    webm: "/characters/night-shift/loop.webm",
    poster: "/characters/night-shift/poster.jpg",
  },
  {
    slug: "balcony-dusk",
    name: "Balcony Dusk",
    description: "The day's golden light settles into rose and dusk purple.",
    accentColor: "#f0b050",
    gradient:
      "radial-gradient(ellipse at 20% 15%, rgba(240, 176, 80, 0.35) 0%, transparent 65%), linear-gradient(165deg, #b98739 0%, #9b5968 46%, #34243e 100%)",
    mp4: "/characters/balcony-dusk/loop.mp4",
    webm: "/characters/balcony-dusk/loop.webm",
    poster: "/characters/balcony-dusk/poster.jpg",
  },
  {
    slug: "dorm-bunk",
    name: "Dorm Bunk",
    description: "A pale blue glow lights a calm corner of the dorm.",
    accentColor: "#7ad0ff",
    gradient:
      "radial-gradient(ellipse at 75% 50%, rgba(122, 208, 255, 0.3) 0%, rgba(37, 71, 96, 0.2) 30%, transparent 65%), linear-gradient(110deg, #030508 0%, #09111b 100%)",
    mp4: "/characters/dorm-bunk/loop.mp4",
    webm: "/characters/dorm-bunk/loop.webm",
    poster: "/characters/dorm-bunk/poster.jpg",
  },
];

export function getCharacter(slug: string): Character {
  // Keep the scene available if a future saved selection no longer exists.
  return characters.find((character) => character.slug === slug) ?? characters[0];
}
