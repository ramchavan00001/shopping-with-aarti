import type { Context } from "hono";
import { env } from "hono/adapter";
import { AwsClient } from "aws4fetch";

// Direct-to-R2 uploads from the admin panel: the server signs a short-lived
// PUT URL and the browser uploads the file straight to the bucket, so large
// videos never pass through (or get lost on) the web server's disk.

type UploadEnv = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  MEDIA_BASE_URL?: string;
};

export const allowedUploadTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function uploadsEnabled(c: Context) {
  const e = env<UploadEnv>(c);
  return !!(e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET && e.MEDIA_BASE_URL);
}

export async function signUpload(c: Context, fileName: string, contentType: string, folder: string) {
  const e = env<UploadEnv>(c);
  const ext = allowedUploadTypes[contentType];
  if (!ext) throw new Error("Only JPG, PNG, WebP, AVIF, MP4, WebM or MOV files");

  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  const safeFolder = folder.replace(/[^a-z0-9-]/g, "") || "uploads";
  const month = new Date().toISOString().slice(0, 7);
  const key = `${safeFolder}/${month}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto" });
  const url = new URL(`https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${e.R2_BUCKET}/${key}`);
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true },
  });

  return { uploadUrl: signed.url, publicUrl: `${e.MEDIA_BASE_URL!.replace(/\/$/, "")}/${key}`, contentType };
}
