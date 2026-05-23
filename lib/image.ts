function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Phone photos are several MB; base64 in a JSON body would exceed Vercel's
// 4.5 MB request limit. Downscale to Claude vision's max useful edge and
// re-encode as JPEG to keep uploads small. Browser-only (uses canvas).
export async function fileToDataUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = original;
    });

    const MAX_EDGE = 1568;
    let { width, height } = img;
    if (Math.max(width, height) > MAX_EDGE) {
      const scale = MAX_EDGE / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return original;
  }
}
