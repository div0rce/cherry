export function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return Error(error);
  }
  try {
    return Error(JSON.stringify(error));
  } catch (err: unknown) {
    return Error(String(err));
  }
}

export function asMessage(error: unknown): string {
  return asError(error).message;
}
