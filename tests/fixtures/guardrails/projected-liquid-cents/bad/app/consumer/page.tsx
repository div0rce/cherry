const projection = { cash: { projectedLiquidCents: 1200 } };

export default function Page(): number {
  return projection.cash.projectedLiquidCents ?? 0;
}
