import { z } from "zod";
import Decimal from "decimal.js";
import type {
  AdapterRunResult,
  CounterAsset,
  RewardComponent,
  RiskDimension,
} from "../../domain/types";
import {
  BASE_CHAIN,
  BASE_USDC,
  decimal,
  liveOpportunity,
  ok,
  providerError,
  request,
  type LiveContext,
} from "../live";

export const MORPHO_GRAPHQL_ENDPOINT = "https://api.morpho.org/graphql";
export const MORPHO_MARKETS_QUERY = `query BaseMorphoMarkets { markets(first: 100, orderBy: SupplyAssetsUsd, orderDirection: Desc, where: { chainId_in: [8453], listed: true }) { items { marketId lltv oracle { address } loanAsset { address symbol decimals chain { id } } collateralAsset { address symbol decimals chain { id } } state { supplyApy borrowApy supplyAssetsUsd borrowAssetsUsd liquidityAssetsUsd utilization rewards { supplyApr borrowApr asset { address chain { id } } } } } } }`;
const responseSchema = z.object({
  data: z.object({ markets: z.object({ items: z.array(z.unknown()) }) }),
});
const assetSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  symbol: z.string().min(1),
  decimals: z.number().int().nonnegative(),
  chain: z.object({ id: z.number().int() }),
});
const marketSchema = z.object({
  marketId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  lltv: z.unknown().optional().nullable(),
  oracle: z
    .object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) })
    .optional()
    .nullable(),
  loanAsset: assetSchema,
  collateralAsset: assetSchema,
  state: z.object({
    supplyApy: z.unknown().optional().nullable(),
    borrowApy: z.unknown().optional().nullable(),
    supplyAssetsUsd: z.unknown().optional().nullable(),
    borrowAssetsUsd: z.unknown().optional().nullable(),
    liquidityAssetsUsd: z.unknown().optional().nullable(),
    utilization: z.unknown().optional().nullable(),
    rewards: z.array(z.unknown()).optional().nullable(),
  }),
});
const rewardSchema = z.object({
  supplyApr: z.unknown().optional().nullable(),
  borrowApr: z.unknown().optional().nullable(),
  asset: z.object({ address: z.string(), chain: z.object({ id: z.number() }) }),
});
function optionalDecimal(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const parsed = decimal.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
function optionalWad(value: unknown) {
  const parsed = optionalDecimal(value);
  return parsed === undefined ? undefined : new Decimal(parsed).div("1000000000000000000").toFixed();
}
function counter(asset: z.infer<typeof assetSchema>): CounterAsset {
  return {
    chainId: BASE_CHAIN,
    address: asset.address.toLowerCase(),
    symbol: asset.symbol,
    decimals: asset.decimals,
  };
}
const borrowRisks: RiskDimension[] = [
  {
    key: "contract",
    level: 1,
    label: "Smart contract",
    detail: "Morpho Blue contract risk remains.",
  },
  {
    key: "stablecoin",
    level: 1,
    label: "USDC collateral",
    detail: "Native USDC issuer and depeg risk affects collateral value.",
  },
  {
    key: "leverage",
    level: 3,
    label: "Liquidation",
    detail:
      "Borrowing against USDC can be liquidated if the position exceeds the market LLTV.",
  },
  {
    key: "oracle",
    level: 2,
    label: "Oracle",
    detail:
      "Liquidation depends on the market oracle; inspect the verified oracle address.",
  },
  {
    key: "liquidity",
    level: 2,
    label: "Variable borrow market",
    detail: "Borrow APY and available liquidity can change with utilization.",
  },
];

export async function fetchMorpho(ctx: LiveContext): Promise<AdapterRunResult> {
  const adapterId = "morpho-blue-base",
    sourceId = "morpho-graphql";
  try {
    const got = await request(ctx, MORPHO_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: MORPHO_MARKETS_QUERY }),
    });
    const payload = responseSchema.parse(got.json);
    const observations = [];
    let quarantined = 0,
      rejected = 0;
    for (const raw of payload.data.markets.items) {
      const parsed = marketSchema.safeParse(raw);
      if (!parsed.success) {
        quarantined++;
        continue;
      }
      const x = parsed.data;
      const loanIsUsdc =
        x.loanAsset.chain.id === 8453 &&
        x.loanAsset.address.toLowerCase() === BASE_USDC;
      const collateralIsUsdc =
        x.collateralAsset.chain.id === 8453 &&
        x.collateralAsset.address.toLowerCase() === BASE_USDC;
      if (!loanIsUsdc && !collateralIsUsdc) {
        rejected++;
        continue;
      }
      const role = loanIsUsdc ? "lending_asset" : "collateral_asset";
      const rate = optionalDecimal(
        loanIsUsdc ? x.state.supplyApy : x.state.borrowApy,
      );
      if (rate === undefined) {
        quarantined++;
        continue;
      }
      const other = loanIsUsdc ? x.collateralAsset : x.loanAsset;
      if (other.chain.id !== 8453) {
        quarantined++;
        continue;
      }
      const rewards: RewardComponent[] = [];
      for (const rawReward of x.state.rewards ?? []) {
        const reward = rewardSchema.safeParse(rawReward);
        if (!reward.success || reward.data.asset.chain.id !== 8453) continue;
        const apr = optionalDecimal(
          loanIsUsdc ? reward.data.supplyApr : reward.data.borrowApr,
        );
        if (apr !== undefined)
          rewards.push({
            assetId: `eip155:8453/erc20:${reward.data.asset.address.toLowerCase()}`,
            apr,
          });
      }
      const lltv = optionalWad(x.lltv);
      observations.push(
        liveOpportunity({
          protocolId: "morpho",
          protocolName: "Morpho Blue",
          sourceId,
          sourceName: "Morpho GraphQL",
          sourceUrl: MORPHO_GRAPHQL_ENDPOINT,
          marketKey: `${x.marketId.toLowerCase()}:${role}`,
          name: loanIsUsdc
            ? `Lend USDC · ${other.symbol} collateral`
            : `Borrow ${other.symbol} against USDC`,
          productType: "market",
          usdcRole: role,
          counterAsset: counter(other),
          displayRateLabel: loanIsUsdc ? "Lender supply APY" : "Borrow APY",
          positionDescription: loanIsUsdc
            ? "Supply USDC liquidity to this Morpho Blue market."
            : `Use USDC as collateral to borrow ${other.symbol}.`,
          baseApy: rate,
          tvlUsd: optionalDecimal(
            loanIsUsdc ? x.state.supplyAssetsUsd : x.state.borrowAssetsUsd,
          ),
          liquidityUsd: optionalDecimal(x.state.liquidityAssetsUsd),
          utilization: optionalDecimal(x.state.utilization),
          lltv,
          oracleAddress: x.oracle?.address.toLowerCase(),
          risks: loanIsUsdc ? undefined : borrowRisks,
          rewards,
          rawHash: got.hash,
          at: ctx.at,
          link: `https://app.morpho.org/base/market/${x.marketId.toLowerCase()}`,
          confidence: "high",
        }),
      );
    }
    const warnings = quarantined
      ? [
          `${quarantined} Morpho market row(s) quarantined because required identity or the role-specific rate was missing or invalid.`,
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
        seen: payload.data.markets.items.length,
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
