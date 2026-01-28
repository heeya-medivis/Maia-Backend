import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from monorepo root .env file
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const nextConfig: NextConfig = {
  turbopack: {
    // Use the monorepo root to silence the multiple lockfile warning
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
