/** Server-side filtering and keyset pagination; never preload the full catalog. */
export async function requestDiscoverCatalog(client, options = {}) {
  let request = client.rpc('get_discover_catalog', {
    p_query: options.query?.trim() || null,
    p_city: options.city || null,
    p_category: options.category || null,
    p_period: options.period || 'all',
    p_free: Boolean(options.free),
    p_discount: Boolean(options.discount),
    p_sort: options.sort || 'newest',
    p_cursor_value: options.cursor?.value || null,
    p_cursor_id: options.cursor?.id || null,
    p_snapshot: options.snapshot || null,
  });
  if (options.signal) request = request.abortSignal(options.signal);
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  if (!data || !Array.isArray(data.events) || !count(data.total)
      || typeof data.hasMore !== 'boolean' || !Number.isFinite(Date.parse(data.snapshot))
      || !data.facets || !Array.isArray(data.facets.cities)
      || !data.facets.cities.every((city) => typeof city === 'string')
      || !data.facets.categories || !Object.values(data.facets.categories).every(count)
      || !count(data.facets.free) || !count(data.facets.discount)
      || (data.hasMore && (!data.events.length || !data.nextCursor?.id || !Number.isFinite(Date.parse(data.nextCursor?.value))))) {
    throw new Error('Etkinlik kataloğu yanıtı doğrulanamadı. Lütfen yeniden deneyin.');
  }
  return data;
}
