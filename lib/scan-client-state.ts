import type { ScanResponse } from './schemas/scan.js';
import { isScanSuccessResponse } from './schemas/scan.js';

export type ScanPreviewUiState<Preview> = {
  scanPreview: Preview | null;
  error: string | null;
};

export function createScanSubmitStartUiState<Preview>(): ScanPreviewUiState<Preview> {
  return {
    scanPreview: null,
    error: null,
  };
}

export function createScanFailureUiState<Preview>(
  message: string
): ScanPreviewUiState<Preview> {
  return {
    scanPreview: null,
    error: message,
  };
}

export function resolveScanResponseUiState<Preview>(
  response: ScanResponse,
  preview: Preview
): ScanPreviewUiState<Preview> {
  if (!isScanSuccessResponse(response)) {
    return {
      scanPreview: null,
      error: response.error.message,
    };
  }
  return {
    scanPreview: preview,
    error: null,
  };
}
