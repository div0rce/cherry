import * as fs from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

export type CsvDevTransaction = {
  postedDate: Date;
  description: string;
  rawDescription: string;
  amountMinor: number;
  direction: 'debit' | 'credit';
  accountLast4: string | null;
  sourceStatement: string | null;
  statementStart: string | null;
  statementEnd: string | null;
  section: string | null;
  rawLines: string[];
};

function optionalField(row: Record<string, string>, key: string): string | null {
  const value = row[key];
  return value !== undefined && value !== '' ? value : null;
}

async function parseRawLines(row: Record<string, string>): Promise<string[]> {
  try {
    const rawLinesJson = optionalField(row, 'raw_lines_json') ?? '[]';
    const parsed: unknown = await new Response(rawLinesJson).json();
    return Array.isArray(parsed) ? parsed.map((line) => String(line)) : [];
  } catch (error: unknown) {
    void error;
    return [];
  }
}

export async function parseCsvDevFile(filePath: string): Promise<CsvDevTransaction[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const parsedRecords = await Promise.all(records.map(async (row) => {
    const postedDateRaw = row['posted_date'] ?? '';
    const postedDate = new Date(postedDateRaw);
    const amountMinor = Number(row['amount_minor'] ?? Number.NaN);
    const directionRaw = row['direction'] ?? '';
    const direction: 'debit' | 'credit' =
      directionRaw.toLowerCase() === 'credit' ? 'credit' : 'debit';
    const accountLast4Raw = optionalField(row, 'account_last4');
    const accountLast4 = accountLast4Raw !== null ? String(accountLast4Raw) : null;
    const sourceStatement = optionalField(row, 'source_file');
    const statementStart = optionalField(row, 'statement_start');
    const statementEnd = optionalField(row, 'statement_end');
    const section = optionalField(row, 'section');
    const rawLines = await parseRawLines(row);

    return {
      postedDate,
      description: row['description'] ?? '',
      rawDescription: row['description_raw'] ?? '',
      amountMinor,
      direction,
      accountLast4,
      sourceStatement,
      statementStart,
      statementEnd,
      section,
      rawLines,
    };
  }));

  return parsedRecords;
}
