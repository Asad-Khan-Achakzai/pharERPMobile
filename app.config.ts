import type { ExpoConfig, ConfigContext } from 'expo/config';

const { API_BASE_URL } = require('./env.defaults') as {
  API_BASE_URL: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? API_BASE_URL;
const isLocalHttp = apiBaseUrl.startsWith('http://');

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    android: {
      ...config.android,
      ...(isLocalHttp ? { usesCleartextTraffic: true } : {}),
    },
    ios: {
      ...config.ios,
      ...(isLocalHttp
        ? {
            infoPlist: {
              ...(config.ios?.infoPlist ?? {}),
              NSAppTransportSecurity: {
                NSAllowsLocalNetworking: true,
              },
            },
          }
        : {}),
    },
    extra: {
      ...config.extra,
      apiBaseUrl,
    },
  }) as ExpoConfig;
