export const BRAND_PROPERTIES = [
  '__isoDateBrand',
  '__moneyBrand',
  '__engineVersion',
  '__currencyBrand',
  '__accountIdBrand',
  '__txnIdBrand',
  '__nonZeroAmountBrand',
  '__balancedPostingsBrand',
] as const;
export const BRAND_CONSTRUCTORS = [
  'asIsoDate',
  'asMoneyCents',
  'asEngineVersion',
  'asCurrency',
  'asAccountId',
  'asTxnId',
  'asNonZeroAmount',
  'balancePostings',
] as const;
