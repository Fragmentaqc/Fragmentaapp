import { supabase } from '@/lib/supabase';

type StoredImage = {
  image_url: string;
  storage_path?: string | null;
};

const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

export async function resolvePrivateImageUrls<T extends StoredImage>(
  bucket: string,
  rows: T[]
): Promise<T[]> {
  const paths = [...new Set(
    rows
      .map((row) => row.storage_path)
      .filter((path): path is string => Boolean(path))
  )];

  if (paths.length === 0) return rows;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_LIFETIME_SECONDS);

  if (error) {
    console.error(`Impossible de signer les images du bucket ${bucket} :`, error.message);
    return rows;
  }

  const signedUrls = new Map(
    (data ?? [])
      .filter((item) => Boolean(item.signedUrl))
      .map((item) => [item.path, item.signedUrl])
  );

  return rows.map((row) => ({
    ...row,
    image_url: row.storage_path
      ? signedUrls.get(row.storage_path) ?? row.image_url
      : row.image_url,
  }));
}
