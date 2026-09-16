import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prompts are read from disk at runtime; make sure deployed functions include them.
  outputFileTracingIncludes: {
    "/api/**": ["./prompts/**"],
  },
};

export default nextConfig;
