import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canopy",
    short_name: "Canopy",
    description: "A vocabulary scratchpad and AI dialogue sandbox.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FDFBF7",
    theme_color: "#4A5D4E",
    icons: [
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
        purpose: "maskable",
      },
    ],
  };
}
