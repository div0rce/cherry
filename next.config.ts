import type { NextConfig } from "next";
import { initConfigFromEnv } from "./lib/config/init.js";

initConfigFromEnv(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
