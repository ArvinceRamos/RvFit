import type { MetadataRoute } from "next";

// Lets phones add RvFit to the home screen and open it like an app (no browser bar).
// Opening it goes to Today; a guest is sent to log in from there.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RvFit",
    short_name: "RvFit",
    description: "Simple starting calorie and macro estimates.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#161a18",
    theme_color: "#161a18",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
