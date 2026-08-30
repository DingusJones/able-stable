import type { LinkResolution } from './types';
const domains: Record<string, string[]> = {
  aave: ['app.aave.com'], morpho: ['app.morpho.org'], compound: ['app.compound.finance'], moonwell: ['moonwell.fi'], seamless: ['app.seamlessprotocol.com'], kamino: ['app.kamino.finance'], solend: ['save.finance', 'solend.fi']
};
const exactPaths: Record<string, RegExp[]> = {
  morpho: [/^\/base\/market\/0x[0-9a-f]{64}\/?$/i, /^\/base\/vault\/0x[0-9a-f]{40}\/?$/i],
  aave: [/^\/markets\/?$/], compound: [/^\/markets\/?$/], seamless: [/^\/markets\/?$/]
};
export function resolveLink(protocolId: string, candidate?: string, exact = false, checkedAt = '2026-08-30T00:00:00.000Z'): LinkResolution {
  if (!candidate) return { status: 'unverified', label: 'Destination unavailable' };
  try {
    const url = new URL(candidate); const allowed = url.protocol === 'https:' && (domains[protocolId] ?? []).includes(url.hostname);
    if (!allowed || url.username || url.password) return { status: 'invalid', label: 'Destination rejected' };
    if (exact && !(exactPaths[protocolId]??[]).some(pattern=>pattern.test(url.pathname))) return { status: 'unverified', label: 'Exact destination unavailable' };
    return { status: exact ? 'verified_exact' : 'verified_protocol', label: exact ? 'Open opportunity' : 'Open protocol', url: url.toString(), checkedAt };
  } catch { return { status: 'invalid', label: 'Destination rejected' }; }
}
