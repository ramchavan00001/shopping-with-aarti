import { eq, inArray, isNotNull } from "drizzle-orm";
import type { InstagramMedia, InstagramStatus } from "../../shared/admin";
import { slugify } from "../../shared/admin";
import type { AdminStore } from "../data/admin";
import { AdminError } from "../data/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";
import { putR2Object, r2FromProcessEnv } from "../uploads";
import type { Jobs } from "./jobs";

// Instagram auto-sync (Instagram API with Instagram Login). Aarti pastes a
// long-lived access token from her Meta developer app; new reels are then
// imported as hidden drafts (video and cover copied to R2, because
// Instagram's media links expire). Tokens last 60 days and are refreshed
// automatically every week while the site runs.

export const IG_JOB = "instagram-sync";
const SETTINGS_KEY = "instagram";
const graph = () => (process.env.IG_GRAPH_BASE ?? "https://graph.instagram.com").replace(/\/$/, "");
const FIELDS = "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp";

interface IgConfig {
  accessToken?: string;
  userId?: string;
  username?: string;
  tokenRefreshedAt?: string;
  autoImport?: boolean;
  /** Reels posted before this aren't auto-imported (set on first sync). */
  syncFrom?: string;
  lastSyncAt?: string;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

async function igGet<T>(path: string, token: string): Promise<T> {
  const url = `${graph()}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) {
    // Code 190 (or "Failed to decode") means the token is wrong, expired or revoked.
    const badToken = json.error?.code === 190 || /decode|access token/i.test(json.error?.message ?? "");
    const reason = badToken ? "the access token isn't valid any more. Create a new one and paste it again" : (json.error?.message ?? `request failed (${res.status})`);
    throw new AdminError(`Instagram: ${reason}`, 400);
  }
  return json;
}

const isVideo = (m: IgMedia) => m.media_type === "VIDEO" || m.media_product_type === "REELS";

/** First line of the caption without hashtags, as a reel title. */
function titleFrom(caption: string) {
  const line = caption.split("\n").map((l) => l.replace(/#[\p{L}\p{N}_]+/gu, "").trim()).find(Boolean) ?? "";
  const clean = line.replace(/\s+/g, " ").trim();
  return (clean.length > 80 ? `${clean.slice(0, 77).replace(/\s+\S*$/, "")}…` : clean) || "New reel";
}

export function createInstagram(db: Db, admin: AdminStore, jobs: Jobs) {
  async function config(): Promise<IgConfig> {
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, SETTINGS_KEY));
    return (row?.value as IgConfig | undefined) ?? {};
  }
  async function saveConfig(patch: Partial<IgConfig>) {
    const value = { ...(await config()), ...patch };
    await db
      .insert(schema.settings)
      .values({ key: SETTINGS_KEY, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
    return value;
  }

  /** Exchange the token for a fresh 60-day one if it's more than a week old. */
  async function token(): Promise<string> {
    const cfg = await config();
    if (!cfg.accessToken) throw new AdminError("Instagram isn't connected yet", 400);
    const age = Date.now() - Date.parse(cfg.tokenRefreshedAt ?? "1970-01-01");
    if (age > 7 * 86_400_000) {
      try {
        const r = await igGet<{ access_token: string }>("/refresh_access_token?grant_type=ig_refresh_token", cfg.accessToken);
        await saveConfig({ accessToken: r.access_token, tokenRefreshedAt: new Date().toISOString() });
        return r.access_token;
      } catch (err) {
        console.error(JSON.stringify({ event: "ig_token_refresh_failed", error: String(err) }));
      }
    }
    return cfg.accessToken;
  }

  async function recent(limit = 25): Promise<IgMedia[]> {
    const r = await igGet<{ data: IgMedia[] }>(`/me/media?fields=${FIELDS}&limit=${limit}`, await token());
    return (r.data ?? []).filter(isVideo);
  }

  async function importedIds(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const rows = await db
      .select({ id: schema.reels.instagramMediaId, code: schema.reels.code })
      .from(schema.reels)
      .where(inArray(schema.reels.instagramMediaId, ids));
    return new Map(rows.map((r) => [r.id!, r.code]));
  }

  async function download(url: string) {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Couldn't download from Instagram (${res.status})`);
    return { body: await res.arrayBuffer(), type: (res.headers.get("content-type") ?? "").split(";")[0] };
  }

  /** Copy one Instagram reel into the site as a hidden draft. Returns its code. */
  async function importOne(mediaId: string): Promise<string> {
    const existing = await importedIds([mediaId]);
    if (existing.has(mediaId)) return existing.get(mediaId)!;
    const r2 = r2FromProcessEnv();
    if (!r2) throw new AdminError("Set up Cloudflare R2 uploads first: imported videos are stored there.", 400);

    const m = await igGet<IgMedia>(`/${mediaId}?fields=${FIELDS}`, await token());
    if (!isVideo(m) || !m.media_url) throw new AdminError("That post isn't a reel/video", 400);
    const caption = (m.caption ?? "").trim();
    const title = titleFrom(caption);

    const video = await download(m.media_url);
    const videoPath = await putR2Object(r2, "reels", title, video.body, video.type.startsWith("video/") ? video.type : "video/mp4");
    let posterPath = videoPath;
    if (m.thumbnail_url) {
      const thumb = await download(m.thumbnail_url);
      posterPath = await putR2Object(r2, "posters", `${title}-cover`, thumb.body, thumb.type.startsWith("image/") ? thumb.type : "image/jpeg");
    }

    const categories = await admin.listCategories();
    const code = await admin.nextReelCode();
    const tags = [...new Set((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1).toLowerCase().slice(0, 40)))].slice(0, 10);
    const day = new Date(m.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    await admin.saveReel({
      code,
      slug: slugify(title) || code.toLowerCase(),
      title: title.slice(0, 160),
      caption: caption.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/[ \t]+\n/g, "\n").trim().slice(0, 1000),
      video: videoPath,
      poster: posterPath,
      instagramUrl: m.permalink,
      category: categories[0]?.slug ?? "",
      tags,
      publishedAt: day,
      isFeatured: false,
      isPublished: false, // draft: Aarti adds products, then publishes
      views: 0,
      products: [],
    });
    await db.update(schema.reels).set({ instagramMediaId: m.id }).where(eq(schema.reels.code, code));
    return code;
  }

  async function sync(): Promise<string> {
    const cfg = await config();
    if (!cfg.accessToken) return "Not connected";
    const now = new Date().toISOString();
    if (!cfg.syncFrom) {
      // First run: start from now so years of old reels aren't imported.
      await saveConfig({ syncFrom: now, lastSyncAt: now });
      return "Starting point set; reels posted from now on will be imported automatically";
    }
    const media = (await recent(25)).filter((m) => Date.parse(m.timestamp) >= Date.parse(cfg.syncFrom!));
    const done = await importedIds(media.map((m) => m.id));
    const imported: string[] = [];
    for (const m of media.filter((x) => !done.has(x.id)).reverse()) imported.push(await importOne(m.id));
    await saveConfig({ lastSyncAt: now });
    return imported.length ? `Imported ${imported.length} new reel(s) as drafts: ${imported.map((c) => `#${c}`).join(", ")}` : "No new reels";
  }

  jobs.define({
    name: IG_JOB,
    everyMs: 6 * 3_600_000,
    enabled: async () => {
      const c = await config();
      return !!c.accessToken && c.autoImport !== false;
    },
    run: sync,
  });

  return {
    async status(): Promise<InstagramStatus> {
      const c = await config();
      return {
        connected: !!c.accessToken,
        username: c.username ?? null,
        tokenRefreshedAt: c.tokenRefreshedAt ?? null,
        autoImport: c.autoImport !== false,
        lastSyncAt: c.lastSyncAt ?? null,
        job: await jobs.state(IG_JOB),
      };
    },
    async connect(accessToken: string) {
      const me = await igGet<{ user_id?: string; id?: string; username?: string }>("/me?fields=user_id,username", accessToken.trim());
      await saveConfig({
        accessToken: accessToken.trim(),
        userId: me.user_id ?? me.id,
        username: me.username,
        tokenRefreshedAt: new Date().toISOString(),
        autoImport: true,
      });
      jobs.start(IG_JOB); // sets the starting point straight away
    },
    async disconnect() {
      await db.delete(schema.settings).where(eq(schema.settings.key, SETTINGS_KEY));
    },
    async setAutoImport(on: boolean) {
      await saveConfig({ autoImport: on });
    },
    async media(): Promise<InstagramMedia[]> {
      const list = await recent(25);
      const done = await importedIds(list.map((m) => m.id));
      return list.map((m) => ({
        id: m.id,
        caption: m.caption ?? "",
        mediaType: m.media_product_type ?? m.media_type,
        permalink: m.permalink,
        thumbnailUrl: m.thumbnail_url ?? null,
        timestamp: m.timestamp,
        importedAs: done.get(m.id) ?? null,
      }));
    },
    importOne,
    /** Reel codes that came from Instagram (for "from Instagram" badges). */
    async importedCodes() {
      const rows = await db.select({ code: schema.reels.code }).from(schema.reels).where(isNotNull(schema.reels.instagramMediaId));
      return rows.map((r) => r.code);
    },
  };
}

export type Instagram = ReturnType<typeof createInstagram>;
