import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';

const root = process.cwd();
const allowlistPath = path.join(root, 'scripts', 'design-token-allowlist.json');
const writeAllowlist = process.argv.includes('--write-allowlist');

const targetGlobs = ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'];
const forbiddenPatterns = [
  { label: 'text-[…]', regex: /text-\[/ },
  { label: 'bg-[…]', regex: /bg-\[/ },
  { label: 'p-[…]', regex: /p-\[/ },
  { label: 'm-[…]', regex: /m-\[/ },
  { label: 'gap-[…]', regex: /gap-\[/ },
  { label: 'hex-color', regex: /#[0-9a-fA-F]{3,8}/ },
];

const readAllowlist = async () => {
  try {
    const data = await fs.readFile(allowlistPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const loadFiles = async () => {
  const entries = await fg(targetGlobs, { cwd: root, absolute: true });
  return entries.map((file) => ({
    absolute: file,
    relative: path.relative(root, file),
  }));
};

const findViolations = async (files) => {
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file.absolute, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((lineText, index) => {
      forbiddenPatterns.forEach(({ label, regex }) => {
        if (regex.test(lineText)) {
          results.push({
            file: file.relative,
            line: index + 1,
            match: label,
            snippet: lineText.trim(),
          });
        }
      });
    });
  }

  return results;
};

const formatViolation = (v) => `${v.file}:${v.line} — ${v.match}${v.snippet ? ` :: ${v.snippet}` : ''}`;

const writeAllowlistFile = async (violations) => {
  const grouped = violations.reduce((acc, violation) => {
    acc[violation.file] ??= [];
    acc[violation.file].push({ line: violation.line, match: violation.match, snippet: violation.snippet });
    return acc;
  }, {});

  await fs.writeFile(allowlistPath, JSON.stringify(grouped, null, 2));
  console.log(`Wrote design token allowlist to ${allowlistPath}`);
};

const main = async () => {
  const files = await loadFiles();
  const allowlist = await readAllowlist();
  const violations = await findViolations(files);

  if (writeAllowlist) {
    await writeAllowlistFile(violations);
    return;
  }

  const filtered = violations.filter((violation) => {
    const allowedEntries = allowlist[violation.file];
    if (!Array.isArray(allowedEntries)) return true;
    return !allowedEntries.some(
      (entry) => entry.line === violation.line && entry.match === violation.match && entry.snippet === violation.snippet
    );
  });

  if (filtered.length > 0) {
    const message = [
      'Design token violations detected. Avoid arbitrary Tailwind values or hex colors in className strings.',
      ...filtered.map(formatViolation),
    ].join('\n');
    console.error(message);
    process.exitCode = 1;
  }
};

main();
