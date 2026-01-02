import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { parseJson } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const raw = process.argv[2] ?? '{}';
const data = z
  .object({ csrfToken: z.string().optional() })
  .passthrough()
  .parse(parseJson(raw));

process.stdout.write(`${data.csrfToken ?? ''}\n`);
