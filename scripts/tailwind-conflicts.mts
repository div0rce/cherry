#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import fg from 'fast-glob';
import { z } from 'zod';
import { parseJson } from './guardrails/lib/read-json.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { spawnTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const SERVER_BIN = path.resolve(ROOT, 'node_modules/.bin/tailwindcss-language-server');
const PREFIX = 'tailwind-conflicts';
const FIX = 'Resolve Tailwind cssConflict diagnostics before continuing.';

const FILE_PATTERNS = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
  'pages/**/*.{ts,tsx,js,jsx}',
];
const IGNORE_PATTERNS = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'];

const jsonrpc = '2.0';
const JsonRpcMessageSchema = z
  .object({
    jsonrpc: z.string().optional(),
    id: z.union([z.number(), z.string()]).optional(),
    method: z.string().optional(),
    params: z.unknown().optional(),
    result: z.unknown().optional(),
  })
  .passthrough();

const DiagnosticRangeSchema = z
  .object({
    start: z
      .object({
        line: z.number().optional(),
        character: z.number().optional(),
      })
      .strict()
      .optional(),
    end: z
      .object({
        line: z.number().optional(),
        character: z.number().optional(),
      })
      .strict()
      .optional(),
  })
  .passthrough();

const DiagnosticSchema = z
  .object({
    code: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    range: DiagnosticRangeSchema.optional(),
  })
  .passthrough();

const DiagnosticsItemSchema = z
  .object({
    uri: z.string().optional(),
    diagnostics: z.array(DiagnosticSchema).optional(),
  })
  .passthrough();

const DiagnosticsResultSchema = z
  .object({
    items: z.array(DiagnosticsItemSchema).optional(),
  })
  .passthrough();

const PublishDiagnosticsSchema = z
  .object({
    uri: z.string().optional(),
    diagnostics: z.array(DiagnosticSchema).optional(),
  })
  .passthrough();

type JsonRpcMessage = z.infer<typeof JsonRpcMessageSchema>;
type Diagnostic = z.infer<typeof DiagnosticSchema>;

function makeContentMessage(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function languageIdFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.tsx':
      return 'typescriptreact';
    case '.ts':
      return 'typescript';
    case '.jsx':
      return 'javascriptreact';
    default:
      return 'javascript';
  }
}

async function readProjectFiles(): Promise<string[]> {
  return fg(FILE_PATTERNS, {
    cwd: ROOT,
    absolute: true,
    caseSensitiveMatch: false,
    ignore: IGNORE_PATTERNS,
  });
}

function parseJsonRpcMessage(body: string): JsonRpcMessage {
  const parsed = JsonRpcMessageSchema.parse(parseJson(body));
  return parsed;
}

function isConflictCode(code: unknown): boolean {
  return code === 'cssConflict' || code === 'css-conflict';
}

async function main(): Promise<void> {
  try {
    await fs.access(SERVER_BIN);
  } catch (err: unknown) {
    const message = asMessage(err);
    throw Error(
      `Tailwind language server not found; install tailwindcss-language-server. (${message})`
    );
  }

  const files = await readProjectFiles();
  if (files.length === 0) {
    return;
  }

  let nextId = 1;
  const pendingUris = new Set<string>();
  const conflictDiagnostics: Array<{ uri?: string; diagnostic: Diagnostic }> = [];
  const requestIdToUri = new Map<number, string>();

  const server = spawnTool(SERVER_BIN, ['--stdio'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      TAILWIND_DISABLE_WRITE_CHECK: '1',
    },
  });
  const stdout = server.stdout ?? fail(PREFIX, 'Tailwind language server stdout is unavailable.', { fix: FIX });
  const stdin = server.stdin ?? fail(PREFIX, 'Tailwind language server stdin is unavailable.', { fix: FIX });
  let serverClosed = false;

  let initResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  let initReject: ((reason?: unknown) => void) | null = null;
  const initPromise = new Promise<void>((resolve, reject) => {
    initResolve = resolve;
    initReject = reject;
  });

  let diagsResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  let diagsReject: ((reason?: unknown) => void) | null = null;
  const diagnosticsPromise = new Promise<void>((resolve, reject) => {
    diagsResolve = resolve;
    diagsReject = reject;
  });

  const MAX_WAIT_MS = 15_000;
  const timeoutId = setTimeout(() => {
    serverClosed = true;
    try {
      server.kill();
    } catch (err: unknown) {
      void asMessage(err);
    }
    diagsReject?.(
      Error(`Timed out waiting for Tailwind diagnostics after ${MAX_WAIT_MS}ms.`)
    );
  }, MAX_WAIT_MS);

  let buffer = Buffer.alloc(0);

  stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    parseBuffer();
  });

  server.on('error', (err) => {
    initReject?.(err);
    diagsReject?.(err);
  });

  server.on('exit', (code) => {
    serverClosed = true;
    if (code !== 0 && code !== null) {
      diagsReject?.(Error(`Tailwind language server exited with code ${code}`));
    }
  });

  const INIT_REQUEST_ID = nextId++;

  function send(payload: Record<string, unknown>): void {
    if (serverClosed || server.killed) return;
    stdin.write(makeContentMessage(payload));
  }

  function parseBuffer(): void {
    while (true) {
      const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) return;
      const header = buffer.subarray(0, headerEnd).toString('utf8');
      const match = /Content-Length: (\d+)/i.exec(header);
      if (match === null) {
        diagsReject?.(Error('Tailwind language server response missing Content-Length header.'));
        return;
      }
      const length = Number(match[1]);
      if (!Number.isFinite(length) || length < 0) {
        diagsReject?.(
          Error('Tailwind language server response has invalid Content-Length header.')
        );
        return;
      }
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + length;
      if (buffer.length < messageEnd) return;
      const body = buffer.subarray(messageStart, messageEnd).toString('utf8');
      buffer = buffer.subarray(messageEnd);
      let message: JsonRpcMessage;
      try {
        message = parseJsonRpcMessage(body);
      } catch (err: unknown) {
        diagsReject?.(err instanceof Error ? err : Error(asMessage(err)));
        return;
      }
      handleMessage(message);
    }
  }

  function sendResponse(id: number, result: unknown): void {
    send({
      jsonrpc,
      id,
      result,
    });
  }

  function handleMessage(message: JsonRpcMessage): void {
    if (typeof message.id === 'number' && message.id === INIT_REQUEST_ID) {
      initResolve?.();
      return;
    }
    if (message.method === 'workspace/configuration' && typeof message.id === 'number') {
      // Minimal configuration response to satisfy tailwind language server.
      sendResponse(message.id, [{}]);
      return;
    }
    if (message.method === 'tailwindcss/getConfiguration' && typeof message.id === 'number') {
      sendResponse(message.id, {
        includeLanguages: {
          javascript: 'javascript',
          javascriptreact: 'javascriptreact',
          typescript: 'typescript',
          typescriptreact: 'typescriptreact',
        },
      });
      return;
    }
    if (typeof message.id === 'number' && requestIdToUri.has(message.id)) {
      const uri = requestIdToUri.get(message.id);
      if (uri === undefined) {
        requestIdToUri.delete(message.id);
        return;
      }
      requestIdToUri.delete(message.id);
      pendingUris.delete(uri);
      const result = DiagnosticsResultSchema.safeParse(message.result);
      const items = result.success ? result.data.items ?? [] : [];
      for (const item of items) {
        const diagnostics = item.diagnostics ?? [];
        for (const diagnostic of diagnostics) {
          if (isConflictCode(diagnostic.code)) {
            const resolvedUri = item.uri ?? uri;
            if (resolvedUri !== undefined) {
              conflictDiagnostics.push({ uri: resolvedUri, diagnostic });
            } else {
              conflictDiagnostics.push({ diagnostic });
            }
          }
        }
      }
      if (pendingUris.size === 0) {
        clearTimeout(timeoutId);
        diagsResolve?.();
      }
      return;
    }
    if (message.method === 'textDocument/publishDiagnostics') {
      const params = PublishDiagnosticsSchema.safeParse(message.params);
      const uri = params.success ? params.data.uri : undefined;
      if (typeof uri === 'string') {
        pendingUris.delete(uri);
      }
      const diagnostics = params.success ? params.data.diagnostics ?? [] : [];
      for (const diagnostic of diagnostics) {
        if (isConflictCode(diagnostic.code)) {
          if (uri !== undefined) {
            conflictDiagnostics.push({ uri, diagnostic });
          } else {
            conflictDiagnostics.push({ diagnostic });
          }
        }
      }
      if (pendingUris.size === 0) {
        clearTimeout(timeoutId);
        diagsResolve?.();
      }
    }
  }

  send({
    jsonrpc,
    id: INIT_REQUEST_ID,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: pathToFileURL(ROOT).href,
      capabilities: {
        textDocument: {
          diagnostic: {
            dynamicRegistration: false,
          },
        },
        workspace: {
          configuration: true,
        },
      },
      initializationOptions: {
        userLanguages: {
          javascript: 'javascript',
          javascriptreact: 'javascriptreact',
          typescript: 'typescript',
          typescriptreact: 'typescriptreact',
        },
      },
    },
  });

  await initPromise;
  send({ jsonrpc, method: 'initialized', params: {} });

  for (const filePath of files) {
    const text = await fs.readFile(filePath, 'utf8');
    const uri = pathToFileURL(filePath).href;
    pendingUris.add(uri);
    // Fallback heuristic: detect duplicate outline utilities under the same variant (e.g., focus-visible:outline + focus-visible:outline-2)
    const outlineConflicts = findOutlineConflicts(text, uri);
    conflictDiagnostics.push(...outlineConflicts);

    send({
      jsonrpc,
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId: languageIdFor(filePath),
          version: 1,
          text,
        },
      },
    });
    const reqId = nextId++;
    requestIdToUri.set(reqId, uri);
    send({
      jsonrpc,
      id: reqId,
      method: 'textDocument/diagnostic',
      params: {
        textDocument: { uri },
        identifier: 'tailwind-conflict-check',
        previousResultId: null,
      },
    });
  }

  await diagnosticsPromise;
  send({ jsonrpc, method: 'exit' });

  if (conflictDiagnostics.length > 0) {
    const details = conflictDiagnostics.map(({ uri, diagnostic }) => {
      const start = diagnostic.range?.start ?? { line: 0, character: 0 };
      const line = (start.line ?? 0) + 1;
      const column = (start.character ?? 0) + 1;
      const relativePath =
        typeof uri === 'string' ? path.relative(ROOT, fileURLToPath(uri)) : '<unknown>';
      return `${relativePath}:${line}:${column} - ${diagnostic.message ?? 'Tailwind cssConflict detected.'}`;
    });
    fail(PREFIX, 'Tailwind cssConflict issues detected', { details, fix: FIX });
  }
}

main().catch((err: unknown) => {
  const message = asMessage(err);
  fail(PREFIX, `Tailwind conflict check failed: ${message}`, { fix: FIX });
});

type ConflictDiagnostic = { uri: string; diagnostic: Diagnostic };

function findOutlineConflicts(text: string, uri: string): ConflictDiagnostic[] {
  const conflicts: ConflictDiagnostic[] = [];
  const classRegex = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(text)) !== null) {
    const rawClasses = match[1] ?? '';
    if (rawClasses.length === 0) {
      continue;
    }
    const classes = rawClasses.split(/\s+/).filter(Boolean);
    const variants = new Map<string, string[]>(); // key: variant prefix (including trailing colon)
    const preText = text.slice(0, match.index);
    const line = preText.split('\n').length;
    const column = match.index - preText.lastIndexOf('\n');

    for (const cls of classes) {
      const parts = cls.split(':');
      const name = parts.pop();
      const variant = parts.length > 0 ? `${parts.join(':')}:` : '';
      if (name === undefined || name.length === 0) continue;
      // Flag only outline width/style utilities; allow colors/offsets to co-exist.
      const isOutlineWidth =
        name === 'outline' ||
        name === 'outline-none' ||
        /^outline-(0|1|2|4|8)$/.test(name) ||
        /^outline-\[.+\]$/.test(name);
      if (!isOutlineWidth) continue;
      const list = variants.get(variant) ?? [];
      list.push(name);
      variants.set(variant, list);
    }
    for (const [variant, list] of variants.entries()) {
      if (list.length > 1) {
        const variantLabel = variant.length > 0 ? variant : 'base';
        conflicts.push({
          uri,
          diagnostic: {
            code: 'cssConflict',
            message: `${list.join(' + ')} apply conflicting outline styles under variant "${variantLabel}".`,
            range: {
              start: {
                line: line - 1,
                character: Math.max(0, column - 1),
              },
              end: {
                line: line - 1,
                character: Math.max(0, column - 1) + 1,
              },
            },
          },
        });
      }
    }
  }
  return conflicts;
}
