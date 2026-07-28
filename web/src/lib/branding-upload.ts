import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "image";
}

/**
 * Upload branding image to Vercel Blob when configured; otherwise save under
 * public/uploads so local/demo branding works without a blob token.
 */
export async function uploadBrandingImage(
  cafeId: number,
  kind: "logo" | "bg",
  file: File
): Promise<{ url: string; storage: "blob" | "local" }> {
  if (!file || file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 4MB");
  if (!file.type.startsWith("image/")) throw new Error("File must be an image");

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}-${safeName(file.name)}`;
  const key = `branding/${cafeId}/${filename}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, buf, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || "application/octet-stream",
    });
    return { url: blob.url, storage: "blob" };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "branding", String(cafeId));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);
  return { url: `/uploads/branding/${cafeId}/${filename}`, storage: "local" };
}
