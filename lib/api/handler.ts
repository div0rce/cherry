import { asAppError } from '../errors.js';

type ApiHandlerResult<T> = T | Response;

export async function apiHandler<T>(
  fn: () => Promise<ApiHandlerResult<T>> | ApiHandlerResult<T>
): Promise<Response> {
  try {
    const result = await fn();
    if (result instanceof Response) return result;
    return Response.json(result);
  } catch (err: unknown) {
    const error = asAppError(err);
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }
}
