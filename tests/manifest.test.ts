import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("launches the installed app into the authenticated workspace", () => {
    const webAppManifest = manifest();

    expect(webAppManifest).toMatchObject({
      id: "/",
      lang: "en",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
      background_color: "#FDFBF7",
      theme_color: "#4A5D4E",
      prefer_related_applications: false,
    });
  });

  it("declares standard and maskable icons plus useful launch shortcuts", () => {
    const webAppManifest = manifest();

    expect(webAppManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/web-app-manifest-192x192.png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/web-app-manifest-192x192.png",
          purpose: "maskable",
        }),
        expect.objectContaining({
          src: "/web-app-manifest-512x512.png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/web-app-manifest-512x512.png",
          purpose: "maskable",
        }),
      ]),
    );
    expect(webAppManifest.shortcuts).toEqual([
      expect.objectContaining({ name: "Dashboard", url: "/dashboard" }),
      expect.objectContaining({ name: "Explore Chinese", url: "/explore" }),
    ]);
  });
});
