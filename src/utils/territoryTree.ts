import type { TerritoryNode } from '@/api/territories';

export function findNodeById(roots: TerritoryNode[], id: string): TerritoryNode | null {
  for (const node of roots) {
    if (String(node._id) === id) return node;
    if (node.children?.length) {
      const inner = findNodeById(node.children, id);
      if (inner) return inner;
    }
  }
  return null;
}

export function brickIdsInSubtree(node: TerritoryNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: TerritoryNode) => {
    if (n.kind === 'BRICK') ids.add(String(n._id));
    for (const ch of n.children || []) walk(ch);
  };
  walk(node);
  return ids;
}
