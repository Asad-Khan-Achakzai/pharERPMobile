import { useCallback } from 'react';
import { usePathname, useRouter, type Href } from 'expo-router';
import { appendReturnTo } from './appNavigation';

/**
 * Push a detail (or form) route while recording the current screen as `returnTo`.
 */
export function usePushWithReturn() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (path: string, overrideReturnTo?: string) => {
      router.push(appendReturnTo(path, overrideReturnTo ?? pathname));
    },
    [router, pathname],
  );
}

/** Non-hook helper when pathname is already known. */
export function pushWithReturn(
  router: { push: (href: Href) => void },
  path: string,
  returnTo: string,
) {
  router.push(appendReturnTo(path, returnTo));
}
