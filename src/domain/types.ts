export type Mode = 'core' | 'degen' | 'cefi';
export type FreshnessStatus = 'live' | 'recently_updated' | 'cached' | 'stale' | 'partial' | 'unavailable' | 'unverified';
export type AdapterState = 'success' | 'partial' | 'empty' | 'error';
export type DecimalString = string;
export type ProductType = 'vault'|'market';
export type UsdcRole = 'lending_asset'|'collateral_asset';
export interface CounterAsset { chainId: string; address: string; symbol: string; decimals: number; }

export interface Chain { id: string; family: 'evm'|'solana'; name: string; slug: string; explorerBaseUrl: string; status: 'approved'|'eligible'; }
export interface Asset { id: string; familyId: string; symbol: string; name: string; chainId: string; addressOrMint: string; decimals: number; form: 'native'|'bridged'|'wrapped'|'synthetic'|'receipt'|'yield_bearing'; nativeStatus: 'canonical'|'bridged'|'unknown'; verifiedAt: string; evidenceUrl: string; }
export interface RiskDimension { key: 'contract'|'stablecoin'|'liquidity'|'oracle'|'admin'|'bridge'|'counterparty'|'leverage'|'rewards'|'lockup'|'maturity'; level: 0|1|2|3; label: string; detail: string; }
export interface RewardComponent { assetId: string; apr?: DecimalString; apy?: DecimalString; pricedAt?: string; priceSource?: string; expiresAt?: string; }
export interface Freshness { status: FreshnessStatus; retrievedAt?: string; sourceObservedAt?: string; ageSeconds?: number; targetSeconds: number; staleAfterSeconds: number; sourceRunId: string; warning?: string; }
export interface Evidence { ref: string; sourceId: string; sourceName: string; sourceUrl: string; authority: 'authoritative'|'cross_check'|'advisory'; rawPayloadHash: string; adapterVersion: string; schemaVersion: string; retrievedAt: string; blockOrSlot?: string; demo: boolean; }
export interface Opportunity {
  id: string; mode: Mode; protocolId: string; protocolName: string; chainId: string; assetId: string; name: string; category: 'money_market'|'vault'|'fixed_yield'|'cefi';
  productType?: ProductType; usdcRole?: UsdcRole; counterAsset?: CounterAsset; displayRateLabel?: 'Lending APY'|'Lender supply APY'|'Borrow APY'; positionDescription?: string; lltv?: DecimalString; oracleAddress?: string;
  baseApr?: DecimalString; baseApy?: DecimalString; rewardComponents: RewardComponent[]; totalQuotedApr?: DecimalString; totalQuotedApy?: DecimalString;
  rateMethod: 'provider_reported'|'onchain_derived'|'annualized_snapshot'|'historical_realized'|'forecast'|'fixed_to_maturity'|'unknown';
  isVariable: boolean; maturityAt?: string; tvlUsd?: DecimalString; availableLiquidityUsd?: DecimalString; utilization?: DecimalString; depositCapUsd?: DecimalString;
  lockup: { kind: 'none'|'cooldown'|'fixed'|'unknown'; label: string }; withdrawal: { status: 'available'|'limited'|'unknown'; label: string };
  riskBand: 'core'|'enhanced'|'degen'|'cefi'; risks: RiskDimension[]; whyHigh: string[];
  freshness: Freshness; evidence: Evidence; link: LinkResolution; confidence: 'high'|'medium'|'low'|'unverified'; validationStatus: 'accepted'|'quarantined'|'conflicting';
}
export interface LinkResolution { status: 'verified_exact'|'verified_protocol'|'verified_explorer'|'unverified'|'invalid'; label: string; url?: string; checkedAt?: string; }
export interface ProviderError { sourceId: string; adapterId: string; kind: 'timeout'|'http'|'rate_limit'|'malformed_json'|'schema_drift'|'rpc'|'conflict'|'empty'|'unknown'; messageSafe: string; retryable: boolean; occurredAt: string; }
export interface AdapterRunResult { adapterId: string; sourceId: string; runId: string; state: AdapterState; retrievedAt: string; observations: Opportunity[]; warnings: string[]; errors: ProviderError[]; counts: { seen: number; accepted: number; quarantined: number; rejected: number }; rawPayloadHash?: string; }
export interface AdapterStatus { adapterId: string; sourceId: string; state: AdapterState; retrievedAt: string; accepted: number; warnings: string[]; errors: ProviderError[]; }
export interface CatalogResponse { catalogAsOf: string; mode: Mode; demoMode: boolean; status: FreshnessStatus; summary: { total: number; live: number; stale: number; unavailableProviders: string[] }; opportunities: Opportunity[]; notices: string[]; adapters?: AdapterStatus[]; }
