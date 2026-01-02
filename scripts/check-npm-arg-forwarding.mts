import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

type Violation = {
  script: string;
  command: string;
  line: number;
  col: number;
};

const ROOT_ENV = process.env['CHERRY_NPM_ARG_FORWARDING_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const RULE = 'check:npm-arg-forwarding';
const FIX = 'Use "npm run <script> -- <args>" when forwarding args.';

function extractNpmRunSegments(command: string): Array<{ name: string; tail: string }> {
  const segments: Array<{ name: string; tail: string }> = [];
  const regex = /\bnpm\s+run\s+([^\s&|;]+)([^&|;]*)/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(command)) !== null) {
    const name = match[1] ?? '';
    const tail = match[2] ?? '';
    if (name.length > 0) {
      segments.push({ name, tail });
    }
  }
  return segments;
}

function tailHasForwardingDelimiter(tail: string): boolean {
  const tokens = tail.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.includes('--');
}

function lineColForScript(raw: string, scriptName: string): { line: number; col: number } {
  const token = `"${scriptName}"`;
  const index = raw.indexOf(token);
  if (index <= 0) return { line: 1, col: 1 };
  const slice = raw.slice(0, index);
  const line = slice.split('\n').length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, col };
}

function main(): void {
  try {
    if (fs.existsSync(PACKAGE_JSON) === false) {
      fail(RULE, 'package.json missing', {
        details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
        fix: 'Restore package.json with scripts section.',
      });
    }

    const raw = fs.readFileSync(PACKAGE_JSON, 'utf8');
    const parsed = PackageJsonSchema.parse(readJsonFile(PACKAGE_JSON));
    const scripts = parsed.scripts;
    if (scripts === undefined) {
      fail(RULE, 'package.json scripts missing', {
        details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
        fix: 'Add a scripts object to package.json.',
      });
    }

    const violations: Violation[] = [];
    for (const [scriptName, command] of Object.entries(scripts)) {
      const segments = extractNpmRunSegments(command);
      for (const segment of segments) {
        const tail = segment.tail.trim();
        if (tail.length === 0) continue;
        if (!tailHasForwardingDelimiter(tail)) {
          const { line, col } = lineColForScript(raw, scriptName);
          violations.push({
            script: scriptName,
            command: `npm run ${segment.name}${segment.tail}`,
            line,
            col,
          });
        }
      }
    }

    if (violations.length > 0) {
      const relPath = path.normalize(path.relative(ROOT, PACKAGE_JSON));
      const details = violations.map(
        (violation) =>
          `${relPath}:${violation.line}:${violation.col}: ${violation.script}: ${violation.command.trim()}`
      );
      fail(
        RULE,
        'npm run args must use "--" to forward to the underlying script',
        { details, fix: FIX }
      );
    }

    process.stdout.write('npm-arg-forwarding: ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(RULE, `Guardrail crashed: ${message}`, { fix: FIX });
  }
}

main();
