import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api, getOrCreateDeviceId, unwrap } from './client';
import type { Company, DeviceSession, User } from '@/domain/types';

export interface LoginResponse {
  user: User;
  company: Company;
  accessToken: string;
  refreshToken: string;
}

async function devicePayload() {
  return {
    deviceId: await getOrCreateDeviceId(),
    platform: Platform.OS as 'ios' | 'android' | 'web',
    brand: Device.brand ?? undefined,
    model: Device.modelName ?? undefined,
    osVersion: Device.osVersion ?? undefined,
    appVersion: Application.nativeApplicationVersion ?? '1.0.0',
  };
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const device = await devicePayload();
    const resp = await api.post('/auth/mobile/login', {
      email,
      password,
      device,
    });
    return unwrap<LoginResponse>(resp);
  },

  /** Current user profile incl. a fresh transient `imageUrl` (short-lived signed URL). */
  async me(): Promise<User> {
    const resp = await api.get('/auth/me');
    return unwrap<User>(resp);
  },

  async registerDevice(): Promise<{ session: DeviceSession }> {
    const device = await devicePayload();
    const resp = await api.post('/auth/mobile/register-device', { device });
    return unwrap<{ session: DeviceSession }>(resp);
  },

  async logout(): Promise<void> {
    const deviceId = await getOrCreateDeviceId();
    await api.post('/auth/mobile/logout', { deviceId }).catch(() => undefined);
  },

  async listSessions(): Promise<DeviceSession[]> {
    const resp = await api.get('/auth/mobile/sessions');
    return unwrap<DeviceSession[]>(resp);
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/auth/mobile/sessions/${sessionId}`);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/mobile/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async switchCompany(companyId: string): Promise<LoginResponse> {
    const device = await devicePayload();
    const resp = await api.post('/auth/mobile/switch-company', {
      companyId,
      device,
    });
    return unwrap<LoginResponse>(resp);
  },

  async updatePushToken(pushToken: string): Promise<void> {
    const deviceId = await getOrCreateDeviceId();
    await api.post('/auth/mobile/push-token', { deviceId, pushToken });
  },

  /**
   * Device-change flow. These are authorized by the short-lived device-change
   * token handed back when a login is blocked (DEVICE_NOT_REGISTERED), NOT a
   * normal session — so the token is passed explicitly as the bearer.
   */
  async requestDeviceChange(deviceChangeToken: string, reason?: string): Promise<DeviceChangeRequest> {
    const device = await devicePayload();
    const resp = await api.post(
      '/auth/mobile/device-change-request',
      { device, reason },
      { headers: { Authorization: `Bearer ${deviceChangeToken}` } },
    );
    return unwrap<DeviceChangeRequest>(resp);
  },

  async getDeviceChangeRequest(deviceChangeToken: string): Promise<DeviceChangeRequest | null> {
    const resp = await api.get('/auth/mobile/device-change-request', {
      headers: { Authorization: `Bearer ${deviceChangeToken}` },
    });
    return unwrap<DeviceChangeRequest | null>(resp);
  },

  async cancelDeviceChange(deviceChangeToken: string): Promise<DeviceChangeRequest> {
    const resp = await api.post(
      '/auth/mobile/device-change-request/cancel',
      {},
      { headers: { Authorization: `Bearer ${deviceChangeToken}` } },
    );
    return unwrap<DeviceChangeRequest>(resp);
  },
};

export interface DeviceChangeRequest {
  _id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedDeviceId: string;
  reason?: string | null;
  decisionNote?: string | null;
  createdAt?: string;
  decidedAt?: string | null;
}
