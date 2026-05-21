import { useAuthStore } from '@/state/authStore';
import { env } from '@/config/env';

export interface ResolvedFlags {
  enableMediaUpload: boolean;
  enableVisitPhotos: boolean;
  enableExpenseReceipts: boolean;
  enableProductMedia: boolean;
  attendanceGeofenceEnabled: boolean;
  attendanceSelfieEnabled: boolean;
  doctorApprovalRequired: boolean;
  source: 'server' | 'env';
}

/**
 * Resolves feature flags. Server-config (after login) takes precedence; before
 * that we fall back to compile-time env defaults. UI never disappears based on
 * these flags - only behaviour gates do (see useGatedAction).
 */
export function useFlags(): ResolvedFlags {
  const cfg = useAuthStore((s) => s.serverConfig);
  if (cfg) {
    return {
      enableMediaUpload: cfg.media.enableMediaUpload,
      enableVisitPhotos: cfg.media.enableVisitPhotos,
      enableExpenseReceipts: cfg.media.enableExpenseReceipts,
      enableProductMedia: cfg.media.enableProductMedia,
      attendanceGeofenceEnabled: cfg.attendance.geofenceEnabled,
      attendanceSelfieEnabled: cfg.attendance.selfieEnabled,
      doctorApprovalRequired: cfg.doctors.approvalRequired,
      source: 'server',
    };
  }
  return {
    enableMediaUpload: env.flags.enableMediaUpload,
    enableVisitPhotos: env.flags.enableVisitPhotos,
    enableExpenseReceipts: env.flags.enableExpenseReceipts,
    enableProductMedia: env.flags.enableProductMedia,
    attendanceGeofenceEnabled: false,
    attendanceSelfieEnabled: false,
    doctorApprovalRequired: false,
    source: 'env',
  };
}
