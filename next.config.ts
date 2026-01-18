import type { NextConfig } from "next";
import { initConfigFromEnv } from './lib/config/init.js';

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
  // Avoid tracing ephemeral Next files that might not exist in non-export builds.
  outputFileTracingExcludes: {
    '*': ['.next/export-detail.json', '.next/lock', '.next/server/proxy.js'],
  },
};

export default nextConfig;
