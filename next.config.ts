import type { NextConfig } from "next";
import { initConfigFromEnv } from './lib/config/init';

initConfigFromEnv(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    },
  },
  // Avoid tracing a Next export detail file that doesn't exist in non-export builds.
  outputFileTracingExcludes: {
    '*': ['.next/export-detail.json'],
  },
};

export default nextConfig;
