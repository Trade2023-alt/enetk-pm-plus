import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow FullCalendar and other ESM packages to be properly transpiled
  transpilePackages: [
    "@fullcalendar/react",
    "@fullcalendar/core",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
    "@fullcalendar/list",
  ],

  // Vercel deployment optimizations
  poweredByHeader: false,

  // Image optimization for user avatars (Clerk CDN)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default nextConfig;
