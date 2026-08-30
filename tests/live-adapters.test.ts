import { describe, expect, it } from "vitest";
import { fetchMorpho } from "../src/ingestion/adapters/live-morpho";
import { fetchMorphoVaults } from "../src/ingestion/adapters/live-morpho-vaults";
import { fetchMoonwell } from "../src/ingestion/adapters/live-moonwell";
import { fetchDefiLlama } from "../src/ingestion/adapters/live-defillama";
import {
  AAVE_BASE_MARKETS_QUERY,
  AAVE_GRAPHQL_ENDPOINT,
  fetchAave,
} from "../src/ingestion/adapters/live-aave";
import { BASE_USDC, BASE_USDC_ID } from "../src/ingestion/live";
import { evmAssetId } from "../src/domain/identity";
import { buildLiveCatalog } from "../src/data/catalog";
const at = "2026-08-30T12:00:00.000Z";
const response = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    }),
  );
const aaveMarket = (overrides: Record<string, unknown> = {}) => ({
  name: "AaveV3Base",
  chain: { chainId: 8453 },
  reserves: [
    {
      underlyingToken: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        symbol: "USDC",
        chainId: 8453,
      },
      size: { usd: "12", amount: { value: "12" } },
      supplyInfo: { apy: { value: "0" }, total: { value: "12" } },
    },
  ],
  totalMarketSize: "30",
  totalAvailableLiquidity: "0",
  ...overrides,
});
const token = (address: string, symbol: string) => ({
  address,
  symbol,
  decimals: 18,
  chain: { id: 8453 },
});
const morphoMarket = (overrides: Record<string, unknown> = {}) => ({
  marketId: `0x${"1".repeat(64)}`,
  lltv: "860000000000000000",
  oracle: { address: "0x1111111111111111111111111111111111111111" },
  loanAsset: { ...token(BASE_USDC, "USDC"), decimals: 6 },
  collateralAsset: token("0x2222222222222222222222222222222222222222", "WETH"),
  state: {
    supplyApy: "0",
    borrowApy: "0.05",
    supplyAssetsUsd: "12",
    borrowAssetsUsd: "8",
    liquidityAssetsUsd: "0",
    utilization: "1",
    rewards: [],
  },
  ...overrides,
});
const vault = (overrides: Record<string, unknown> = {}) => ({
  address: "0x3333333333333333333333333333333333333333",
  name: "Official USDC Vault",
  listed: true,
  asset: { ...token(BASE_USDC, "USDC"), decimals: 6 },
  state: { netApy: "0", totalAssetsUsd: "12" },
  liquidity: { usd: "0" },
  ...overrides,
});
describe("live adapter boundaries", () => {
  it("derives the Base USDC ID with the canonical identity helper", () =>
    expect(BASE_USDC_ID).toBe(evmAssetId(8453, BASE_USDC)));
  it("performs the official Aave GraphQL request and preserves explicit zero values", async () => {
    let input: RequestInfo | URL | undefined, init: RequestInit | undefined;
    const run = await fetchAave({
      at,
      fetcher: (nextInput, nextInit) => {
        input = nextInput;
        init = nextInit;
        return response({ data: { markets: [aaveMarket()] } });
      },
    });
    expect(input).toBe(AAVE_GRAPHQL_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      query: AAVE_BASE_MARKETS_QUERY,
    });
    expect(run.state).toBe("success");
    expect(run.observations).toHaveLength(1);
    expect(run.observations[0].baseApy).toBe("0");
    expect(run.observations[0].availableLiquidityUsd).toBe("0");
    expect(run.observations[0].tvlUsd).toBe("12");
    expect(run.observations[0].assetId).toBe(BASE_USDC_ID);
    expect(run.observations[0].freshness.status).toBe("live");
    expect(run.observations[0].freshness.sourceObservedAt).toBeUndefined();
    expect(run.observations[0].evidence).toMatchObject({
      demo: false,
      retrievedAt: at,
      sourceUrl: AAVE_GRAPHQL_ENDPOINT,
    });
    expect(run.observations[0].evidence.rawPayloadHash).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
    expect(run.observations[0].rewardComponents).toEqual([]);
    expect(run.observations[0].link.status).toBe("unverified");
  });
  it.each([
    ["wrong market chain", { chain: { chainId: 1 } }],
    [
      "wrong token chain",
      {
        reserves: [
          {
            underlyingToken: {
              address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              symbol: "USDC",
              chainId: 1,
            },
            size: { usd: "12", amount: { value: "12" } },
            supplyInfo: { apy: { value: "0.1" }, total: { value: "12" } },
          },
        ],
      },
    ],
    [
      "wrong canonical address",
      {
        reserves: [
          {
            underlyingToken: {
              address: "0x0000000000000000000000000000000000000000",
              symbol: "USDC",
              chainId: 8453,
            },
            size: { usd: "12", amount: { value: "12" } },
            supplyInfo: { apy: { value: "0.1" }, total: { value: "12" } },
          },
        ],
      },
    ],
  ])("rejects Aave %s", async (_label, overrides) => {
    const run = await fetchAave({
      at,
      fetcher: () => response({ data: { markets: [aaveMarket(overrides)] } }),
    });
    expect(run.state).toBe("empty");
    expect(run.observations).toEqual([]);
    expect(run.errors[0].kind).toBe("empty");
  });
  it("classifies Morpho markets by canonical USDC role and preserves explicit zero", async () => {
    const collateral = morphoMarket({
      marketId: `0x${"2".repeat(64)}`,
      loanAsset: token("0x4444444444444444444444444444444444444444", "WETH"),
      collateralAsset: { ...token(BASE_USDC, "USDC"), decimals: 6 },
    });
    const run = await fetchMorpho({
      at,
      fetcher: () =>
        response({
          data: { markets: { items: [morphoMarket(), collateral] } },
        }),
    });
    expect(run.observations).toHaveLength(2);
    expect(run.observations[0]).toMatchObject({
      productType: "market",
      usdcRole: "lending_asset",
      displayRateLabel: "Lender supply APY",
      baseApy: "0",
      counterAsset: { symbol: "WETH" },
    });
    expect(run.observations[1]).toMatchObject({
      usdcRole: "collateral_asset",
      displayRateLabel: "Borrow APY",
      baseApy: "0.05",
      lltv: "0.86",
      counterAsset: { symbol: "WETH" },
    });
    expect(run.observations[1].risks.map((x) => x.key)).toContain("leverage");
    expect(new Set(run.observations.map((x) => x.id)).size).toBe(2);
  });
  it("rejects noncanonical Morpho rows and quarantines unavailable role rates", async () => {
    const wrong = morphoMarket({
      loanAsset: {
        ...token("0x5555555555555555555555555555555555555555", "USDC"),
        decimals: 6,
      },
    });
    const unavailable = morphoMarket({
      marketId: `0x${"3".repeat(64)}`,
      state: { ...morphoMarket().state, borrowApy: null },
      loanAsset: token("0x4444444444444444444444444444444444444444", "WETH"),
      collateralAsset: { ...token(BASE_USDC, "USDC"), decimals: 6 },
    });
    const run = await fetchMorpho({
      at,
      fetcher: () =>
        response({ data: { markets: { items: [wrong, unavailable] } } }),
    });
    expect(run.observations).toEqual([]);
    expect(run.counts).toMatchObject({ seen: 2, quarantined: 1, rejected: 1 });
  });
  it("normalizes listed canonical USDC vaults and keeps unavailable rates explicit", async () => {
    const run = await fetchMorphoVaults({
      at,
      fetcher: () =>
        response({
          data: {
            vaults: {
              items: [
                vault(),
                vault({
                  address: "0x4444444444444444444444444444444444444444",
                  state: { netApy: null, totalAssetsUsd: "4" },
                }),
                vault({
                  address: "0x5555555555555555555555555555555555555555",
                  asset: token(
                    "0x6666666666666666666666666666666666666666",
                    "USDC",
                  ),
                }),
              ],
            },
          },
        }),
    });
    expect(run.observations).toHaveLength(1);
    expect(run.observations[0]).toMatchObject({
      productType: "vault",
      usdcRole: "lending_asset",
      displayRateLabel: "Lending APY",
      baseApy: "0",
      tvlUsd: "12",
      availableLiquidityUsd: "0",
    });
    expect(run.observations[0].link).toMatchObject({
      status: "verified_exact",
      url: "https://app.morpho.org/base/vault/0x3333333333333333333333333333333333333333",
    });
    expect(run.counts).toMatchObject({
      seen: 3,
      accepted: 1,
      quarantined: 1,
      rejected: 1,
    });
  });
  it("isolates provider failure while preserving a good source", async () => {
    const good = await fetchAave({
      at,
      fetcher: () => response({ data: { markets: [aaveMarket()] } }),
    });
    const bad = await fetchMorpho({ at, fetcher: () => response("not json") });
    const catalog = buildLiveCatalog("core", [good, bad], at);
    expect(catalog.status).toBe("partial");
    expect(catalog.opportunities).toHaveLength(1);
    expect(catalog.summary.unavailableProviders).toContain("morpho-graphql");
  });
  it("maps Moonwell actual response units, preserves zero, and leaves negative liquidity unavailable", async () => {
    let headers: Headers | undefined;
    const run = await fetchMoonwell({
      at,
      fetcher: (_input, init) => {
        headers = new Headers(init?.headers);
        return response({
          data: [
            {
              asset: "USDC",
              assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              mToken: "mUSDC",
              deprecated: false,
              baseSupplyApy: 141.6243731702,
              totalSupplyApr: 141.6851396374,
              totalSupplyUsd: 12487152.201541673,
              liquidityUsd: -34317.169938124716,
              utilization: 1.0027481982588382,
            },
            {
              asset: "USDC",
              assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              mToken: "mUSDC-zero",
              deprecated: false,
              baseSupplyApy: 0,
              totalSupplyApr: 0,
              totalSupplyUsd: 0,
              liquidityUsd: 0,
              utilization: 0,
            },
          ],
        });
      },
    });
    expect(headers?.get("user-agent")).toBe(
      "able-stable/0.1 (public yield catalog)",
    );
    expect(run.state).toBe("success");
    expect(run.observations[0]).toMatchObject({
      baseApy: "1.416243731702",
      baseApr: "1.416851396374",
      tvlUsd: "12487152.201541673",
      availableLiquidityUsd: undefined,
    });
    expect(run.observations[0].withdrawal.status).toBe("unknown");
    expect(run.warnings.some((x) => x.includes("negative liquidity"))).toBe(
      true,
    );
    expect(run.observations[1]).toMatchObject({
      baseApy: "0",
      baseApr: "0",
      tvlUsd: "0",
      availableLiquidityUsd: "0",
      utilization: "0",
    });
  });
  it("turns a structurally malformed Moonwell payload into schema drift", async () => {
    const run = await fetchMoonwell({ at, fetcher: () => response([]) });
    expect(run.state).toBe("error");
    expect(run.observations).toEqual([]);
    expect(run.errors[0].kind).toBe("schema_drift");
  });
  it("keeps deprecated and non-canonical Moonwell rows out", async () => {
    const base = {
      asset: "USDC",
      mToken: "mUSDC",
      baseSupplyApy: 0,
      totalSupplyApr: 0,
      totalSupplyUsd: 0,
    };
    const run = await fetchMoonwell({
      at,
      fetcher: () =>
        response({
          data: [
            {
              ...base,
              assetAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
              deprecated: true,
            },
            {
              ...base,
              assetAddress: "0x0000000000000000000000000000000000000000",
              deprecated: false,
            },
          ],
        }),
    });
    expect(run.state).toBe("empty");
    expect(buildLiveCatalog("core", [run], at).status).toBe("unavailable");
  });
  it("treats null DeFiLlama identity as no identity without losing a valid exact-link sibling", async () => {
    const valid = {
      pool: "base-usdc",
      chain: "Base",
      project: "aave-v3",
      symbol: "USDC",
      tvlUsd: 10,
      apyBase: 0,
      underlyingTokens: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
      url: "https://app.aave.com/markets/",
    };
    const run = await fetchDefiLlama({
      at,
      fetcher: () =>
        response({
          data: [
            { ...valid, pool: "null-identity", underlyingTokens: null },
            valid,
          ],
        }),
    });
    expect(run.state).toBe("success");
    expect(run.observations).toHaveLength(1);
    expect(run.observations[0].baseApy).toBe("0");
    expect(run.observations[0].link.status).toBe("verified_exact");
    expect(run.counts).toMatchObject({ seen: 2, accepted: 1, quarantined: 1 });
  });
});
