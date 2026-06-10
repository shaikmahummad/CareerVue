import { supabase } from "./supabase";

export async function uploadToStorage(
  uri: string,
  bucket: string,
  path: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(uri);
  const blob     = await response.blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
