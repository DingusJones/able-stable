import { createHash } from './hash';
import { freshness } from '../domain/freshness';
import { resolveLink } from '../domain/linkResolver';
import type { AdapterRunResult, Opportunity, RiskDimension } from '../domain/types';

export type DemoInput = { protocolId: string; protocolName: string; sourceId: string; sourceName: string; sourceUrl: string; chainId: string; assetId: string; marketKey: string; baseApy?: string; baseApr?: string; rewardApr?: string; tvlUsd?: string; liquidityUsd?: string; utilization?: string; totalQuotedApy?: string; link?: string; warnings?: string[] };
const risks: RiskDimension[] = [
  { key: 'contract', level: 1, label: 'Smart contract', detail: 'Protocol contracts and upgrade surface require continuing review.' },
  { key: 'stablecoin', level: 1, label: 'Stablecoin', detail: 'USDC issuer and depeg risk remain.' },
  { key: 'liquidity', level: 1, label: 'Exit liquidity', detail: 'Demo liquidity is illustrative and not a live withdrawal quote.' },
  { key: 'admin', level: 2, label: 'Admin controls', detail: 'Pause or upgrade controls may affect access.' },
  { key: 'rewards', level: 1, label: 'Rewards', detail: 'Incentives are shown separately and may expire.' }
];
export function demoOpportunity(x: DemoInput, retrievedAt: string): Opportunity {
  const runId = `demo-${x.protocolId}-20260830`; const raw = JSON.stringify(x);
  return {
    id: `${x.protocolId}:${x.chainId}:reserve:${x.marketKey}`, mode: 'core', protocolId: x.protocolId, protocolName: x.protocolName, chainId: x.chainId, assetId: x.assetId,
    name: `${x.protocolName} demonstration market`, category: 'money_market', baseApy: x.baseApy, baseApr: x.baseApr,
    rewardComponents: x.rewardApr ? [{ assetId: `demo:reward:${x.protocolId}`, apr: x.rewardApr }] : [], totalQuotedApy: x.totalQuotedApy,
    rateMethod: 'provider_reported', isVariable: true, tvlUsd: x.tvlUsd, availableLiquidityUsd: x.liquidityUsd, utilization: x.utilization,
    lockup: { kind: 'none', label: 'No protocol lockup verified in demo fixture' }, withdrawal: { status: 'unknown', label: 'Live withdrawal capacity unavailable' },
    riskBand: 'core', risks, whyHigh: x.rewardApr ? ['Includes a separately identified demonstration incentive component.'] : ['Variable utilization-driven supply rate.'],
    freshness: { ...freshness(retrievedAt, retrievedAt, 600, 1800, runId), status: 'cached', warning: 'Deterministic fixture observation — not a live quote.' },
    evidence: { ref: `fixture:${x.protocolId}`, sourceId: x.sourceId, sourceName: `${x.sourceName} (fixture)`, sourceUrl: x.sourceUrl, authority: 'authoritative', rawPayloadHash: createHash(raw), adapterVersion: '1.0.0-demo', schemaVersion: '1', retrievedAt, demo: true },
    link: resolveLink(x.protocolId, x.link, false, retrievedAt), confidence: 'unverified', validationStatus: 'accepted'
  };
}
export function success(adapterId: string, sourceId: string, retrievedAt: string, observations: Opportunity[], warnings: string[] = []): AdapterRunResult {
  return { adapterId, sourceId, runId: `demo-${adapterId}-20260830`, state: observations.length ? 'success' : 'empty', retrievedAt, observations, warnings, errors: [], counts: { seen: observations.length, accepted: observations.length, quarantined: 0, rejected: 0 } };
}
