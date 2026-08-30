import { buildCatalog } from './data/catalog'; import type { CatalogResponse, Mode } from './domain/types';
export async function fetchCatalog(mode:Mode, signal?:AbortSignal):Promise<CatalogResponse> {
  if (import.meta.env.VITE_API_URL) { const r=await fetch(`${import.meta.env.VITE_API_URL}/v1/catalog?mode=${mode}`,{signal}); if(!r.ok) throw new Error(`Catalog request failed (${r.status})`); return r.json(); }
  await new Promise(r=>setTimeout(r,180)); return buildCatalog(mode);
}
