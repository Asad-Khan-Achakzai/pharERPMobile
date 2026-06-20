import { create } from 'zustand';
import type { Company, ServerConfig, User } from '@/domain/types';
import { secureStore } from '@/data/secureStore';
import { KV_KEYS, getKvJSON, kvStore, setKvJSON } from '@/data/kvStore';
import { queryClient } from '@/data/queryClient';
import {
  clearSessionLocalData,
  clearStoredSessionOwner,
  clearUserScopedCache,
  ensureSessionIsolation,
  setStoredSessionOwner,
} from '@/data/sessionLocalData';
import { resetSyncStatusAfterSessionChange } from '@/data/syncEngine';
import { stopBackgroundLiveTracking } from '@/features/tracking/backgroundLocationService';

interface AuthState {
  bootstrapped: boolean;
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  refreshToken: string | null;
  serverConfig: ServerConfig | null;

  bootstrap(): Promise<void>;
  setSession(p: {
    user: User;
    company: Company;
    accessToken: string;
    refreshToken: string;
  }): Promise<void>;
  setTokens(p: { accessToken: string; refreshToken: string }): Promise<void>;
  setServerConfig(cfg: ServerConfig): Promise<void>;
  signOut(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  bootstrapped: false,
  user: null,
  company: null,
  accessToken: null,
  refreshToken: null,
  serverConfig: null,

  async bootstrap() {
    const [accessToken, refreshToken, user, company, serverConfig] = await Promise.all([
      secureStore.get('accessToken'),
      secureStore.get('refreshToken'),
      getKvJSON<User>(KV_KEYS.user),
      getKvJSON<Company>(KV_KEYS.company),
      getKvJSON<ServerConfig>(KV_KEYS.serverConfig),
    ]);
    set({
      accessToken,
      refreshToken,
      user,
      company,
      serverConfig,
      bootstrapped: true,
    });
    if (user?._id && company?._id) {
      const cleared = await ensureSessionIsolation(String(user._id), String(company._id));
      await setStoredSessionOwner(String(user._id), String(company._id));
      if (cleared) {
        queryClient.clear();
        await resetSyncStatusAfterSessionChange();
      }
    }
  },

  async setSession({ user, company, accessToken, refreshToken }) {
    const cleared = await ensureSessionIsolation(String(user._id), String(company._id));
    if (cleared) {
      queryClient.clear();
    }
    await Promise.all([
      secureStore.set('accessToken', accessToken),
      secureStore.set('refreshToken', refreshToken),
      setKvJSON(KV_KEYS.user, user),
      setKvJSON(KV_KEYS.company, company),
    ]);
    set({ user, company, accessToken, refreshToken });
    await setStoredSessionOwner(String(user._id), String(company._id));
    await resetSyncStatusAfterSessionChange();
  },

  async setTokens({ accessToken, refreshToken }) {
    await Promise.all([
      secureStore.set('accessToken', accessToken),
      secureStore.set('refreshToken', refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  async setServerConfig(cfg) {
    await setKvJSON(KV_KEYS.serverConfig, cfg);
    set({ serverConfig: cfg });
  },

  async signOut() {
    const { user } = get();
    await stopBackgroundLiveTracking();
    if (user?._id) {
      await clearUserScopedCache(String(user._id));
    }
    await clearSessionLocalData();
    await clearStoredSessionOwner();
    await Promise.all([
      secureStore.clearSession(),
      kvStore.removeMany([KV_KEYS.user, KV_KEYS.company, KV_KEYS.serverConfig]),
    ]);
    set({
      user: null,
      company: null,
      accessToken: null,
      refreshToken: null,
      serverConfig: null,
    });
    queryClient.clear();
    await resetSyncStatusAfterSessionChange();
  },
}));

export function selectMediaFlags(state: AuthState) {
  const cfg = state.serverConfig?.media;
  return {
    enableMediaUpload: cfg?.enableMediaUpload ?? false,
    enableVisitPhotos: cfg?.enableVisitPhotos ?? false,
    enableExpenseReceipts: cfg?.enableExpenseReceipts ?? false,
    enableProductMedia: cfg?.enableProductMedia ?? false,
  };
}
