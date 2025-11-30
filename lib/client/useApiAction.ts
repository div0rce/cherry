'use client';

import { useCallback, useState } from 'react';
import type { ApiResult } from './api';

type ApiActionState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

export function useApiAction<TResponse>(): {
  data: TResponse | null;
  error: string | null;
  isLoading: boolean;
  run: (
    fn: () => Promise<ApiResult<TResponse>>
  ) => Promise<{ ok: true; data: TResponse } | { ok: false; error: string }>;
} {
  const [state, setState] = useState<ApiActionState<TResponse>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const run = useCallback(
    async (fn: () => Promise<ApiResult<TResponse>>) => {
      setState({ data: null, error: null, isLoading: true });
      try {
        const result = await fn();
        if (!result.ok) {
          setState({ data: null, error: result.error, isLoading: false });
          return { ok: false as const, error: result.error };
        }
        setState({ data: result.data, error: null, isLoading: false });
        return { ok: true as const, data: result.data };
      } catch {
        setState({ data: null, error: 'unexpected_error', isLoading: false });
        return { ok: false as const, error: 'unexpected_error' };
      }
    },
    []
  );

  return { ...state, run };
}
