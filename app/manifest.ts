import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canopy",
    short_name: "Canopy",
    description:
      "A private Mandarin vocabulary workspace for review, reading, and conversation practice.",
    id: "/",
    lang: "en",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FDFBF7",
    theme_color: "#4A5D4E",
    categories: ["education", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open your vocabulary review dashboard.",
        url: "/dashboard",
      },
      {
        name: "Explore Chinese",
        short_name: "Explore",
        description: "Search the Chinese dictionary and try low-stakes practice.",
        url: "/explore",
      },
    ],
  };
}
