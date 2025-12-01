import { RewardCategory } from '@prisma/client';

function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

export function normalizeCategoryPreference(raw: string): RewardCategory {
  const normalized = normalize(raw);
  const values = Object.values(RewardCategory) as string[];
  if (values.includes(normalized)) {
    return normalized as RewardCategory;
  }
  return RewardCategory.OTHER;
}

