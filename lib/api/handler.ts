import { asAppError } from '../errors.js';

type ApiHandlerResult<T> = T | Response;

// apiHandler is the error normalization boundary for API routes.
export async function apiHandler<T>(
  fn: () => Promise<ApiHandlerResult<T>> | ApiHandlerResult<T>
): Promise<Response> {
  try {
    const result = await fn();
    if (result instanceof Response) return result;
    return Response.json(result);
  } catch (err: unknown) {
    const error = asAppError(err);
    // ponytail: 5xx messages can carry internals (a Prisma error included the database host),
    // so clients get a generic message. Log the detail here once shared may import logging.
    const message = error.status >= 500 ? 'Internal error' : error.message;
    return Response.json({ error: error.code, message }, { status: error.status });
  }
}
