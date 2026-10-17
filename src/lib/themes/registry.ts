export const themeSlugs = ["rain-desk", "night-shift", "balcony-dusk", "dorm-bunk", "nature-day", "nature-night", "sci-fi", "space"] as const;
export type ThemeSlug = typeof themeSlugs[number];

export type Theme = {
  slug: ThemeSlug;
  name: string;
  description: string;
  accentColor: string;
  gradient: string;
  mp4: string;
  webm: string;
  poster: string;
};

export const themes: readonly Theme[] = [
  {
    slug: "rain-desk",
    name: "Rainy Desk",
    description: "A warm desk light beside a quiet, rain-filled window.",
    accentColor: "#e8a35c",
    gradient:
      "radial-gradient(ellipse at 8% 100%, rgba(232, 163, 92, 0.58) 0%, transparent 58%), linear-gradient(145deg, #081321 0%, #162c43 55%, #674329 100%)",
    mp4: "/themes/rain-desk/scene-v1.mp4",
    webm: "/themes/rain-desk/scene-v1.webm",
    poster: "/themes/rain-desk/poster-v1.jpg",
  },
  {
    slug: "night-shift",
    name: "Night Shift",
    description: "Soft blue night surrounds a few distant, warmly lit windows.",
    accentColor: "#6aa7d8",
    gradient:
      "linear-gradient(rgba(232, 163, 92, 0.14), rgba(232, 163, 92, 0.14)) 18% 34% / 26px 26px no-repeat, linear-gradient(rgba(232, 163, 92, 0.09), rgba(232, 163, 92, 0.09)) 27% 46% / 18px 18px no-repeat, linear-gradient(rgba(232, 163, 92, 0.12), rgba(232, 163, 92, 0.12)) 76% 28% / 22px 22px no-repeat, radial-gradient(ellipse at 70% 85%, #193b56 0%, transparent 65%), linear-gradient(160deg, #05070d 0%, #101d2e 100%)",
    mp4: "/themes/night-shift/scene-v1.mp4",
    webm: "/themes/night-shift/scene-v1.webm",
    poster: "/themes/night-shift/poster-v1.jpg",
  },
  {
    slug: "balcony-dusk",
    name: "Balcony Dusk",
    description: "The day's golden light settles into rose and dusk purple.",
    accentColor: "#f0b050",
    gradient:
      "radial-gradient(ellipse at 20% 15%, rgba(240, 176, 80, 0.35) 0%, transparent 65%), linear-gradient(165deg, #b98739 0%, #9b5968 46%, #34243e 100%)",
    mp4: "/themes/balcony-dusk/scene-v1.mp4",
    webm: "/themes/balcony-dusk/scene-v1.webm",
    poster: "/themes/balcony-dusk/poster-v1.jpg",
  },
  {
    slug: "dorm-bunk",
    name: "Dorm Bunk",
    description: "A pale blue glow lights a calm corner of the dorm.",
    accentColor: "#7ad0ff",
    gradient:
      "radial-gradient(ellipse at 75% 50%, rgba(122, 208, 255, 0.3) 0%, rgba(37, 71, 96, 0.2) 30%, transparent 65%), linear-gradient(110deg, #030508 0%, #09111b 100%)",
    mp4: "/themes/dorm-bunk/scene-v1.mp4",
    webm: "/themes/dorm-bunk/scene-v1.webm",
    poster: "/themes/dorm-bunk/poster-v1.jpg",
  },
  ...([
    { slug: "nature-day", name: "Nature Day", description: "Sunlight, forest hills and a quiet river.", accentColor: "#a9ce8a", gradient: "linear-gradient(160deg, #89bfc4, #538571 60%, #285443)" },
    { slug: "nature-night", name: "Nature Night", description: "Moonlit trees, soft river reflections and fireflies.", accentColor: "#a8c9d9", gradient: "radial-gradient(ellipse at 70% 20%, #365b70, transparent 55%), linear-gradient(#08152f, #102c33)" },
    { slug: "sci-fi", name: "Sci-Fi Observatory", description: "A quiet orbital observatory with cyan console lights.", accentColor: "#73d9d9", gradient: "radial-gradient(ellipse at 60% 40%, #397685, transparent 50%), linear-gradient(#061c2b, #163d4d)" },
    { slug: "space", name: "Deep Space", description: "Distant stars and a ringed planet above an orbital deck.", accentColor: "#c6a4e5", gradient: "radial-gradient(ellipse at 75% 40%, #8b6e92, transparent 50%), linear-gradient(#100b29, #332247)" },
  ] as const).map(theme => ({ ...theme, mp4: `/themes/${theme.slug}/scene-v1.mp4`, webm: `/themes/${theme.slug}/scene-v1.webm`, poster: `/themes/${theme.slug}/poster-v1.jpg` })),
];

export function getTheme(slug: string): Theme {
  // Keep the scene available if a future saved selection no longer exists.
  return themes.find((theme) => theme.slug === slug) ?? themes[0];
}
