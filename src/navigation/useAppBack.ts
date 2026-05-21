import { useCallback } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { normalizeReturnTo } from './appNavigation';

/**
 * Stack-aware back handler for mobile detail screens.
 *
 * Always pops the navigation stack when history exists so the transition
 * animates correctly (current screen exits to the right). `returnTo` is only
 * used as a fallback when there is nothing to pop (deep link / cold start).
 */
export function useAppBack(fallback?: Href) {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const returnTo = normalizeReturnTo(params.returnTo);

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (returnTo) {
      router.replace(returnTo as Href);
      return;
    }
    if (fallback) {
      router.replace(fallback);
      return;
    }
    router.replace('/(tabs)/more');
  }, [router, returnTo, fallback]);
}
