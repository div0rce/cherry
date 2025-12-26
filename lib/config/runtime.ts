export type RuntimeConfig = {
  enableLogs: boolean;
};

export function assertRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  if (typeof config.enableLogs !== 'boolean') {
    throw new Error('RuntimeConfig.enableLogs must be boolean');
  }
  return config;
}
