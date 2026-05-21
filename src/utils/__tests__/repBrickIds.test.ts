import type { TerritoryNode } from '@/api/territories';
import {
  isRecommendedDoctor,
  resolveRepBrickIds,
} from '@/utils/repBrickIds';

const roots: TerritoryNode[] = [
  {
    _id: 'zone1',
    name: 'Zone A',
    kind: 'ZONE',
    children: [
      {
        _id: 'area1',
        name: 'Area 1',
        kind: 'AREA',
        children: [
          { _id: 'brick1', name: 'Brick 1', kind: 'BRICK', children: [] },
          { _id: 'brick2', name: 'Brick 2', kind: 'BRICK', children: [] },
        ],
      },
    ],
  },
];

describe('resolveRepBrickIds', () => {
  it('expands AREA anchor to all child bricks', () => {
    const set = resolveRepBrickIds(
      { territoryId: 'area1', coverageTerritoryIds: [] },
      roots
    );
    expect(set.has('brick1')).toBe(true);
    expect(set.has('brick2')).toBe(true);
  });

  it('includes explicit coverage brick ids', () => {
    const set = resolveRepBrickIds(
      { territoryId: 'brick1', coverageTerritoryIds: ['brick2'] },
      roots
    );
    expect(set.has('brick1')).toBe(true);
    expect(set.has('brick2')).toBe(true);
  });
});

describe('isRecommendedDoctor', () => {
  const bricks = new Set(['brick1']);

  it('recommends when assigned to rep', () => {
    expect(
      isRecommendedDoctor(
        { assignedRepId: 'rep1', territoryId: 'brick9' },
        'rep1',
        bricks
      )
    ).toBe('assigned');
  });

  it('recommends when territory in brick set', () => {
    expect(
      isRecommendedDoctor({ assignedRepId: null, territoryId: 'brick1' }, 'rep1', bricks)
    ).toBe('brick');
  });

  it('does not recommend unrelated doctors', () => {
    expect(
      isRecommendedDoctor(
        { assignedRepId: 'other', territoryId: 'brick9' },
        'rep1',
        bricks
      )
    ).toBe(null);
  });
});
