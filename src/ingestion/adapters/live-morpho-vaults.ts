import { z } from "zod";
import type { AdapterRunResult, RiskDimension } from "../../domain/types";
import {
  BASE_USDC,
  decimal,
  liveOpportunity,
  ok,
  providerError,
  request,
  type LiveContext,
} from "../live";

export const MORPHO_VAULTS_ENDPOINT = "https://api.morpho.org/graphql";
export const MORPHO_VAULTS_QUERY = `query BaseUsdcVaults { vaults(first: 100, orderBy: TotalAssetsUsd, orderDirection: Desc, where: { chainId_in: [8453], assetAddress_in: ["${BASE_USDC}"], listed: true }) { items { address name listed asset { address symbol decimals chain { id } } state { netApy totalAssetsUsd } liquidity { usd } } } }`;
const responseSchema = z.object({
  data: z.object({ vaults: z.object({ items: z.array(z.unknown()) }) }),
});
const vaultSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  name: z.string().min(1),
  listed: z.literal(true),
  asset: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    symbol: z.string(),
    decimals: z.number().int(),
    chain: z.object({ id: z.number().int() }),
  }),
  state: z
    .object({
      netApy: z.unknown().optional().nullable(),
      totalAssetsUsd: z.unknown().optional().nullable(),
    })
    .nullable(),
  liquidity: z
    .object({ usd: z.unknown().optional().nullable() })
    .optional()
    .nullable(),
});
const vaultRisks: RiskDimension[] = [
  {
    key: "contract",
    level: 1,
    label: "Smart contract",
    detail: "Vault and allocated-market contract risk remains.",
  },
  {
    key: "admin",
    level: 2,
    label: "Curated strategy",
    detail: "A curator selects allocations and strategy parameters.",
  },
  {
    key: "liquidity",
    level: 1,
    label: "Withdrawal liquidity",
    detail: "Vault liquidity is a snapshot, not a withdrawal guarantee.",
  },
  {
    key: "stablecoin",
    level: 1,
    label: "Stablecoin",
    detail: "Native USDC issuer and depeg risk remains.",
  },
];
function optionalDecimal(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const parsed = decimal.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
export async function fetchMorphoVaults(
  ctx: LiveContext,
): Promise<AdapterRunResult> {
  const adapterId = "morpho-vaults-base",
    sourceId = "morpho-vaults-graphql";
  try {
    const got = await request(ctx, MORPHO_VAULTS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: MORPHO_VAULTS_QUERY }),
    });
    const payload = responseSchema.parse(got.json);
    const observations = [];
    let quarantined = 0,
      rejected = 0;
    for (const raw of payload.data.vaults.items) {
      const parsed = vaultSchema.safeParse(raw);
      if (!parsed.success) {
        quarantined++;
        continue;
      }
      const x = parsed.data;
      if (
        x.asset.chain.id !== 8453 ||
        x.asset.address.toLowerCase() !== BASE_USDC
      ) {
        rejected++;
        continue;
      }
      const apy = optionalDecimal(x.state?.netApy);
      if (apy === undefined) {
        quarantined++;
        continue;
      }
      const address = x.address.toLowerCase();
      observations.push(
        liveOpportunity({
          protocolId: "morpho",
          protocolName: "Morpho Vault",
          sourceId,
          sourceName: "Morpho GraphQL · Vaults",
          sourceUrl: MORPHO_VAULTS_ENDPOINT,
          marketKey: `${address}:lending_asset`,
          name: x.name,
          category: "vault",
          productType: "vault",
          usdcRole: "lending_asset",
          displayRateLabel: "Lending APY",
          positionDescription:
            "Deposit USDC into a curated lending-only vault strategy.",
          baseApy: apy,
          tvlUsd: optionalDecimal(x.state?.totalAssetsUsd),
          liquidityUsd: optionalDecimal(x.liquidity?.usd),
          risks: vaultRisks,
          rawHash: got.hash,
          at: ctx.at,
          link: `https://app.morpho.org/base/vault/${address}`,
          confidence: "high",
        }),
      );
    }
    const warnings = quarantined
      ? [
          `${quarantined} Morpho vault row(s) quarantined because required identity or net lending APY was missing or invalid.`,
        ]
      : [];
    const result = ok(
      adapterId,
      sourceId,
      ctx.at,
      observations,
      got.hash,
      warnings,
    );
    return {
      ...result,
      counts: {
        seen: payload.data.vaults.items.length,
        accepted: observations.length,
        quarantined,
        rejected,
      },
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : "Unknown provider error";
    return providerError(
      adapterId,
      sourceId,
      ctx.at,
      m === "Malformed JSON"
        ? "malformed_json"
        : m.startsWith("HTTP")
          ? "http"
          : "schema_drift",
      m,
    );
  }
}
