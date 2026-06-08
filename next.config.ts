import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-auth",
    "@better-auth/core",
    "@better-auth/drizzle-adapter",
    "@better-auth/kysely-adapter",
    "@node-rs/jieba",
  ],
};

export default nextConfig;
