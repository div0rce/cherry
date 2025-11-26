/**
 * MCC ingest from sanitized TSV.
 *
 * Expected input (default: data/mcc/sanitized-mcc.tsv):
 *   <mccCode>\t<description>\t<networkIndicator>\t<notes...>
 *
 * - mccCode: int
 * - description: string
 * - networkIndicator: "V, M" | "TSYS" | "V" | "M"
 * - notes: optional; any remaining columns joined with space
 *
 * Behavior:
 * - Upsert MerchantCategory (mccCode int, description, networkVisa/Mastercard/Tsys, notes)
 * - Rebuild MccToRewardCategory using mapping rules
 * - Idempotent: clears MccToRewardCategory and repopulates
 *
 * Run:
 *   npm run ingest:mcc [optional path]
 */

import fs from 'fs';
import path from 'path';
import {
  MerchantVertical,
  MerchantChannel,
  SpendDomain,
  MerchantRiskProfile,
  MerchantLifeCategory,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { mapTagsToRewardCategory } from '../lib/mccCategoryMapper';
import { logError, logInfo } from '../lib/logger';

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'mcc', 'sanitized-mcc.tsv');
const unmappedPath = path.join(process.cwd(), 'data', 'mcc', 'unmapped-mcc.json');

type ParsedRow = {
  mccCode: number;
  description: string;
  networkIndicator: string;
  notes: string | null;
  networkVisa: boolean;
  networkMastercard: boolean;
  networkTsys: boolean;
};

function logUnmapped(mcc: number) {
  fs.mkdirSync(path.dirname(unmappedPath), { recursive: true });
  let list: number[] = [];
  if (fs.existsSync(unmappedPath)) {
    try {
      list = JSON.parse(fs.readFileSync(unmappedPath, 'utf8'));
    } catch {
      list = [];
    }
  }
  if (!list.includes(mcc)) {
    list.push(mcc);
    list.sort((a, b) => a - b);
    fs.writeFileSync(unmappedPath, JSON.stringify(list, null, 2));
  }
}

function parseTsv(filePath: string): ParsedRow[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    if (!/^\d{4}\b/.test(line)) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const mccCode = Number(parts[0]);
    if (!Number.isFinite(mccCode)) continue;
    const description = parts[1] ?? '';
    const networkIndicator = (parts[2] ?? '').trim();
    const notes = parts.length > 3 ? parts.slice(3).join(' ').trim() || null : null;
    const hasVisa = /V/.test(networkIndicator);
    const hasMc = /M/.test(networkIndicator);
    const hasTsys = /TSYS/i.test(networkIndicator);
    rows.push({
      mccCode,
      description,
      networkIndicator,
      notes,
      networkVisa: hasVisa,
      networkMastercard: hasMc,
      networkTsys: hasTsys,
    });
  }
  return rows;
}

function inferTagsFromMcc(mccCode: number, _description: string): {
  vertical: MerchantVertical;
  channel: MerchantChannel;
  spendDomain: SpendDomain;
  riskProfile: MerchantRiskProfile;
  lifeCategory: MerchantLifeCategory;
} {
  // Lodging
  if (mccCode >= 3501 && mccCode <= 3835) {
    return {
      vertical: MerchantVertical.LODGING,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.TRAVEL,
    };
  }

  // Airlines
  if (mccCode >= 3000 && mccCode <= 3299) {
    return {
      vertical: MerchantVertical.TRANSPORT,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.TRAVEL,
    };
  }

  // Car rental
  if (mccCode >= 3351 && mccCode <= 3399) {
    return {
      vertical: MerchantVertical.TRANSPORT,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.TRAVEL,
    };
  }

  // Restaurants/bars
  if ([5811, 5812, 5813, 5814].includes(mccCode)) {
    return {
      vertical: MerchantVertical.FOOD_DRINK,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.PERSONAL_SERVICES,
    };
  }

  // Groceries
  if ([5411, 5499].includes(mccCode)) {
    return {
      vertical: MerchantVertical.RETAIL,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.NECESSITY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.HOME,
    };
  }

  // Gas
  if (mccCode === 5541 || mccCode === 5542 || mccCode === 9752) {
    return {
      vertical: MerchantVertical.TRANSPORT,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.NECESSITY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.AUTO,
    };
  }

  // Telecom / digital
  if ([4812, 4816, 4899].includes(mccCode) || (mccCode >= 5815 && mccCode <= 5818)) {
    return {
      vertical: MerchantVertical.DIGITAL_SERVICES,
      channel: MerchantChannel.ONLINE,
      spendDomain: SpendDomain.NECESSITY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.HOME,
    };
  }

  // Health / medical
  if (
    (mccCode >= 8011 && mccCode <= 8062) ||
    mccCode === 5912 ||
    mccCode === 5975 ||
    mccCode === 5976
  ) {
    return {
      vertical: MerchantVertical.HEALTHCARE,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.NECESSITY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.HEALTH,
    };
  }

  // Financial / quasi cash
  if ([6010, 6011, 6012, 6050, 6051, 6211, 6536, 6537, 6538, 6539].includes(mccCode)) {
    return {
      vertical: MerchantVertical.FINANCIAL,
      channel: MerchantChannel.MIXED,
      spendDomain: SpendDomain.TRANSFER,
      riskProfile: MerchantRiskProfile.QUASI_CASH,
      lifeCategory: MerchantLifeCategory.BUSINESS,
    };
  }

  // Education
  if (mccCode >= 8211 && mccCode <= 8299) {
    return {
      vertical: MerchantVertical.EDUCATION,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.INVESTMENT,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.EDUCATION,
    };
  }

  // Government
  if ([9211, 9222, 9223, 9311, 9399, 9402, 9405].includes(mccCode)) {
    return {
      vertical: MerchantVertical.GOVERNMENT,
      channel: MerchantChannel.MIXED,
      spendDomain: SpendDomain.NECESSITY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.GOVERNMENT,
    };
  }

  // Entertainment / gambling
  if (mccCode >= 7800 && mccCode <= 7999) {
    const isGambling = mccCode === 7800 || mccCode === 7802 || mccCode === 7994 || mccCode === 9754;
    return {
      vertical: MerchantVertical.ENTERTAINMENT,
      channel: MerchantChannel.OFFLINE,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: isGambling ? MerchantRiskProfile.GAMBLING : MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.TRAVEL,
    };
  }

  // Nonprofits / charities
  if ([8398, 8661].includes(mccCode)) {
    return {
      vertical: MerchantVertical.NONPROFIT,
      channel: MerchantChannel.MIXED,
      spendDomain: SpendDomain.DISCRETIONARY,
      riskProfile: MerchantRiskProfile.NORMAL,
      lifeCategory: MerchantLifeCategory.CHARITY,
    };
  }

  // Default
  return {
    vertical: MerchantVertical.MISC,
    channel: MerchantChannel.OFFLINE,
    spendDomain: SpendDomain.DISCRETIONARY,
    riskProfile: MerchantRiskProfile.NORMAL,
    lifeCategory: MerchantLifeCategory.OTHER,
  };
}

async function main() {
  const source = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PATH;
  if (!fs.existsSync(source)) {
    throw new Error(`MCC TSV not found at ${source}`);
  }

  const rows = parseTsv(source);

  for (const row of rows) {
    const tags = inferTagsFromMcc(row.mccCode, row.description);

    await prisma.merchantCategory.upsert({
      where: { mccCode: row.mccCode },
      update: {
        description: row.description,
        networkVisa: row.networkVisa,
        networkMastercard: row.networkMastercard,
        networkTsys: row.networkTsys,
        notes: row.notes,
        vertical: tags.vertical,
        channel: tags.channel,
        spendDomain: tags.spendDomain,
        riskProfile: tags.riskProfile,
        lifeCategory: tags.lifeCategory,
      },
      create: {
        mccCode: row.mccCode,
        description: row.description,
        networkVisa: row.networkVisa,
        networkMastercard: row.networkMastercard,
        networkTsys: row.networkTsys,
        notes: row.notes,
        vertical: tags.vertical,
        channel: tags.channel,
        spendDomain: tags.spendDomain,
        riskProfile: tags.riskProfile,
        lifeCategory: tags.lifeCategory,
      },
    });

    const category = mapTagsToRewardCategory({
      mccCode: row.mccCode,
      vertical: tags.vertical,
      riskProfile: tags.riskProfile,
      lifeCategory: tags.lifeCategory,
      channel: tags.channel,
    });
    if (!category) {
      logUnmapped(row.mccCode);
      continue;
    }

    // Upsert mapping (default row per MCC)
    const existing = await prisma.mccToRewardCategory.findFirst({
      where: { mccCode: row.mccCode, isDefault: true },
    });
    if (existing) {
      await prisma.mccToRewardCategory.update({
        where: { id: existing.id },
        data: { category },
      });
    } else {
      await prisma.mccToRewardCategory.create({
        data: {
          mccCode: row.mccCode,
          category,
          isDefault: true,
        },
      });
    }
  }

  logInfo(`Ingested ${rows.length} MCC rows from ${source}`);
}

main()
  .catch((err) => {
    logError('Ingest failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
