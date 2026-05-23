import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { parseDataUrl } from "@/lib/ai/client";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Save base64 data-URL images to /public/uploads/<itemId> and return public URLs. */
export async function savePhotos(
  itemId: string,
  dataUrls: string[]
): Promise<string[]> {
  const dir = path.join(UPLOAD_ROOT, itemId);
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
