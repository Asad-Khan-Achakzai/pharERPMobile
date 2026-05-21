import type { TerritoryNode } from '@/api/territories';
import type { ID, User } from '@/domain/types';
import { brickIdsInSubtree, findNodeById } from '@/utils/territoryTree';

export function idOf(
  ref: ID | { _id: ID } | null | undefined
): string | null {
  if (ref == null) return null;
  if (typeof ref === 'object' && '_id' in ref) return String(ref._id);
  return String(ref);
}

/**
 * Expands the rep's territory anchor + coverage bricks into a brick ID set.
 * Mirrors server `unionBrickIdsForRep` intent for UX recommendation (not enforcement).
 */
export function resolveRepBrickIds(
  user: Pick<User, 'territoryId' | 'coverageTerritoryIds'> | null | undefined,
  roots: TerritoryNode[]
): Set<string> {
  const out = new Set<string>();
  if (!user) return out;

  const anchorId = idOf(user.territoryId);
  if (anchorId) {
    const node = findNodeById(roots, anchorId);
    if (node) {
      if (node.kind === 'BRICK') out.add(String(node._id));
      else brickIdsInSubtree(node).forEach((id) => out.add(id));
    } else {
      out.add(anchorId);
    }
  }

  const coverage = user.coverageTerritoryIds ?? [];
  for (const ref of coverage) {
    const cid = idOf(ref);
    if (!cid) continue;
    const node = findNodeById(roots, cid);
    if (node?.kind === 'BRICK') out.add(String(node._id));
    else if (node) brickIdsInSubtree(node).forEach((id) => out.add(id));
    else out.add(cid);
  }

  return out;
}

export type RecommendedReason = 'assigned' | 'brick';

export function isRecommendedDoctor(
  doctor: { assignedRepId?: unknown; territoryId?: unknown },
  userId: string,
  brickIdSet: Set<string>
): RecommendedReason | null {
  const assignedId = idOf(
    doctor.assignedRepId as ID | { _id: ID } | null | undefined
  );
  if (assignedId && assignedId === userId) return 'assigned';

  const brickId = idOf(
    doctor.territoryId as ID | { _id: ID } | null | undefined
  );
  if (brickId && brickIdSet.has(brickId)) return 'brick';

  return null;
}
