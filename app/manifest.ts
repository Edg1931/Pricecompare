import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reseller — Snap. Price. Profit.",
    short_name: "Reseller",
    description:
      "Photograph anything and instantly see what it resells for across major marketplaces.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0f",
    theme_color: "#0a0b0f",
    orientation: "portrait",
    categories: ["shopping", "business", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
