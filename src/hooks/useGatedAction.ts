import { useCallback } from 'react';
import { useToast } from '@/ui/Toast';

/**
 * Gate an action behind a runtime flag without hiding UI. If the flag is
 * disabled the action is replaced with a lightweight toast explaining that the
 * feature is not yet enabled (per plan: "Always-present UI, Optional backend
 * capability").
 */
export function useGatedAction<T extends (...args: any[]) => any>(
  enabled: boolean,
  action: T,
  disabledMessage = 'Feature not enabled yet.',
): T {
  const toast = useToast();
  const gated = useCallback(
    (...args: Parameters<T>) => {
      if (!enabled) {
        toast.show({
          tone: 'info',
          message: disabledMessage,
          durationMs: 1800,
        });
        return undefined as unknown as ReturnType<T>;
      }
      return action(...args);
    },
    [enabled, action, disabledMessage, toast],
  ) as unknown as T;
  return gated;
}
