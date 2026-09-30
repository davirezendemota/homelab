import type { NextConfig } from "next";

const defaultDevOrigins = ["homelab", "homelab01"];

const allowedDevOrigins = [
  ...defaultDevOrigins,
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins,
};

export default nextConfig;
