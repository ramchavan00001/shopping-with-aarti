// Image resizing for the Node server. Sources are fetched once, resized to a
// WebP of the requested width and kept in memory and on disk, so each size is
// only ever made once per server start (the disk cache survives restarts on
// hosts with a persistent disk).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MEMORY_BYTES = 64 * 1024 * 1024;
const dir = path.join(os.tmpdir(), "aarti-img");

const memory = new Map<string, Buffer>();
let memoryBytes = 0;
const inFlight = new Map<string, Promise<Buffer | null>>();

function remember(key: string, buf: Buffer) {
  memory.set(key, buf);
  memoryBytes += buf.length;
  // Map keeps insertion order, so the first entries are the oldest.
  for (const [k, v] of memory) {
    if (memoryBytes <= MEMORY_BYTES) break;
    memory.delete(k);
    memoryBytes -= v.length;
  }
}

async function load(src: string): Promise<Buffer | null> {
  if (src.startsWith("/")) return readFile(path.join(process.cwd(), "dist", src)).catch(() => null);
  const res = await fetch(src, { signal: AbortSignal.timeout(10_000), headers: { Accept: "image/*" } });
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
  if (Number(res.headers.get("content-length")) > MAX_SOURCE_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > MAX_SOURCE_BYTES ? null : buf;
}

/** A WebP of `src` at most `width` pixels wide, or null if the source can't be loaded. */
export function resizeImage(src: string, width: number): Promise<Buffer | null> {
  const key = createHash("sha1").update(`${width}:${src}`).digest("hex");
  const hit = memory.get(key);
  if (hit) {
    // Move to the end so busy images stay cached.
    memory.delete(key);
    memory.set(key, hit);
    return Promise.resolve(hit);
  }
  let job = inFlight.get(key);
  if (!job) {
    const file = path.join(dir, `${key}.webp`);
    job = (async () => {
      const cached = await readFile(file).catch(() => null);
      if (cached) return cached;
      const source = await load(src);
      if (!source) return null;
      const out = await sharp(source, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 72, effort: 4 })
        .toBuffer();
      await mkdir(dir, { recursive: true }).then(() => writeFile(file, out)).catch(() => {});
      return out;
    })()
      .catch(() => null)
      .then((buf) => {
        inFlight.delete(key);
        if (buf) remember(key, buf);
        return buf;
      });
    inFlight.set(key, job);
  }
  return job;
}
