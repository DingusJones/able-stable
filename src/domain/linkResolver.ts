import type { LinkResolution } from './types';
const domains: Record<string, string[]> = {
  aave: ['app.aave.com'], morpho: ['app.morpho.org'], compound: ['app.compound.finance'], moonwell: ['moonwell.fi'], kamino: ['app.kamino.finance'], solend: ['save.finance', 'solend.fi']
};
export function resolveLink(protocolId: string, candidate?: string, exact = false, checkedAt = '2026-08-30T00:00:00.000Z'): LinkResolution {
  if (!candidate) return { status: 'unverified', label: 'Destination unavailable' };
  try {
    const url = new URL(candidate); const allowed = url.protocol === 'https:' && (domains[protocolId] ?? []).includes(url.hostname);
    if (!allowed || url.username || url.password) return { status: 'invalid', label: 'Destination rejected' };
    return { status: exact ? 'verified_exact' : 'verified_protocol', label: exact ? 'Open opportunity' : 'Open protocol', url: url.toString(), checkedAt };
  } catch { return { status: 'invalid', label: 'Destination rejected' }; }
}
