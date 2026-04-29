export const DEFAULT_HORIZON_STEPS = 3 as const;
export const MAX_HORIZON_STEPS = 6 as const;

export type HorizonMode = 'planning';
export type FutureJustification = 'forbidden';

export type HorizonConfig = {
  mode: HorizonMode;
  steps: number;
  futureJustification: FutureJustification;
};

export type HorizonConfigInput = {
  mode?: HorizonMode;
  steps?: number;
  futureJustification?: FutureJustification;
};

export function normalizeHorizonConfig(
  input?: HorizonConfigInput
): HorizonConfig {
  const steps =
    input === undefined || input.steps === undefined
      ? DEFAULT_HORIZON_STEPS
      : input.steps;

  if (!Number.isInteger(steps) || steps < 1 || steps > MAX_HORIZON_STEPS) {
    throw new Error(`Invalid horizon length: ${steps}`);
  }

  return {
    mode: 'planning',
    steps,
    futureJustification: 'forbidden',
  };
}
