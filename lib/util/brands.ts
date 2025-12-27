export type MoneyCents = number & { __moneyBrand: true };
export type EngineVersion = string & { __engineVersion: true };

export function asMoneyCents(value: number): MoneyCents {
  return value as MoneyCents;
}

export function asEngineVersion(value: string): EngineVersion {
  return value as EngineVersion;
}
