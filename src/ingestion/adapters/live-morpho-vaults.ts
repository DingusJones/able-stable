import { z } from "zod";
import type { AdapterRunResult, Opportunity, RiskDimension, VaultVersion } from "../../domain/types";
import { BASE_USDC, decimal, liveOpportunity, ok, providerError, request, type LiveContext } from "../live";

export const MORPHO_VAULTS_ENDPOINT = "https://api.morpho.org/graphql";
export const MORPHO_V1_VAULTS_QUERY = `query BaseUsdcVaultsV1 { vaults(first: 100, orderBy: TotalAssetsUsd, orderDirection: Desc, where: { chainId_in: [8453], assetAddress_in: ["${BASE_USDC}"], listed: true }) { items { address name listed asset { address symbol decimals chain { id } } state { netApy totalAssetsUsd } liquidity { usd } } } }`;
export const MORPHO_V2_VAULTS_QUERY = `query BaseUsdcVaultsV2 { vaultV2s(first: 100, orderBy: TotalAssetsUsd, orderDirection: Desc, where: { chainId_in: [8453], assetAddress_in: ["${BASE_USDC}"], listed: true }) { items { address name listed asset { address symbol decimals chain { id } } chain { id } avgNetApy avgNetApyExcludingRewards totalAssetsUsd liquidityUsd } } }`;
export const MORPHO_VAULTS_QUERY = MORPHO_V1_VAULTS_QUERY;

const responseSchema = (field: "vaults" | "vaultV2s") =>
  z.object({ data: z.object({ [field]: z.object({ items: z.array(z.unknown()) }) }) });
const identitySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  name: z.string().min(1),
  listed: z.literal(true),
  asset: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    symbol: z.string(),
    decimals: z.number().int(),
    chain: z.object({ id: z.number().int() }),
  }),
});
const v1VaultSchema = identitySchema.extend({
  state: z.object({ netApy: z.unknown().optional().nullable(), totalAssetsUsd: z.unknown().optional().nullable() }).nullable(),
  liquidity: z.object({ usd: z.unknown().optional().nullable() }).optional().nullable(),
});
const v2VaultSchema = identitySchema.extend({
  chain: z.object({ id: z.number().int() }),
  avgNetApy: z.unknown().optional().nullable(),
  avgNetApyExcludingRewards: z.unknown().optional().nullable(),
  totalAssetsUsd: z.unknown().optional().nullable(),
  liquidityUsd: z.unknown().optional().nullable(),
});
const vaultRisks: RiskDimension[] = [
  { key: "contract", level: 1, label: "Smart contract", detail: "Vault and allocated-market contract risk remains." },
  { key: "admin", level: 2, label: "Curated strategy", detail: "A curator selects allocations and strategy parameters." },
  { key: "liquidity", level: 1, label: "Withdrawal liquidity", detail: "Vault liquidity is a snapshot, not a withdrawal guarantee." },
  { key: "stablecoin", level: 1, label: "Stablecoin", detail: "Native USDC issuer and depeg risk remains." },
];
function optionalDecimal(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const parsed = decimal.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
function vaultAddress(o: Opportunity) {
  return o.link.url?.match(/\/vault\/(0x[0-9a-f]{40})\/?$/i)?.[1].toLowerCase();
}
export function mergeMorphoVaultObservations(groups: Opportunity[][]) {
  const seen = new Set<string>();
  return groups.flat().filter((o) => {
    const address = vaultAddress(o);
    if (!address || seen.has(address)) return false;
    seen.add(address);
    return true;
  });
}
async function fetchVersion(ctx: LiveContext, version: VaultVersion): Promise<AdapterRunResult> {
  const isV1 = version === "v1";
  const adapterId = `morpho-vaults-${version}-base`;
  const sourceId = `morpho-vaults-${version}-graphql`;
  const field = isV1 ? "vaults" : "vaultV2s";
  try {
    const got = await request(ctx, MORPHO_VAULTS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: isV1 ? MORPHO_V1_VAULTS_QUERY : MORPHO_V2_VAULTS_QUERY }),
    });
    const payload = responseSchema(field).parse(got.json);
    const items = payload.data[field].items;
    const observations: Opportunity[] = [];
    let quarantined = 0, rejected = 0;
    for (const raw of items) {
      const parsed = (isV1 ? v1VaultSchema : v2VaultSchema).safeParse(raw);
      if (!parsed.success) { quarantined++; continue; }
      const x = parsed.data;
      if (x.asset.chain.id !== 8453 || x.asset.address.toLowerCase() !== BASE_USDC || (!isV1 && "chain" in x && x.chain.id !== 8453)) {
        rejected++;
        continue;
      }
      const apy = isV1
        ? optionalDecimal("state" in x ? x.state?.netApy : undefined)
        : optionalDecimal("avgNetApy" in x ? x.avgNetApy : undefined) ?? optionalDecimal("avgNetApyExcludingRewards" in x ? x.avgNetApyExcludingRewards : undefined);
      if (apy === undefined) { quarantined++; continue; }
      const address = x.address.toLowerCase();
      observations.push(liveOpportunity({
        protocolId: "morpho", protocolName: "Morpho Vault", sourceId,
        sourceName: `Morpho GraphQL · Vaults ${version.toUpperCase()}`,
        sourceUrl: MORPHO_VAULTS_ENDPOINT, marketKey: `${version}:${address}:lending_asset`, name: x.name,
        category: "vault", productType: "vault", vaultVersion: version, usdcRole: "lending_asset",
        displayRateLabel: "Lending APY",
        positionDescription: `Deposit USDC into a curated Morpho Vault ${version.toUpperCase()} lending strategy.`,
        baseApy: apy,
        tvlUsd: optionalDecimal(isV1 && "state" in x ? x.state?.totalAssetsUsd : "totalAssetsUsd" in x ? x.totalAssetsUsd : undefined),
        liquidityUsd: optionalDecimal(isV1 && "liquidity" in x ? x.liquidity?.usd : "liquidityUsd" in x ? x.liquidityUsd : undefined),
        risks: vaultRisks, rawHash: got.hash, at: ctx.at,
        link: `https://app.morpho.org/base/vault/${address}`, confidence: "high",
      }));
    }
    const warnings = quarantined ? [`${quarantined} Morpho Vault ${version.toUpperCase()} row(s) quarantined because required identity or net lending APY was missing or invalid.`] : [];
    const result = ok(adapterId, sourceId, ctx.at, observations, got.hash, warnings);
    return { ...result, counts: { seen: items.length, accepted: observations.length, quarantined, rejected } };
  } catch (e) {
    const m = e instanceof Error ? e.message : "Unknown provider error";
    return providerError(adapterId, sourceId, ctx.at, m === "Malformed JSON" ? "malformed_json" : m.startsWith("HTTP") ? "http" : "schema_drift", m);
  }
}
export const fetchMorphoVaultsV1 = (ctx: LiveContext) => fetchVersion(ctx, "v1");
export const fetchMorphoVaultsV2 = (ctx: LiveContext) => fetchVersion(ctx, "v2");

export async function fetchMorphoVaults(ctx: LiveContext): Promise<AdapterRunResult> {
  const runs = await Promise.all([fetchMorphoVaultsV1(ctx), fetchMorphoVaultsV2(ctx)]);
  const observations = mergeMorphoVaultObservations(runs.map((run) => run.observations));
  const hasFailure = runs.some((run) => run.state !== "success");
  const hasProviderError = runs.some((run) => run.state === "error");
  return {
    adapterId: "morpho-vaults-base", sourceId: "morpho-vaults-graphql",
    runId: `morpho-vaults-base-${ctx.at}`,
    state: observations.length ? (hasFailure ? "partial" : "success") : hasProviderError ? "error" : "empty",
    retrievedAt: ctx.at, observations,
    warnings: runs.flatMap((run) => run.warnings), errors: runs.flatMap((run) => run.errors),
    counts: {
      seen: runs.reduce((sum, run) => sum + run.counts.seen, 0), accepted: observations.length,
      quarantined: runs.reduce((sum, run) => sum + run.counts.quarantined, 0),
      rejected: runs.reduce((sum, run) => sum + run.counts.rejected, 0),
    },
  };
}
