import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export type TerritoryKind = 'ZONE' | 'AREA' | 'BRICK';

export interface TerritoryNode {
  _id: ID;
  name: string;
  code?: string | null;
  kind: TerritoryKind;
  parentId?: ID | null;
  isActive?: boolean;
  children: TerritoryNode[];
}

export interface TerritoryTreeResponse {
  roots: TerritoryNode[];
  total: number;
}

export const territoriesApi = {
  async tree(): Promise<TerritoryTreeResponse> {
    const resp = await api.get('/territories/tree');
    const data = unwrap<TerritoryTreeResponse>(resp);
    return {
      roots: Array.isArray(data?.roots) ? data.roots : [],
      total: data?.total ?? 0,
    };
  },
};
