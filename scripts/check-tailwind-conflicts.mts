#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import fg from 'fast-glob';

const ROOT = process.cwd();
const SERVER_BIN = path.resolve(ROOT, 'node_modules/.bin/tailwindcss-language-server');

const FILE_PATTERNS = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
  'pages/**/*.{ts,tsx,js,jsx}',
];
const IGNORE_PATTERNS = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'];

const jsonrpc = '2.0';

function makeContentMessage(payload) {
  const json = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function languageIdFor(filePath) {
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

async function readProjectFiles() {
  return fg(FILE_PATTERNS, {
    cwd: ROOT,
    absolute: true,
    caseSensitiveMatch: false,
    ignore: IGNORE_PATTERNS,
  });
}

async function main() {
  try {
    await fs.access(SERVER_BIN);
  } catch {
    throw new Error('Tailwind language server not found; install tailwindcss-language-server.');
  }

  const files = await readProjectFiles();
  if (files.length === 0) {
    return;
  }

  let nextId = 1;
  const pendingUris = new Set();
  const conflictDiagnostics = [];
  const requestIdToUri = new Map();

  const server = spawn(SERVER_BIN, ['--stdio'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      TAILWIND_DISABLE_WRITE_CHECK: '1',
    },
  });
  let serverClosed = false;

  let initResolve;
  let initReject;
  const initPromise = new Promise((resolve, reject) => {
    initResolve = resolve;
    initReject = reject;
  });

  let diagsResolve;
  let diagsReject;
  const diagnosticsPromise = new Promise((resolve, reject) => {
    diagsResolve = resolve;
    diagsReject = reject;
  });

  const MAX_WAIT_MS = 15_000;
  const timeoutId = setTimeout(() => {
    serverClosed = true;
    try {
      server.kill();
    } catch {
      // ignore
    }
    diagsReject?.(new Error(`Timed out waiting for Tailwind diagnostics after ${MAX_WAIT_MS}ms.`));
  }, MAX_WAIT_MS);

  let buffer = Buffer.alloc(0);

  server.stdout.on('data', (chunk) => {
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
      diagsReject?.(new Error(`Tailwind language server exited with code ${code}`));
    }
  });

  const INIT_REQUEST_ID = nextId++;

  function send(payload) {
    if (serverClosed || server.killed) return;
    server.stdin.write(makeContentMessage(payload));
  }

  function parseBuffer() {
    while (true) {
      const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) return;
      const header = buffer.subarray(0, headerEnd).toString('utf8');
      const match = /Content-Length: (\d+)/i.exec(header);
      if (!match) {
        diagsReject?.(new Error('Tailwind language server response missing Content-Length header.'));
        return;
      }
      const length = Number(match[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + length;
      if (buffer.length < messageEnd) return;
      const body = buffer.subarray(messageStart, messageEnd).toString('utf8');
      buffer = buffer.subarray(messageEnd);
      let message;
      try {
        message = JSON.parse(body);
      } catch (error) {
        diagsReject?.(error);
        return;
      }
      handleMessage(message);
    }
  }

  function sendResponse(id, result) {
    send({
      jsonrpc,
      id,
      result,
    });
  }

  function handleMessage(message) {
    if (message.id === INIT_REQUEST_ID) {
      initResolve();
      return;
    }
    if (message.method === 'workspace/configuration' && message.id != null) {
      // Minimal configuration response to satisfy tailwind language server.
      sendResponse(message.id, [{}]);
      return;
    }
    if (message.method === 'tailwindcss/getConfiguration' && message.id != null) {
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
    if (message.id && requestIdToUri.has(message.id)) {
      const uri = requestIdToUri.get(message.id);
      requestIdToUri.delete(message.id);
      pendingUris.delete(uri);
      const items = message.result?.items ?? [];
      for (const item of items) {
        for (const diagnostic of item.diagnostics ?? []) {
          if (diagnostic.code === 'cssConflict' || diagnostic.code === 'css-conflict') {
            conflictDiagnostics.push({ uri: item.uri ?? uri, diagnostic });
          }
        }
      }
      if (pendingUris.size === 0) {
        clearTimeout(timeoutId);
        diagsResolve();
      }
      return;
    }
    if (message.method === 'textDocument/publishDiagnostics') {
      const uri = message.params?.uri;
      if (uri) {
        pendingUris.delete(uri);
      }
      for (const diagnostic of message.params?.diagnostics ?? []) {
        if (diagnostic.code === 'cssConflict' || diagnostic.code === 'css-conflict') {
          conflictDiagnostics.push({ uri, diagnostic });
        }
      }
      if (pendingUris.size === 0) {
        clearTimeout(timeoutId);
        diagsResolve();
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
    for (const { uri, diagnostic } of conflictDiagnostics) {
      const start = diagnostic.range?.start ?? { line: 0, character: 0 };
      const line = (start.line ?? 0) + 1;
      const column = (start.character ?? 0) + 1;
      const relativePath = uri ? path.relative(ROOT, fileURLToPath(uri)) : '<unknown>';
      console.error(
        `${relativePath}:${line}:${column} - ${diagnostic.message ?? 'Tailwind cssConflict detected.'}`
      );
    }
    console.error(`\n${conflictDiagnostics.length} Tailwind cssConflict issue(s) found.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Tailwind conflict check failed:', error.message ?? error);
  process.exit(1);
});

function findOutlineConflicts(text, uri) {
  const conflicts = [];
  const classRegex = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = classRegex.exec(text)) !== null) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    const variants = new Map(); // key: variant prefix (including trailing colon), value: array of outline width/style classes
    const preText = text.slice(0, match.index);
    const line = preText.split('\n').length;
    const column = match.index - preText.lastIndexOf('\n');

    for (const cls of classes) {
      const parts = cls.split(':');
      const name = parts.pop();
      const variant = parts.length ? `${parts.join(':')}:` : '';
      if (!name) continue;
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
        conflicts.push({
          uri,
          diagnostic: {
            code: 'cssConflict',
            message: `${list.join(' + ')} apply conflicting outline styles under variant "${variant || 'base'}".`,
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
