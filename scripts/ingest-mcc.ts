/**
 * Ingest Merchant Category Codes (MCC) from a PDF or CSV into the DB and map
 * them to RewardCategory values. Idempotent: upserts MerchantCategory rows and
 * overwrites the single mapping per MCC (MccToRewardCategory).
 *
 * Usage:
 *   npm run ingest:mcc [path/to/mcc.pdf|mcc.csv]
 *
 * Defaults to data/mcc.pdf or data/mcc.csv in the repo root if no arg given.
 *
 * Mapping: update MCC_RANGE_MAPPING below as business logic evolves.
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { RewardCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';

type ParsedMcc = {
  code: string;
  description: string;
  section?: string | null;
  notes?: string | null;
  validBrands?: string[];
  requiredAbbreviations?: string[];
};

type RangeMapping = {
  start: number;
  end: number;
  category: RewardCategory | string;
};

const missingCategoryLogPath = path.join(
  process.cwd(),
  'data',
  'mcc',
  'missing-reward-categories.json'
);

const unmappedMccLogPath = path.join(
  process.cwd(),
  'data',
  'mcc',
  'unmapped-mcc.json'
);

function parseBrandTokens(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,/&]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function recordMissingCategory(category: string) {
  fs.mkdirSync(path.dirname(missingCategoryLogPath), { recursive: true });
  let list: string[] = [];
  if (fs.existsSync(missingCategoryLogPath)) {
    try {
      list = JSON.parse(fs.readFileSync(missingCategoryLogPath, 'utf8'));
    } catch (error) {
      console.warn('Unable to parse missing category log, resetting file.', error);
    }
  }
  if (!list.includes(category)) {
    list.push(category);
    list.sort();
    fs.writeFileSync(missingCategoryLogPath, JSON.stringify(list, null, 2));
    console.warn(`RewardCategory "${category}" not in schema; logged for follow-up.`);
  }
}

function recordUnmappedMcc(code: string) {
  fs.mkdirSync(path.dirname(unmappedMccLogPath), { recursive: true });
  let list: string[] = [];
  if (fs.existsSync(unmappedMccLogPath)) {
    try {
      list = JSON.parse(fs.readFileSync(unmappedMccLogPath, 'utf8'));
    } catch (error) {
      console.warn('Unable to parse unmapped MCC log, resetting file.', error);
    }
  }
  if (!list.includes(code)) {
    list.push(code);
    list.sort();
    fs.writeFileSync(unmappedMccLogPath, JSON.stringify(list, null, 2));
    console.warn(`MCC ${code} not mapped; logged under data/mcc/unmapped-mcc.json.`);
  }
}

function resolveRewardCategory(category: RewardCategory | string): RewardCategory {
  if (typeof category !== 'string') {
    return category;
  }

  const mapped = (RewardCategory as Record<string, RewardCategory | undefined>)[category];
  if (mapped) {
    return mapped;
  }

  recordMissingCategory(category);
  return RewardCategory.OTHER;
}

// Editable mapping from MCC ranges to our RewardCategory enum.
const MCC_RANGE_MAPPING: RangeMapping[] = [
  // Broad coverage (specific entries below will override where overlapping)
  { start: 1, end: 1499, category: RewardCategory.GENERAL }, // Agricultural services
  { start: 1500, end: 2999, category: RewardCategory.HOME_IMPROVEMENT }, // Contracted/trade services
  { start: 3000, end: 3299, category: RewardCategory.FLIGHTS }, // Airlines
  { start: 3300, end: 3499, category: RewardCategory.TRAVEL }, // Car rental
  { start: 3500, end: 3999, category: RewardCategory.HOTELS }, // Lodging
  { start: 4000, end: 4799, category: RewardCategory.TRANSIT }, // Transportation services
  { start: 4800, end: 4999, category: RewardCategory.UTILITIES }, // Utility/telecom
  { start: 5000, end: 5599, category: RewardCategory.DEPARTMENT_STORES }, // Retail outlets
  { start: 5600, end: 5699, category: RewardCategory.DEPARTMENT_STORES }, // Clothing stores
  { start: 5700, end: 7299, category: RewardCategory.ONLINE_RETAIL }, // Misc. retail/services
  { start: 7300, end: 7999, category: RewardCategory.GENERAL }, // Business services
  { start: 8000, end: 8999, category: RewardCategory.GENERAL }, // Professional/membership
  { start: 9000, end: 9999, category: RewardCategory.OTHER }, // Government services

  // Specific high-priority mappings
  { start: 5810, end: 5814, category: RewardCategory.DINING }, // restaurants/bars
  { start: 5815, end: 5815, category: RewardCategory.DELIVERY_APPS },
  { start: 4120, end: 4121, category: RewardCategory.RIDESHARE },
  { start: 4110, end: 4119, category: RewardCategory.TRANSIT },
  { start: 4130, end: 4131, category: RewardCategory.TRANSIT },
  { start: 4510, end: 4511, category: RewardCategory.FLIGHTS },
  { start: 4720, end: 4722, category: RewardCategory.TRAVEL },
  { start: 4780, end: 4789, category: RewardCategory.TRAVEL },
  { start: 5541, end: 5542, category: RewardCategory.GAS },
  { start: 5300, end: 5300, category: RewardCategory.WHOLESALE_CLUBS },
  { start: 5411, end: 5411, category: RewardCategory.GROCERIES },
  { start: 5732, end: 5732, category: RewardCategory.ELECTRONICS },
  { start: 5691, end: 5699, category: RewardCategory.DEPARTMENT_STORES },
  { start: 5651, end: 5651, category: RewardCategory.DEPARTMENT_STORES },
  { start: 5940, end: 5949, category: RewardCategory.ONLINE_RETAIL },
  { start: 5960, end: 5969, category: RewardCategory.ONLINE_RETAIL },
  { start: 5999, end: 5999, category: RewardCategory.ONLINE_RETAIL },
  { start: 6300, end: 6399, category: RewardCategory.OTHER }, // insurance/finance catch-all
  { start: 4812, end: 4814, category: RewardCategory.UTILITIES },
  { start: 7011, end: 7012, category: RewardCategory.HOTELS },
  { start: 7030, end: 7033, category: RewardCategory.TRAVEL },
  { start: 7990, end: 7999, category: RewardCategory.ENTERTAINMENT },
  { start: 7830, end: 7830, category: RewardCategory.MOVIES_STREAMING },
  { start: 7841, end: 7841, category: RewardCategory.MOVIES_STREAMING },
  { start: 4899, end: 4899, category: RewardCategory.STREAMING },
  { start: 4900, end: 4900, category: RewardCategory.UTILITIES },
  { start: 8020, end: 8099, category: RewardCategory.PHARMACY },
];

function mapMccToRewardCategory(code: string): RewardCategory {
  const num = Number.parseInt(code, 10);
  if (!Number.isFinite(num)) {
    recordUnmappedMcc(code);
    return RewardCategory.OTHER;
  }
  const match = MCC_RANGE_MAPPING.find((r) => num >= r.start && num <= r.end);
  if (!match) {
    recordUnmappedMcc(code);
    return RewardCategory.OTHER;
  }
  return resolveRewardCategory(match.category);
}

async function parseCsv(filePath: string): Promise<ParsedMcc[]> {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const rows: ParsedMcc[] = [];
  for (const line of lines) {
    const [
      code,
      description = '',
      section = '',
      notes = '',
      validBrandsRaw = '',
      requiredAbbreviationsRaw = '',
    ] = line
      .split(',')
      .map((s) => s.trim());
    if (!code || code === 'code') continue;
    rows.push({
      code,
      description,
      section,
      notes,
      validBrands: parseBrandTokens(validBrandsRaw),
      requiredAbbreviations: parseBrandTokens(requiredAbbreviationsRaw),
    });
  }
  return rows;
}

async function parsePdf(filePath: string): Promise<ParsedMcc[]> {
  // Lazy import to keep dependency optional in runtime paths.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfModule = require('pdf-parse') as any;
  const buffer = await fs.promises.readFile(filePath);

  let text = '';

  if (typeof pdfModule === 'function') {
    // Legacy pdf-parse versions exported a callable function.
    const data = await pdfModule(buffer);
    text = data?.text ?? '';
  } else if (pdfModule?.PDFParse) {
    // pdf-parse >=2 exposes a PDFParse class.
    const parser = new pdfModule.PDFParse({ data: buffer });
    await parser.load();
    const result = await parser.getText();
    text = result?.text ?? '';
  } else {
    throw new Error('pdf-parse export shape unsupported. Update ingest script.');
  }

  const headerRegex = /MCC\s+Description\s+Valid Payment Brand/i;
  const rawLines = text.split(/\r?\n/).map((l: string) => l.trim());
  const normalizedLines: string[] = [];
  for (const line of rawLines) {
    if (!line) continue;
    if (headerRegex.test(line)) continue;
    const mccMatch = line.match(/^(\d{4})\b/);
    if (mccMatch) {
      normalizedLines.push(line);
    } else if (normalizedLines.length) {
      const lastIndex = normalizedLines.length - 1;
      normalizedLines[lastIndex] = `${normalizedLines[lastIndex]} ${line}`.replace(/\s+/g, ' ').trim();
    }
  }

  type Block = { code: string; lines: string[] };
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of normalizedLines) {
    const mccMatch = line.match(/^(\d{4})\b/);
    if (!mccMatch) continue;
    if (current) {
      blocks.push(current);
    }
    current = { code: mccMatch[1], lines: [line] };
  }
  if (current) blocks.push(current);

  const rows: ParsedMcc[] = blocks.map((block) => {
    const joined = block.lines.join(' ');
    const normalized = joined.replace(/\s+/g, ' ').trim();
    const body = normalized.replace(/^\d{4}\s+/, '');

    const terminatorMatch = body.match(/\b(V,\s*M|TSYS|V|M)\b/);
    if (!terminatorMatch) {
      recordUnmappedMcc(block.code);
      return { code: block.code, description: body, validBrands: [], requiredAbbreviations: [] };
    }

    const terminator = terminatorMatch[0].replace(/\s+/g, ' ');
    const termIndex = terminatorMatch.index ?? 0;
    const description = body.slice(0, termIndex).trim();
    const remainder = body.slice(termIndex + terminator.length).trim();

    const isAirline = Number(block.code) >= 3000 && Number(block.code) <= 3299;

    // Brand tokens anywhere in the row that look like TOKEN (V/M/...)
    const brandPattern = /[A-Z0-9][A-Z0-9\s'&\.-]*?\([A-Z]\)/g;
    const brandTokens = Array.from(body.matchAll(brandPattern)).map((m) => m[0].trim());

    // Airline abbreviation tokens after the terminator
    const abbreviationPattern = /[A-Z0-9][A-Z0-9\s'&\.-]*(?:\([A-Z]\))?/g;
    const abbreviations = isAirline
      ? Array.from(remainder.matchAll(abbreviationPattern)).map((m) => m[0].trim())
      : [];

    const validBrands = Array.from(new Set([terminator, ...brandTokens, ...abbreviations])).filter(
      Boolean
    );
    const requiredAbbreviations = isAirline
      ? Array.from(new Set(abbreviations)).filter(Boolean)
      : [];

    return {
      code: block.code,
      description,
      validBrands,
      requiredAbbreviations,
    };
  });

  return rows;
}

async function parseSpreadsheet(filePath: string): Promise<ParsedMcc[]> {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const candidateSheet = workbook.SheetNames.find((name) =>
    name.toLowerCase().includes('mcc')
  );
  const sheet = workbook.Sheets[candidateSheet ?? workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error(`No sheets found in ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  const parsed: ParsedMcc[] = [];
  for (const row of rows) {
    const rawCode = row?.[0];
    let code = '';
    if (typeof rawCode === 'number') {
      code = rawCode.toString().padStart(4, '0');
    } else {
      const digits = String(rawCode ?? '').match(/\d{3,4}/)?.[0] ?? '';
      code = digits.padStart(4, '0');
    }
    if (!/^\d{4}$/.test(code)) {
      continue;
    }

    const rawDescription = row?.[1];
    const description = String(rawDescription ?? '').trim();
    const brandsRaw = String(row?.[2] ?? row?.[3] ?? '').trim();
    parsed.push({
      code,
      description,
      section: null,
      notes: null,
      validBrands: parseBrandTokens(brandsRaw),
      requiredAbbreviations: [],
    });
  }

  return parsed;
}

async function loadMccs(inputPath?: string): Promise<ParsedMcc[]> {
  const defaultPdf = path.join(process.cwd(), 'data', 'mcc.pdf');
  const defaultCsv = path.join(process.cwd(), 'data', 'mcc.csv');
  const target = inputPath
    ? path.resolve(inputPath)
    : fs.existsSync(defaultCsv)
    ? defaultCsv
    : defaultPdf;

  if (!fs.existsSync(target)) {
    throw new Error(`MCC source file not found at ${target}. Provide a PDF/CSV path.`);
  }

  const ext = path.extname(target).toLowerCase();
  if (ext === '.csv') {
    return parseCsv(target);
  }
  if (ext === '.xls' || ext === '.xlsx') {
    return parseSpreadsheet(target);
  }
  return parsePdf(target);
}

async function main() {
  const sourcePath = process.argv[2];
  const mccs = await loadMccs(sourcePath);

  for (const mcc of mccs) {
    await prisma.merchantCategory.upsert({
      where: { code: mcc.code },
      update: {
        description: mcc.description,
        section: mcc.section ?? null,
        notes: mcc.notes ?? null,
      },
      create: {
        code: mcc.code,
        description: mcc.description,
        section: mcc.section ?? null,
        notes: mcc.notes ?? null,
      },
    });

    // Replace brand rows for this MCC
    await prisma.merchantBrand.deleteMany({
      where: { mccCode: mcc.code },
    });
    if (mcc.validBrands?.length) {
      await prisma.merchantBrand.createMany({
        data: mcc.validBrands.map((value) => ({
          mccCode: mcc.code,
          kind: 'VALID_PAYMENT_BRAND',
          value,
        })),
      });
    }
    if (mcc.requiredAbbreviations?.length) {
      await prisma.merchantBrand.createMany({
        data: mcc.requiredAbbreviations.map((value) => ({
          mccCode: mcc.code,
          kind: 'REQUIRED_ABBREVIATION',
          value,
        })),
      });
    }

    const rewardCategory = mapMccToRewardCategory(mcc.code);
    await prisma.mccToRewardCategory.upsert({
      where: { mccCode: mcc.code },
      update: {
        rewardCategory,
      },
      create: {
        id: mcc.code, // stable so upsert works on unique mccCode
        mccCode: mcc.code,
        rewardCategory,
      },
    });
  }

  console.log(`Ingested ${mccs.length} MCC rows`);
}

main()
  .catch((err) => {
    console.error('Ingest failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
