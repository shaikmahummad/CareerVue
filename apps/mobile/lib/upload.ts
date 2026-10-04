import { supabase } from "./supabase";

export async function uploadToStorage(
  uri: string,
  bucket: string,
  path: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read the selected file.");
  // Supabase's React Native client expects binary data rather than a web Blob.
  const bytes = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: mimeType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
