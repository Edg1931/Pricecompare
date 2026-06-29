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
 * Delete photos for an item from Supabase Storage (or local uploads).
 * Called before the Prisma Item row is deleted to avoid orphaned files.
 * Errors are swallowed — a storage cleanup failure should never block a delete.
 */
export async function deletePhotos(photoUrls: string[]): Promise<void> {
  if (photoUrls.length === 0) return;
  if (supabaseConfigured()) {
    const client = supabase();
    const paths = photoUrls
      .map((url) => {
        // Extract the path after the bucket name, e.g. "item-photos/abc/0.jpg" → "abc/0.jpg"
        const marker = `/${BUCKET}/`;
        const idx = url.indexOf(marker);
        return idx !== -1 ? url.slice(idx + marker.length) : null;
      })
      .filter((p): p is string => p !== null);
    if (paths.length > 0) {
      await client.storage.from(BUCKET).remove(paths).catch((err) => {
        console.error("Supabase storage cleanup failed:", err);
      });
    }
  } else {
    // Local mode: delete from /public/uploads/<itemId>/
    const { unlink } = await import("fs/promises");
    await Promise.allSettled(
      photoUrls.map((url) => {
        const localPath = url.startsWith("/") ? url.slice(1) : url;
        return unlink(path.join(process.cwd(), "public", localPath)).catch(() => null);
      })
    );
  }
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
