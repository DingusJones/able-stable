import type { AdapterRunResult, CatalogResponse, Mode, Opportunity } from '../domain/types';
import { demoRuns } from './demo';
export function allDemoOpportunities(): Opportunity[] { return demoRuns().flatMap(r => r.observations); }
export function buildCatalog(mode: Mode = 'core', items = allDemoOpportunities(), failedProviders: string[] = []): CatalogResponse {
  const opportunities = items.filter(x => x.mode === mode);
  const partial = failedProviders.length > 0;
  return {
    catalogAsOf: '2026-08-30T12:00:00.000Z', mode, demoMode: true, status: partial ? 'partial' : opportunities.length ? 'cached' : 'unavailable',
    summary: { total: opportunities.length, live: opportunities.filter(x => x.freshness.status === 'live').length, stale: opportunities.filter(x => x.freshness.status === 'stale').length, unavailableProviders: failedProviders },
    opportunities, notices: mode === 'core' ? ['Fixture rates are illustrative architecture test data, not current yields.', 'Exact opportunity routes are withheld until browser identity checks pass.'] : [mode === 'degen' ? 'Degen opportunities are deferred until protocol-specific payoff, liquidity, and risk models pass review.' : 'No reproducible universal CeFi rate source is approved. Provider rates may depend on account, tier, term, and jurisdiction.']
  };
}
export function buildLiveCatalog(mode: Mode, runs: AdapterRunResult[], at = new Date().toISOString()): CatalogResponse {
  const opportunities = runs.flatMap(r => r.observations).filter(x => x.mode === mode);
  const failed = runs.filter(r => r.state !== 'success').map(r => r.sourceId);
  const status = opportunities.length === 0 ? 'unavailable' : failed.length ? 'partial' : 'live';
  return { catalogAsOf: at, mode, demoMode: false, status,
    summary: { total: opportunities.length, live: opportunities.filter(x => x.freshness.status === 'live').length, stale: opportunities.filter(x => x.freshness.status === 'stale').length, unavailableProviders: failed },
    opportunities, notices: opportunities.length ? (failed.length ? ['Some live providers failed or returned no validated native-USDC observation; valid observations were preserved.'] : []) : ['No provider returned a validated Base native-USDC observation. This is an unavailable response, not a zero-rate or empty-success claim.'],
    adapters: runs.map(r => ({ adapterId:r.adapterId, sourceId:r.sourceId, state:r.state, retrievedAt:r.retrievedAt, accepted:r.counts.accepted, warnings:r.warnings, errors:r.errors })) };
}
