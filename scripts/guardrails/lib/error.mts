export function asMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (err: unknown) {
    return String(err);
  }
}

export function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(asMessage(error));
}
