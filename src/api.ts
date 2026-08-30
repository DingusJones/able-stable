import { buildCatalog } from './data/catalog'; import type { CatalogResponse, Mode } from './domain/types';
export async function fetchCatalog(mode:Mode, signal?:AbortSignal):Promise<CatalogResponse> {
  if (import.meta.env.VITE_API_URL) { const base=import.meta.env.VITE_API_URL.replace(/\/$/,''); const r=await fetch(`${base}/v1/catalog?mode=${mode}&chain=base&asset=usdc`,{signal}); const body=await r.json() as CatalogResponse; if(!r.ok&&r.status!==206&&r.status!==503) throw new Error(`Catalog request failed (${r.status})`); return body; }
  await new Promise(r=>setTimeout(r,180)); return buildCatalog(mode);
}
