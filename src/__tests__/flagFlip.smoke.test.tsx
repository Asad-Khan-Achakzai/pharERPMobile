import React from 'react';
import { render } from '@testing-library/react-native';
import { AddPhotoButton } from '@/ui/media/AddPhotoButton';
import { AttachReceiptButton } from '@/ui/media/AttachReceiptButton';
import { SelfieCaptureButton } from '@/ui/media/SelfieCaptureButton';
import { ProductVisualViewer } from '@/ui/media/ProductVisualViewer';
import { useAuthStore } from '@/state/authStore';
import { ToastProvider } from '@/ui/Toast';
import type { ServerConfig } from '@/domain/types';

function setFlags(overrides: Partial<ServerConfig['media']>) {
  useAuthStore.setState({
    serverConfig: {
      serverTime: new Date().toISOString(),
      media: {
        enableMediaUpload: false,
        enableVisitPhotos: false,
        enableExpenseReceipts: false,
        enableProductMedia: false,
        maxFileSize: 5 * 1024 * 1024,
        allowedMime: ['image/jpeg'],
        ...overrides,
      },
      attendance: { geofenceEnabled: false, selfieEnabled: false },
      doctors: { approvalRequired: false },
      sync: { pageSize: 50, pollIntervalMs: 60000 },
      company: { id: 'c1', name: 'Test', status: 'LIVE' },
    },
  });
}

const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('Phase 1 flag-flip smoke', () => {
  beforeEach(() => {
    setFlags({});
  });

  it('AddPhotoButton: always renders, disabled when flag off, enabled when on', () => {
    setFlags({ enableMediaUpload: false, enableVisitPhotos: false });
    const off = render(
      <Wrap>
        <AddPhotoButton testID="add" feature="visitPhoto" />
      </Wrap>,
    );
    expect(off.getByTestId('add').props.accessibilityState?.disabled).toBe(true);

    setFlags({ enableMediaUpload: true, enableVisitPhotos: true });
    const on = render(
      <Wrap>
        <AddPhotoButton testID="add" feature="visitPhoto" />
      </Wrap>,
    );
    expect(on.getByTestId('add').props.accessibilityState?.disabled).toBe(false);
  });

  it('AttachReceiptButton: always renders both states', () => {
    setFlags({ enableMediaUpload: false, enableExpenseReceipts: false });
    const off = render(
      <Wrap>
        <AttachReceiptButton testID="rcpt" variant="expense" />
      </Wrap>,
    );
    expect(off.getByTestId('rcpt').props.accessibilityState?.disabled).toBe(true);

    setFlags({ enableMediaUpload: true, enableExpenseReceipts: true });
    const on = render(
      <Wrap>
        <AttachReceiptButton testID="rcpt" variant="expense" />
      </Wrap>,
    );
    expect(on.getByTestId('rcpt').props.accessibilityState?.disabled).toBe(false);
  });

  it('SelfieCaptureButton: always renders; disabled when selfie flag off', () => {
    setFlags({ enableMediaUpload: true, enableVisitPhotos: true });
    useAuthStore.setState((s) => ({
      serverConfig: s.serverConfig
        ? {
            ...s.serverConfig,
            attendance: { ...s.serverConfig.attendance, selfieEnabled: false },
          }
        : null,
    }));
    const r = render(
      <Wrap>
        <SelfieCaptureButton testID="selfie" />
      </Wrap>,
    );
    expect(r.getByTestId('selfie').props.accessibilityState?.disabled).toBe(true);
  });

  it('ProductVisualViewer: renders placeholder when flag off, gallery when on with visuals', () => {
    setFlags({ enableMediaUpload: false, enableProductMedia: false });
    const off = render(
      <Wrap>
        <ProductVisualViewer />
      </Wrap>,
    );
    expect(off.queryByText(/Visual aid/)).toBeTruthy();

    setFlags({ enableMediaUpload: true, enableProductMedia: true });
    const on = render(
      <Wrap>
        <ProductVisualViewer
          visuals={[{ id: 'v1', title: 'Brochure', thumbUri: undefined, type: 'pdf' }]}
        />
      </Wrap>,
    );
    expect(on.queryByText(/Brochure/)).toBeTruthy();
  });
});
