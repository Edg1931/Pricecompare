import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseDataUrl } from "@/lib/ai/client";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const BUCKET = process.env.SUPABASE_BUCKET || "item-photos";

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let _client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

/**
 * Persist base64 data-URL images and return public URLs.
 * Uses Supabase Storage in production; falls back to the local /public/uploads
 * folder for offline local development when Supabase isn't configured.
 */
export async function savePhotos(itemId: string, dataUrls: string[]): Promise<string[]> {
  if (supabaseConfigured()) {
    return saveToSupabase(itemId, dataUrls);
  }
  return saveToLocal(itemId, dataUrls);
}

async function saveToSupabase(itemId: string, dataUrls: string[]): Promise<string[]> {
  const client = supabase();
  const urls: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const { mediaType, data } = parseDataUrl(dataUrls[i]);
    const ext = EXT[mediaType] ?? "jpg";
    const objectPath = `${itemId}/${i}.${ext}`;
    const { error } = await client.storage
      .from(BUCKET)
      .upload(objectPath, Buffer.from(data, "base64"), {
        contentType: mediaType,
        upsert: true,
      });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data: pub } = client.storage.from(BUCKET).getPublicUrl(objectPath);
    urls.push(pub.publicUrl);
  }
  return urls;
}

async function saveToLocal(itemId: string, dataUrls: string[]): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "uploads", itemId);
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const { mediaType, data } = parseDataUrl(dataUrls[i]);
    const ext = EXT[mediaType] ?? "jpg";
    const filename = `${i}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(data, "base64"));
    urls.push(`/uploads/${itemId}/${filename}`);
  }
  return urls;
}
