import Decimal from 'decimal.js';
export function aprToApy(apr: string, compounds?: number): string | undefined {
  if (!compounds || compounds < 1 || !Number.isInteger(compounds)) return undefined;
  const rate = new Decimal(apr); return rate.div(compounds).plus(1).pow(compounds).minus(1).toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}
export function comparableTotal(baseApy?: string, rewards: { apy?: string }[] = []): string | undefined {
  if (!baseApy || rewards.some(r => r.apy === undefined)) return undefined;
  return rewards.reduce((sum, r) => sum.plus(r.apy!), new Decimal(baseApy)).toString();
}
export function percent(value?: string, digits = 2) { return value === undefined ? 'Unavailable' : `${new Decimal(value).mul(100).toFixed(digits)}%`; }
export function usd(value?: string) {
  if (value === undefined) return 'Unavailable'; const n = new Decimal(value);
  if (n.gte(1e9)) return `$${n.div(1e9).toFixed(1)}B`; if (n.gte(1e6)) return `$${n.div(1e6).toFixed(1)}M`; if (n.gte(1e3)) return `$${n.div(1e3).toFixed(1)}K`; return `$${n.toFixed(0)}`;
}
