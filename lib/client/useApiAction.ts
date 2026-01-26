'use client';

import { useCallback, useState } from 'react';
import type { ApiResult } from '../api/result';
import { asAppError } from '../errors.js';

type ApiActionState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

export function useApiAction<TResponse>(): {
  data: TResponse | null;
  error: string | null;
  isLoading: boolean;
  run: (fn: () => Promise<ApiResult<TResponse>>) => Promise<ApiResult<TResponse>>;
} {
  const [state, setState] = useState<ApiActionState<TResponse>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const run = useCallback(
    async (fn: () => Promise<ApiResult<TResponse>>): Promise<ApiResult<TResponse>> => {
      setState({ data: null, error: null, isLoading: true });
      try {
        const result = await fn();
        if (result.ok !== true) {
          setState({ data: null, error: result.message, isLoading: false });
          return result;
        }
        setState({ data: result.data, error: null, isLoading: false });
        return result;
      } catch (err: unknown) {
        const error = asAppError(err);
        setState({ data: null, error: error.message, isLoading: false });
        return { ok: false, error: error.code, message: error.message };
      }
    },
    []
  );

  return { ...state, run };
}
