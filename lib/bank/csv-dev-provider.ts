import fs from 'node:fs/promises';
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
    const accountLast4Raw = row['account_last4'];
    const accountLast4 =
      accountLast4Raw !== undefined && accountLast4Raw !== '' ? String(accountLast4Raw) : null;
    const sourceStatementRaw = row['source_file'];
    const sourceStatement =
      sourceStatementRaw !== undefined && sourceStatementRaw !== '' ? sourceStatementRaw : null;
    const statementStartRaw = row['statement_start'];
    const statementStart =
      statementStartRaw !== undefined && statementStartRaw !== '' ? statementStartRaw : null;
    const statementEndRaw = row['statement_end'];
    const statementEnd =
      statementEndRaw !== undefined && statementEndRaw !== '' ? statementEndRaw : null;
    const sectionRaw = row['section'];
    const section = sectionRaw !== undefined && sectionRaw !== '' ? sectionRaw : null;
    let rawLines: string[] = [];
    try {
      const rawLinesJson = row['raw_lines_json'] !== undefined && row['raw_lines_json'] !== ''
        ? row['raw_lines_json']
        : '[]';
      const parsed: unknown = await new Response(rawLinesJson).json();
      rawLines = Array.isArray(parsed) ? parsed.map((line) => String(line)) : [];
    } catch {
      rawLines = [];
    }

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
