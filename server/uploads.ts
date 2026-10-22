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
  /** Only for buckets created in a jurisdiction: "eu" or "fedramp". */
  R2_JURISDICTION?: string;
  /** Optional S3-compatible endpoint override (other providers, local testing). */
  R2_ENDPOINT?: string;
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

/** Object URL in the bucket (path-style). */
function objectUrl(e: UploadEnv, key: string) {
  if (e.R2_ENDPOINT) return `${e.R2_ENDPOINT.replace(/\/$/, "")}/${e.R2_BUCKET!.trim()}/${key}`;
  const jurisdiction = e.R2_JURISDICTION ? `.${e.R2_JURISDICTION.toLowerCase().replace(/[^a-z]/g, "")}` : "";
  return `https://${e.R2_ACCOUNT_ID!.trim()}${jurisdiction}.r2.cloudflarestorage.com/${e.R2_BUCKET!.trim()}/${key}`;
}

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

  const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID!.trim(), secretAccessKey: e.R2_SECRET_ACCESS_KEY!.trim(), service: "s3", region: "auto" });
  const url = new URL(objectUrl(e, key));
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true },
  });

  // `path` is what gets saved: it's resolved against MEDIA_BASE_URL when shown,
  // so moving to a different media domain later is a one-setting change.
  return { uploadUrl: signed.url, path: key, publicUrl: `${e.MEDIA_BASE_URL!.replace(/\/$/, "")}/${key}`, contentType };
}

/** R2 settings from the environment (Node jobs, which have no request context). */
export function r2FromProcessEnv(): UploadEnv | null {
  const e = process.env as UploadEnv;
  return e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET && e.MEDIA_BASE_URL ? e : null;
}

/** Upload bytes to R2 from the server (used by Instagram import). Returns the stored path. */
export async function putR2Object(e: UploadEnv, folder: string, baseName: string, body: ArrayBuffer, contentType: string) {
  const ext = allowedUploadTypes[contentType] ?? (contentType.startsWith("video/") ? "mp4" : "jpg");
  const base = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID!.trim(), secretAccessKey: e.R2_SECRET_ACCESS_KEY!.trim(), service: "s3", region: "auto" });
  const res = await client.fetch(objectUrl(e, key), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);
  return key;
}
