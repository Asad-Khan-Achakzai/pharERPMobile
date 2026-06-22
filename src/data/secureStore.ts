import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore is hardware-backed (Keychain / Keystore) but values are capped
 * around 2 KB. We use it exclusively for **secrets**:
 *   - accessToken (JWT)
 *   - refreshToken
 *   - deviceId (stable per device, but tiny)
 *
 * Non-secret/larger payloads (user, company, serverConfig) live in the SQLite
 * `kv` table via `kvStore.ts`. See `authStore.ts` for the orchestration.
 */
const KEYS = {
  accessToken: 'pharerp.accessToken',
  refreshToken: 'pharerp.refreshToken',
  deviceId: 'pharerp.deviceId',
} as const;

export type SecureKey = keyof typeof KEYS;

export const secureStore = {
  async get(key: SecureKey): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS[key]);
  },
  async set(key: SecureKey, value: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS[key], value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async remove(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS[key]);
  },
  async clearSession(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
    ]);
  },
};
