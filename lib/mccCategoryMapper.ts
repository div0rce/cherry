import {
  MerchantLifeCategory,
  MerchantRiskProfile,
  MerchantVertical,
  RewardCategory,
} from '@prisma/client';
import type { MerchantChannel } from '@prisma/client';

type TagContext = {
  mccCode: number;
  vertical: MerchantVertical | null;
  riskProfile: MerchantRiskProfile | null;
  lifeCategory: MerchantLifeCategory | null;
  channel?: MerchantChannel | null;
};

function isAirTravelMcc(mcc: number): boolean {
  return mcc >= 3000 && mcc <= 3299;
}

function isCarRentalMcc(mcc: number): boolean {
  return mcc >= 3351 && mcc <= 3499;
}

function isTelecomOrStreamingMcc(mcc: number): boolean {
  return mcc === 4812 || mcc === 4816 || mcc === 4899 || (mcc >= 5815 && mcc <= 5818);
}

export function mapTagsToRewardCategory(ctx: TagContext): RewardCategory {
  const { mccCode, vertical, riskProfile, lifeCategory } = ctx;

  // Risk overrides: quasi-cash/gambling route to base category
  if (riskProfile === MerchantRiskProfile.QUASI_CASH || riskProfile === MerchantRiskProfile.GAMBLING) {
    return RewardCategory.OTHER;
  }

  if (vertical === MerchantVertical.LODGING) return RewardCategory.HOTEL;

  if (vertical === MerchantVertical.TRANSPORT) {
    if (isAirTravelMcc(mccCode)) return RewardCategory.AIR_TRAVEL;
    if (isCarRentalMcc(mccCode)) return RewardCategory.CAR_RENTAL;
    return RewardCategory.TRAVEL;
  }

  if (vertical === MerchantVertical.FOOD_DRINK) return RewardCategory.DINING;

  if (vertical === MerchantVertical.DIGITAL_SERVICES) {
    if (isTelecomOrStreamingMcc(mccCode)) return RewardCategory.UTILITIES;
    return RewardCategory.ONLINE_SHOPPING;
  }

  if (vertical === MerchantVertical.HEALTHCARE) return RewardCategory.HEALTH;

  if (vertical === MerchantVertical.RETAIL) {
    // keep groceries special-case in ingest mapping; default retail to general merch
    return RewardCategory.GENERAL_MERCHANDISE;
  }

  if (
    vertical === MerchantVertical.FINANCIAL ||
    vertical === MerchantVertical.GOVERNMENT ||
    vertical === MerchantVertical.NONPROFIT ||
    vertical === MerchantVertical.PROFESSIONAL
  ) {
    return RewardCategory.OTHER;
  }

  if (vertical === MerchantVertical.ENTERTAINMENT) return RewardCategory.ENTERTAINMENT;

  if (vertical === MerchantVertical.EDUCATION) return RewardCategory.OTHER;

  // lifeCategory secondary hints
  if (lifeCategory === MerchantLifeCategory.TRAVEL) return RewardCategory.TRAVEL;
  if (lifeCategory === MerchantLifeCategory.AUTO) return RewardCategory.TRAVEL;
  if (lifeCategory === MerchantLifeCategory.HEALTH) return RewardCategory.HEALTH;

  return RewardCategory.GENERAL_MERCHANDISE;
}
