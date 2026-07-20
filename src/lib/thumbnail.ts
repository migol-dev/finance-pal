import { Area } from "react-easy-crop";

export async function getCroppedThumbnail(
  src: string,
  area: Area,
  size = 192,
  maxBytes = 60 * 1024,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("No se pudo cargar la imagen"));
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const approxBytes = (dataUrl: string) => Math.ceil((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

  const webpQualities = [0.72, 0.6, 0.5, 0.4];
  for (const q of webpQualities) {
    try {
      const out = canvas.toDataURL("image/webp", q);
      if (out.startsWith("data:image/webp") && approxBytes(out) <= maxBytes) return out;
    } catch { /* continue */ }
  }

  for (const q of [0.78, 0.65, 0.5, 0.4]) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (approxBytes(out) <= maxBytes) return out;
  }

  return canvas.toDataURL("image/jpeg", 0.35);
}
