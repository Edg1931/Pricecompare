function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

/** Approximate decoded byte size of a data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const len = comma === -1 ? dataUrl.length : dataUrl.length - comma - 1;
  return Math.ceil(len * 0.75);
}

// Keep each upload comfortably under Vercel's ~4.5 MB request-body limit —
// even when the Scan flow sends several photos in one request.
const TARGET_BYTES = 1_200_000;

/**
 * Decode a photo (using createImageBitmap, which handles more formats and is
 * faster than <img>, with an <img> fallback), downscale it, and re-encode as
 * JPEG — progressively lowering quality/size until it fits the byte budget.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  let width = 0;
  let height = 0;

  try {
    const bmp = await createImageBitmap(file);
    source = bmp;
    width = bmp.width;
    height = bmp.height;
  } catch {
    try {
      const img = await loadImage(await readAsDataUrl(file));
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } catch {
      // Can't decode (e.g. an unsupported format) — send the raw file and let
      // the server-side size guard / friendly error handle it.
      return readAsDataUrl(file);
    }
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const render = (maxEdge: number, quality: number): string => {
    let w = width;
    let h = height;
    if (Math.max(w, h) > maxEdge) {
      const scale = maxEdge / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    ctx!.drawImage(source as CanvasImageSource, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  };

  if (!ctx) return readAsDataUrl(file);

  let edge = 1568;
  let quality = 0.82;
  let out = render(edge, quality);
  while (dataUrlBytes(out) > TARGET_BYTES && (quality > 0.5 || edge > 800)) {
    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.12);
    } else {
      edge = Math.round(edge * 0.8);
      quality = 0.7;
    }
    out = render(edge, quality);
  }

  if (source && "close" in source) source.close();
  return out;
}
