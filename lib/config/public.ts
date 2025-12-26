export type PublicConfig = {
  appBaseUrl: string;
};

export function assertPublicConfig(config: PublicConfig): PublicConfig {
  if (typeof config.appBaseUrl !== 'string') {
    throw new Error('PublicConfig.appBaseUrl required');
  }
  const trimmed = config.appBaseUrl.trim();
  if (trimmed === '') {
    throw new Error('PublicConfig.appBaseUrl required');
  }
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error('PublicConfig.appBaseUrl must be absolute');
  }
  return config;
}
