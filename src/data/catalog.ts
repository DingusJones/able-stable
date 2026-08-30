import type { CatalogResponse, Mode, Opportunity } from '../domain/types';
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
