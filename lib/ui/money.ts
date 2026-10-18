// Integer cents to "$12.34" by string slicing: no float division (money-float-banned) and no
// locale APIs (server components may not format by locale).
export function formatCents(cents: number): string {
  const digits = String(Math.abs(Math.trunc(cents))).padStart(3, '0');
  const dollars = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${cents < 0 ? '-' : ''}$${dollars}.${digits.slice(-2)}`;
}
