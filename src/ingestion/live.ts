import { z } from "zod";
import { freshness } from "../domain/freshness";
import { resolveLink } from "../domain/linkResolver";
import { evmAssetId } from "../domain/identity";
import type {
  AdapterRunResult,
  CounterAsset,
  Opportunity,
  ProductType,
  ProviderError,
  RewardComponent,
  RiskDimension,
  UsdcRole,
  VaultVersion,
} from "../domain/types";

export const BASE_CHAIN = "eip155:8453";
export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export const BASE_USDC_ID = evmAssetId(8453, BASE_USDC);
export const decimal = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine(
    (v) => /^(0|[1-9]\d*)(\.\d+)?$/.test(v) && Number.isFinite(Number(v)),
    "finite non-negative decimal required",
  );
export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
export type LiveContext = {
  fetcher: Fetcher;
  at: string;
  timeoutMs?: number;
  rpcUrl?: string;
  aaveDataProvider?: string;
  compoundComet?: string;
};

export async function sha256(raw: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return `sha256:${[...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
export function providerError(
  adapterId: string,
  sourceId: string,
  at: string,
  kind: ProviderError["kind"],
  message: string,
  retryable = true,
): AdapterRunResult {
  return {
    adapterId,
    sourceId,
    runId: `${adapterId}-${at}`,
    state: "error",
    retrievedAt: at,
    observations: [],
    warnings: [],
    errors: [
      {
        adapterId,
        sourceId,
        kind,
        messageSafe: message,
        retryable,
        occurredAt: at,
      },
    ],
    counts: { seen: 0, accepted: 0, quarantined: 0, rejected: 0 },
  };
}
export async function request(
  ctx: LiveContext,
  url: string,
  init?: RequestInit,
) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:")
    throw new Error("Only HTTPS provider URLs are allowed");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs ?? 8000);
  try {
    const response = await ctx.fetcher(url, {
      ...init,
      signal: controller.signal,
      headers: { accept: "application/json", ...init?.headers },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Malformed JSON");
    }
    return { raw, json, hash: await sha256(raw) };
  } finally {
    clearTimeout(timer);
  }
}
const risks = [
  {
    key: "contract" as const,
    level: 1 as const,
    label: "Smart contract",
    detail: "Contract and upgrade risk remains.",
  },
  {
    key: "stablecoin" as const,
    level: 1 as const,
    label: "Stablecoin",
    detail: "Native USDC issuer and depeg risk remains.",
  },
  {
    key: "liquidity" as const,
    level: 1 as const,
    label: "Exit liquidity",
    detail: "Reported liquidity is a snapshot, not a withdrawal guarantee.",
  },
];
export function liveOpportunity(x: {
  protocolId: string;
  protocolName: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  marketKey: string;
  name: string;
  category?: Opportunity["category"];
  baseApy?: string;
  baseApr?: string;
  rewards?: RewardComponent[];
  tvlUsd?: string;
  liquidityUsd?: string;
  utilization?: string;
  rawHash: string;
  at: string;
  observedAt?: string;
  block?: string;
  link?: string;
  authority?: Opportunity["evidence"]["authority"];
  confidence?: Opportunity["confidence"];
  productType?: ProductType;
  vaultVersion?: VaultVersion;
  usdcRole?: UsdcRole;
  counterAsset?: CounterAsset;
  displayRateLabel?: Opportunity["displayRateLabel"];
  positionDescription?: string;
  lltv?: string;
  oracleAddress?: string;
  risks?: RiskDimension[];
}): Opportunity {
  const runId = `${x.protocolId}-${x.at}`;
  return {
    id: `${x.protocolId}:${BASE_CHAIN}:${x.category ?? "money_market"}:${x.marketKey}`,
    mode: "core",
    protocolId: x.protocolId,
    protocolName: x.protocolName,
    chainId: BASE_CHAIN,
    assetId: BASE_USDC_ID,
    name: x.name,
    category: x.category ?? "money_market",
    productType: x.productType,
    vaultVersion: x.vaultVersion,
    usdcRole: x.usdcRole,
    counterAsset: x.counterAsset,
    displayRateLabel: x.displayRateLabel,
    positionDescription: x.positionDescription,
    lltv: x.lltv,
    oracleAddress: x.oracleAddress,
    baseApy: x.baseApy,
    baseApr: x.baseApr,
    rewardComponents: x.rewards ?? [],
    rateMethod:
      x.authority === "advisory"
        ? "provider_reported"
        : x.sourceId.includes("rpc")
          ? "onchain_derived"
          : "provider_reported",
    isVariable: true,
    tvlUsd: x.tvlUsd,
    availableLiquidityUsd: x.liquidityUsd,
    utilization: x.utilization,
    lockup: { kind: "none", label: "No protocol lockup" },
    withdrawal: {
      status: x.liquidityUsd === undefined ? "unknown" : "available",
      label:
        x.liquidityUsd === undefined
          ? "Live withdrawal capacity unavailable"
          : "Subject to live market liquidity",
    },
    riskBand: "core",
    risks: x.risks ?? risks,
    whyHigh: [],
    freshness: {
      ...freshness(x.at, x.at, 600, 1800, runId),
      sourceObservedAt: x.observedAt,
    },
    evidence: {
      ref: `live:${x.sourceId}:${x.marketKey}`,
      sourceId: x.sourceId,
      sourceName: x.sourceName,
      sourceUrl: x.sourceUrl,
      authority: x.authority ?? "authoritative",
      rawPayloadHash: x.rawHash,
      adapterVersion: "2.1.0-live",
      schemaVersion: "3",
      retrievedAt: x.at,
      blockOrSlot: x.block,
      demo: false,
    },
    link: resolveLink(x.protocolId, x.link, true, x.at),
    confidence: x.confidence ?? "high",
    validationStatus: "accepted",
  };
}
export function ok(
  adapterId: string,
  sourceId: string,
  at: string,
  observations: Opportunity[],
  hash: string,
  warnings: string[] = [],
): AdapterRunResult {
  return {
    adapterId,
    sourceId,
    runId: `${adapterId}-${at}`,
    state: observations.length ? "success" : "empty",
    retrievedAt: at,
    observations,
    warnings,
    errors: observations.length
      ? []
      : [
          {
            adapterId,
            sourceId,
            kind: "empty",
            messageSafe:
              "Provider returned no validated Base native-USDC observation.",
            retryable: false,
            occurredAt: at,
          },
        ],
    counts: {
      seen: observations.length,
      accepted: observations.length,
      quarantined: 0,
      rejected: 0,
    },
    rawPayloadHash: hash,
  };
}
