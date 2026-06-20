import * as React from 'react';
import { useAuthStore } from '@/state/authStore';

export function PushRegistrationBridge() {
  const serverConfig = useAuthStore((s) => s.serverConfig);
  const accessToken = useAuthStore((s) => s.accessToken);
  const companyPushEnabled = useAuthStore((s) => s.company?.mobilePushEnabled === true);
  const configPushEnabled =
    serverConfig?.push?.enabled === true || serverConfig?.company?.mobilePushEnabled === true;
  const pushEnabled = configPushEnabled || companyPushEnabled;

  React.useEffect(() => {
    if (!accessToken || !pushEnabled) return;
    void import('@/features/push/registerPush').then(({ schedulePushRegistration }) =>
      schedulePushRegistration(1000),
    );
  }, [accessToken, pushEnabled]);

  return null;
}
