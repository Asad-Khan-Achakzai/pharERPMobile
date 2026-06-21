import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/state/authStore';
import type { User } from '@/domain/types';

/**
 * Current user's profile (incl. a fresh signed `imageUrl`).
 *
 * Profile images are short-lived signed URLs (~5 min TTL), so we never persist
 * them on the auth user. Instead this query refetches a fresh URL and is shared
 * (deduped) across the Home greeting card and the More tab via a stable key.
 */
export function useMyProfile() {
  const userId = useAuthStore((s) => s.user?._id);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<User>({
    queryKey: ['auth', 'me', userId],
    enabled: !!accessToken && !!userId,
    queryFn: () => authApi.me(),
    // Refresh before the signed URL (5 min) expires.
    staleTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
