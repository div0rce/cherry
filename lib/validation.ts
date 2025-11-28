import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ZodSchema, z } from 'zod';

type ParsedResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<ParsedResult<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Validation failed',
          issues: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

export type InferSchema<T extends ZodSchema> = z.infer<T>;
