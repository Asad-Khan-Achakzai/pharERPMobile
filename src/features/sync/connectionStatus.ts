import type { NetInfoState } from '@react-native-community/netinfo';

export type ConnectionType = 'none' | 'wifi' | 'cellular' | 'ethernet' | 'unknown';

/** 0 = offline, 1–4 = signal bars (WhatsApp-style). */
export type ConnectionStrength = 0 | 1 | 2 | 3 | 4;

export interface ConnectionInfo {
  online: boolean;
  type: ConnectionType;
  strength: ConnectionStrength;
  label: string;
}

function cellularGenerationLabel(gen?: string | null): string {
  switch (gen) {
    case '5g':
      return '5G';
    case '4g':
      return '4G';
    case '3g':
      return '3G';
    case '2g':
      return '2G';
    default:
      return 'Mobile data';
  }
}

function strengthFromCellular(gen?: string | null): ConnectionStrength {
  switch (gen) {
    case '5g':
      return 4;
    case '4g':
      return 3;
    case '3g':
      return 2;
    case '2g':
      return 1;
    default:
      return 2;
  }
}

function strengthFromWifi(state: NetInfoState): ConnectionStrength {
  const details = state.details as { strength?: number } | null | undefined;
  const raw = details?.strength;
  if (typeof raw !== 'number' || Number.isNaN(raw)) return 4;
  if (raw >= 80) return 4;
  if (raw >= 55) return 3;
  if (raw >= 30) return 2;
  return 1;
}

/** Derive user-facing connection info from NetInfo (mirrors WhatsApp-style status). */
export function connectionFromNetInfo(state: NetInfoState): ConnectionInfo {
  if (!state.isConnected) {
    return {
      online: false,
      type: 'none',
      strength: 0,
      label: 'Offline',
    };
  }

  if (state.type === 'wifi') {
    return {
      online: true,
      type: 'wifi',
      strength: strengthFromWifi(state),
      label: 'Wi‑Fi',
    };
  }

  if (state.type === 'cellular') {
    const gen = (state.details as { cellularGeneration?: string } | null)?.cellularGeneration;
    return {
      online: true,
      type: 'cellular',
      strength: strengthFromCellular(gen),
      label: cellularGenerationLabel(gen),
    };
  }

  if (state.type === 'ethernet') {
    return {
      online: true,
      type: 'ethernet',
      strength: 4,
      label: 'Ethernet',
    };
  }

  return {
    online: true,
    type: 'unknown',
    strength: 3,
    label: 'Online',
  };
}
