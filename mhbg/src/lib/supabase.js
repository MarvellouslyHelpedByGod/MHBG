import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key');

/** Public URL for a stored file. Full URLs are passed through unchanged. */
export function publicUrl(bucket, path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith('/')) return path; // full URL or a file shipped in /public
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Upload a file or blob and return its storage path. */
export async function uploadFile(bucket, fileOrBlob, ext) {
  const extension = ext || (fileOrBlob.name ? fileOrBlob.name.split('.').pop().toLowerCase() : 'bin');
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, fileOrBlob, {
    cacheControl: '31536000',
    upsert: false,
    contentType: fileOrBlob.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Fetch every row of a query, past Supabase's 1000-row page limit. */
export async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
