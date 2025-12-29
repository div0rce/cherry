import fs from 'node:fs';
import { z } from 'zod';
import { asMessage } from './error.mts';

const jsonParse = globalThis.JSON.parse;

const JsonTextSchema = z.string().transform((value, ctx) => {
  try {
    return jsonParse(value) as unknown;
  } catch (error: unknown) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid JSON: ${asMessage(error)}`,
    });
    return z.NEVER;
  }
});

export const PackageJsonSchema = z
  .object({
    scripts: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export const GuardrailRegistrySchema = z
  .object({
    GUARDRAIL_ENTRYPOINT: z.string(),
    GUARDRAILS: z.record(z.string(), z.string()),
  })
  .passthrough();

export function parseJson(text: string): unknown {
  const parsed = JsonTextSchema.safeParse(text);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.message ?? parsed.error.message;
    throw new Error(message);
  }
  return parsed.data;
}

export function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return parseJson(raw);
  } catch (error: unknown) {
    throw new Error(`Invalid JSON in ${filePath}: ${asMessage(error)}`);
  }
}
