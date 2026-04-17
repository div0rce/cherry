const projection = { cash: { projectedLiquidCents: 1200 } };

export function readProjection(): number {
  return projection.cash.projectedLiquidCents ?? 0;
}
