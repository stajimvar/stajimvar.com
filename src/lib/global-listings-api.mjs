export async function requestPublishedListingsCatalog(client, options = {}) {
  const { data, error } = await client.rpc('get_published_listings_catalog_v2', {
    p_country: options.country ?? 'all',
    p_cursor_posted_at: options.cursor?.value ?? null,
    p_cursor_id: options.cursor?.id ?? null,
    p_snapshot: options.snapshot ?? null,
  });
  if (error) throw new Error(error.message || 'İlan kataloğu yüklenemedi');
  if (!data || !Array.isArray(data.listings) || !Array.isArray(data.facets?.countries)
      || !Number.isInteger(data.total) || data.total < 0
      || typeof data.hasMore !== 'boolean' || typeof data.snapshot !== 'string') {
    throw new Error('Global ilan kataloğu geçersiz yanıt verdi');
  }
  if (data.hasMore && (!data.nextCursor || typeof data.nextCursor.value !== 'string' || typeof data.nextCursor.id !== 'string')) {
    throw new Error('Global ilan kataloğu geçersiz imleç verdi');
  }
  return data;
}
