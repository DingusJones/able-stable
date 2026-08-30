import type { Asset, Chain } from '../domain/types';
import { evmAssetId, solanaAssetId } from '../domain/identity';

export const chains: Chain[] = [
  { id: 'eip155:1', family: 'evm', name: 'Ethereum', slug: 'ethereum', explorerBaseUrl: 'https://etherscan.io', status: 'approved' },
  { id: 'eip155:8453', family: 'evm', name: 'Base', slug: 'base', explorerBaseUrl: 'https://basescan.org', status: 'approved' },
  { id: 'eip155:42161', family: 'evm', name: 'Arbitrum', slug: 'arbitrum', explorerBaseUrl: 'https://arbiscan.io', status: 'eligible' },
  { id: 'eip155:10', family: 'evm', name: 'Optimism', slug: 'optimism', explorerBaseUrl: 'https://optimistic.etherscan.io', status: 'eligible' },
  { id: 'eip155:137', family: 'evm', name: 'Polygon', slug: 'polygon', explorerBaseUrl: 'https://polygonscan.com', status: 'eligible' },
  { id: 'eip155:43114', family: 'evm', name: 'Avalanche', slug: 'avalanche', explorerBaseUrl: 'https://snowtrace.io', status: 'eligible' },
  { id: 'eip155:56', family: 'evm', name: 'BNB Chain', slug: 'bsc', explorerBaseUrl: 'https://bscscan.com', status: 'eligible' },
  { id: 'solana:mainnet-beta', family: 'solana', name: 'Solana', slug: 'solana', explorerBaseUrl: 'https://explorer.solana.com', status: 'approved' }
];

const verifiedAt = '2026-08-30T00:00:00.000Z';
const circleEvidence = 'https://developers.circle.com/stablecoins/usdc-contract-addresses';
export const assets: Asset[] = [
  { id: evmAssetId(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), familyId: 'usdc', symbol: 'USDC', name: 'USD Coin', chainId: 'eip155:1', addressOrMint: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, form: 'native', nativeStatus: 'canonical', verifiedAt, evidenceUrl: circleEvidence },
  { id: evmAssetId(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'), familyId: 'usdc', symbol: 'USDC', name: 'USD Coin', chainId: 'eip155:8453', addressOrMint: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6, form: 'native', nativeStatus: 'canonical', verifiedAt, evidenceUrl: circleEvidence },
  { id: solanaAssetId('mainnet-beta', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), familyId: 'usdc', symbol: 'USDC', name: 'USD Coin', chainId: 'solana:mainnet-beta', addressOrMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, form: 'native', nativeStatus: 'canonical', verifiedAt, evidenceUrl: circleEvidence }
];
export const chainById = Object.fromEntries(chains.map(c => [c.id, c]));
export const assetById = Object.fromEntries(assets.map(a => [a.id, a]));

export const coverage = [
  { protocol: 'Aave', scope: 'Core · EVM', state: 'Fixture-ready; live query unavailable', source: 'Official API/direct RPC intended' },
  { protocol: 'Morpho Blue', scope: 'Core · EVM', state: 'Fixture-ready; live query unavailable', source: 'Official GraphQL intended' },
  { protocol: 'Compound III', scope: 'Core · EVM', state: 'Fixture-ready; live RPC unavailable', source: 'Direct Comet reads intended' },
  { protocol: 'Moonwell', scope: 'Core · Base', state: 'Fixture-ready; live endpoint opt-in', source: 'Official API intended' },
  { protocol: 'Kamino', scope: 'Core · Solana', state: 'Fixture-ready; API shape unverified', source: 'Official API/RPC intended' },
  { protocol: 'Save / Solend', scope: 'Core · Solana', state: 'Fixture-ready; API shape unverified', source: 'Official API/RPC intended' },
  { protocol: 'Pendle / vaults / pools', scope: 'Degen', state: 'Deferred pending risk + exact-link review', source: 'No public rows' },
  { protocol: 'CeFi providers', scope: 'CeFi', state: 'Unavailable: no reproducible universal rate', source: 'Official terms only' }
];
