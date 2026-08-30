export function canonicalEvmAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid EVM address');
  return value.toLowerCase();
}
export function evmAssetId(chainId: number, address: string) { return `evm:eip155:${chainId}:${canonicalEvmAddress(address)}`; }
export function solanaAssetId(cluster: string, mint: string) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) throw new Error('Invalid Solana mint');
  return `solana:${cluster}:${mint}`;
}
export function opportunityId(protocolId: string, chainId: string, entityKind: string, canonicalId: string) {
  if (![protocolId, chainId, entityKind, canonicalId].every(Boolean)) throw new Error('Opportunity identity fields are required');
  return `${protocolId}:${chainId}:${entityKind}:${canonicalId.toLowerCase()}`;
}
