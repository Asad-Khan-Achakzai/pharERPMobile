import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@/config/env';
import { secureStore } from '@/data/secureStore';
import { useAuthStore } from '@/state/authStore';

function getBaseUrl(): string {
  return `${env.apiBaseUrl.replace(/\/$/, '')}/api/${env.apiVersion}`;
}

let cachedDeviceId: string | null = null;
async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = await secureStore.get('deviceId');
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const fresh = uuidv4();
  await secureStore.set('deviceId', fresh);
  cachedDeviceId = fresh;
  return fresh;
}

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
  status: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(p: ApiErrorPayload) {
    super(p.message);
    this.status = p.status;
    this.code = p.code;
    this.details = p.details;
  }
}

function buildClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: getBaseUrl(),
    timeout: 25000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(async (config) => {
    const auth = useAuthStore.getState();
    const deviceId = await getOrCreateDeviceId();
    config.headers = config.headers ?? {};
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    config.headers['X-Device-Id'] = deviceId;
    config.headers['X-Client'] = 'pharerp-mobile';
    config.headers['X-Client-Version'] = '1.0.0';
    if (config.method && config.method.toLowerCase() !== 'get') {
      config.headers['X-Client-Uuid'] =
        (config.headers['X-Client-Uuid'] as string | undefined) ?? uuidv4();
    }
    return config;
  });

  let refreshing: Promise<string | null> | null = null;
  async function refreshAccessToken(): Promise<string | null> {
    const { refreshToken, setTokens, signOut } = useAuthStore.getState();
    if (!refreshToken) return null;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const deviceId = await getOrCreateDeviceId();
        const r = await axios.post(
          `${getBaseUrl()}/auth/mobile/refresh`,
          { refreshToken, deviceId },
          { timeout: 15000 },
        );
        const next = r.data?.data ?? r.data;
        if (next?.accessToken && next?.refreshToken) {
          await setTokens({
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
          });
          return next.accessToken as string;
        }
        await signOut();
        return null;
      } catch {
        await signOut();
        return null;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  instance.interceptors.response.use(
    (resp) => resp,
    async (error: AxiosError) => {
      const original = error.config as
        | (AxiosRequestConfig & { _retry?: boolean })
        | undefined;
      const status = error.response?.status ?? 0;

      if (status === 401 && original && !original._retry) {
        original._retry = true;
        const next = await refreshAccessToken();
        if (next) {
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${next}`;
          return instance.request(original);
        }
      }

      const payload = (error.response?.data ?? {}) as {
        message?: string;
        error?: { message?: string; code?: string };
        code?: string;
      };
      const isNetworkFailure = !error.response && error.code === 'ERR_NETWORK';
      throw new ApiError({
        status,
        code: payload.code ?? payload.error?.code,
        message: isNetworkFailure
          ? `Cannot reach backend at ${env.apiBaseUrl}. Use your Mac's LAN IP in env.defaults.js, keep phone on the same Wi‑Fi, and ensure the backend is running on port 5001.`
          : (payload.message ??
            payload.error?.message ??
            error.message ??
            'Request failed'),
        details: error.response?.data,
      });
    },
  );

  return instance;
}

export const api = buildClient();

export type Envelope<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export function unwrap<T>(resp: { data: Envelope<T> | T }): T {
  const body = resp.data as Envelope<T>;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return resp.data as T;
}

export { getOrCreateDeviceId };
