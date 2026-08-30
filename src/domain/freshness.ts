import type { Freshness, FreshnessStatus } from './types';
export function freshness(retrievedAt: string | undefined, now: string, targetSeconds: number, staleAfterSeconds: number, sourceRunId: string): Freshness {
  if (!retrievedAt) return { status: 'unavailable', targetSeconds, staleAfterSeconds, sourceRunId, warning: 'No validated observation is available.' };
  const ageSeconds = Math.max(0, Math.floor((Date.parse(now) - Date.parse(retrievedAt)) / 1000));
  let status: FreshnessStatus = 'live';
  if (ageSeconds > staleAfterSeconds) status = 'stale'; else if (ageSeconds > targetSeconds) status = 'recently_updated';
  return { status, retrievedAt, ageSeconds, targetSeconds, staleAfterSeconds, sourceRunId, warning: status === 'stale' ? 'This is a last-known-good observation and is excluded from best-rate sorting.' : undefined };
}
