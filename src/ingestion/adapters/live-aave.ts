import { z } from 'zod';
import type { AdapterRunResult } from '../../domain/types';
import { BASE_USDC, decimal, liveOpportunity, ok, providerError, request, type LiveContext } from '../live';

const reserve = z.object({
  underlyingToken: z.object({ address: z.string(), symbol: z.string(), chainId: z.number() }),
  size: z.object({ usd: decimal, amount: z.object({ value: decimal }) }),
  supplyInfo: z.object({ apy: z.object({ value: decimal }), total: z.object({ value: decimal }) })
});
const responseSchema = z.object({
  data: z.object({
    markets: z.array(z.object({
      name: z.string(),
      chain: z.object({ chainId: z.number() }),
      reserves: z.array(reserve),
      totalMarketSize: decimal,
      totalAvailableLiquidity: decimal
    }))
  })
});

export const AAVE_GRAPHQL_ENDPOINT = 'https://api.v3.aave.com/graphql';
export const AAVE_BASE_MARKETS_QUERY = 'query { markets(request: { chainIds: [8453] }) { name chain { chainId } reserves { underlyingToken { address symbol chainId } size { usd amount { value } } supplyInfo { apy { value } total { value } } } totalMarketSize totalAvailableLiquidity } }';

export async function fetchAave(ctx: LiveContext): Promise<AdapterRunResult> {
  const adapterId = 'aave-v3-base', sourceId = 'aave-graphql';
  try {
    const got = await request(ctx, AAVE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: AAVE_BASE_MARKETS_QUERY })
    });
    const parsed = responseSchema.parse(got.json);
    const market = parsed.data.markets.find(item => item.name === 'AaveV3Base' && item.chain.chainId === 8453);
    const item = market?.reserves.find(candidate => candidate.underlyingToken.chainId === 8453 && candidate.underlyingToken.address.toLowerCase() === BASE_USDC);
    const observations = market && item ? [liveOpportunity({
          protocolId: 'aave',
          protocolName: 'Aave V3',
          sourceId,
          sourceName: 'Aave official GraphQL API',
          sourceUrl: AAVE_GRAPHQL_ENDPOINT,
          marketKey: BASE_USDC,
          name: 'Aave V3 Base native USDC market',
          baseApy: item.supplyInfo.apy.value,
          tvlUsd: item.size.usd,
          liquidityUsd: market.totalAvailableLiquidity,
          rawHash: got.hash,
          at: ctx.at,
          link: 'https://app.aave.com/',
          confidence: 'high'
        })] : [];
    return ok(adapterId, sourceId, ctx.at, observations, got.hash, [
      'The official API exposes totalAvailableLiquidity at market scope; no asset reward yield is inferred.',
      'The official app root is intentionally marked unverified because an exact native-USDC route was not proven.'
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return providerError(adapterId, sourceId, ctx.at, message === 'Malformed JSON' ? 'malformed_json' : message.startsWith('HTTP') ? 'http' : 'schema_drift', message);
  }
}
