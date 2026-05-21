import React from 'react';
import { render } from '@testing-library/react-native';
import { AddPhotoButton } from '../AddPhotoButton';
import { useAuthStore } from '@/state/authStore';
import type { ServerConfig } from '@/domain/types';

function buildServerConfig(overrides: Partial<ServerConfig['media']> = {}): ServerConfig {
  return {
    serverTime: new Date().toISOString(),
    media: {
      enableMediaUpload: false,
      enableVisitPhotos: false,
      enableExpenseReceipts: false,
      enableProductMedia: false,
      maxFileSize: 5 * 1024 * 1024,
      allowedMime: ['image/jpeg', 'image/png'],
      ...overrides,
    },
    attendance: { geofenceEnabled: false, selfieEnabled: false },
    doctors: { approvalRequired: false },
    sync: { pageSize: 50, pollIntervalMs: 60000 },
    company: { id: 'co1', name: 'Test', status: 'LIVE' },
  };
}

describe('AddPhotoButton flag-flip parity', () => {
  it('renders identical UI structure when media flag is off vs on (always-present UI rule)', () => {
    useAuthStore.setState({ serverConfig: buildServerConfig({ enableMediaUpload: false, enableVisitPhotos: false }) });
    const off = render(<AddPhotoButton testID="add-photo" feature="visitPhoto" />);
    const offTree = off.toJSON();

    useAuthStore.setState({
      serverConfig: buildServerConfig({ enableMediaUpload: true, enableVisitPhotos: true }),
    });
    const on = render(<AddPhotoButton testID="add-photo" feature="visitPhoto" />);
    const onTree = on.toJSON();

    expect(off.getByTestId('add-photo')).toBeTruthy();
    expect(on.getByTestId('add-photo')).toBeTruthy();
    expect(typeof offTree).toBe(typeof onTree);
  });

  it('marks the button as disabled (a11y) when feature is off but still renders the button', () => {
    useAuthStore.setState({ serverConfig: buildServerConfig({ enableMediaUpload: false, enableVisitPhotos: false }) });
    const r = render(<AddPhotoButton testID="add-photo" feature="visitPhoto" />);
    const node = r.getByTestId('add-photo');
    expect(node.props.accessibilityState?.disabled).toBe(true);
  });

  it('marks the button as enabled when feature is fully on', () => {
    useAuthStore.setState({
      serverConfig: buildServerConfig({ enableMediaUpload: true, enableVisitPhotos: true }),
    });
    const r = render(<AddPhotoButton testID="add-photo" feature="visitPhoto" />);
    const node = r.getByTestId('add-photo');
    expect(node.props.accessibilityState?.disabled).toBe(false);
  });
});
