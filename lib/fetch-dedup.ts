/**
 * In-flight request deduplication for client-side GET fetches.
 * Pokud více komponent zavolá fetchDedup se stejnou URL ve stejném render cyklu,
 * sdílí jeden síťový požadavek. Každý volající dostane svůj klon Response.
 */
const inflight = new Map<string, Promise<Response>>();

export function fetchDedup(url: string): Promise<Response> {
  let p = inflight.get(url);
  if (!p) {
    p = fetch(url);
    inflight.set(url, p);
    p.finally(() => inflight.delete(url));
  }
  return p.then((r) => r.clone());
}
