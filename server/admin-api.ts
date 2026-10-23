import { Hono, type Context } from "hono";
import { env } from "hono/adapter";
import type { z } from "zod";
import {
  categoryInput,
  enquiryStatuses,
  fieldErrors,
  pushMessageInput,
  lootDealInput,
  reelInput,
  saleEventInput,
  settingsInput,
  type AdminConfig,
} from "../shared/admin";
import { AdminError, type AdminStore } from "./data/admin";
import type { SourceResolver } from "./app";
import { adminConfigured, endSession, hasSession, loginRateLimited, passwordMatches, requireAdmin, sameOriginWrites, startSession } from "./auth";
import { signUpload, uploadsEnabled } from "./uploads";
import { sendAlert } from "./ops/alerts";
import { LINK_JOB } from "./ops/links";
import { IG_JOB } from "./ops/instagram";

export function createAdminApi(getSource: SourceResolver) {
  const api = new Hono();

  api.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Robots-Tag", "noindex");
    await next();
  });
  api.use("*", sameOriginWrites);

  api.onError((err, c) => {
    if (err instanceof AdminError) return c.json({ error: err.message, field: err.field }, err.status);
    console.error(JSON.stringify({ event: "admin_request_failed", path: c.req.path, error: String(err), stack: err.stack }));
    void getSource(c).ops?.errors.record("server", err.message || String(err), err.stack, c.req.path);
    return c.json({ error: "Something went wrong. Please try again." }, 500);
  });

  /* ------------------------------------------------------------ session -- */

  api.get("/session", async (c) =>
    c.json({
      loggedIn: await hasSession(c),
      configured: adminConfigured(c),
      database: getSource(c).kind === "database",
    }),
  );

  api.post("/login", async (c) => {
    if (!adminConfigured(c)) return c.json({ error: "Set ADMIN_PASSWORD on the server to enable the admin panel." }, 503);
    if (loginRateLimited(c)) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const { password } = (await c.req.json().catch(() => ({}))) as { password?: unknown };
    if (typeof password !== "string" || !(await passwordMatches(c, password))) {
      return c.json({ error: "Wrong password" }, 401);
    }
    await startSession(c);
    return c.json({ ok: true });
  });

  api.post("/logout", (c) => {
    endSession(c);
    return c.json({ ok: true });
  });

  /* ------------------------------------------- everything below: logged in -- */

  api.use("*", requireAdmin);

  const store = (c: Context): AdminStore => {
    const admin = getSource(c).admin;
    if (!admin) throw new AdminError("The admin panel needs a database. Set DATABASE_URL on the server.", 400);
    return admin;
  };

  async function parse<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S> | Response> {
    const body = await c.req.json().catch(() => undefined);
    const result = schema.safeParse(body);
    if (!result.success) return c.json({ error: "Please fix the highlighted fields.", errors: fieldErrors(result.error) }, 422);
    return result.data;
  }

  api.get("/config", async (c) => {
    const config: AdminConfig = {
      uploadsEnabled: uploadsEnabled(c),
      mediaBaseUrl: (env<{ MEDIA_BASE_URL?: string }>(c).MEDIA_BASE_URL || null),
      nextReelCode: getSource(c).admin ? await store(c).nextReelCode() : "A100",
    };
    return c.json(config);
  });

  api.get("/stats", async (c) => {
    const days = Math.min(90, Math.max(1, Number(c.req.query("days")) || 30));
    const stats = await store(c).stats(days);
    const o = getSource(c).ops;
    const opsSummary = o
      ? await Promise.all([o.links.brokenCount(), o.subscribers.count(), o.errors.list(20), o.push.count()]).then(([brokenLinks, subscribers, errs, pushSubscribers]) => ({
          brokenLinks,
          subscribers,
          pushSubscribers,
          recentErrors: errs.filter((e) => Date.now() - Date.parse(e.lastSeen) < 86_400_000).length,
        }))
      : undefined;
    return c.json({ ...stats, ops: opsSummary });
  });

  // Reels
  api.get("/reels", async (c) => c.json({ reels: await store(c).listReels() }));
  api.get("/reels/:code", async (c) => {
    const reel = await store(c).getReel(c.req.param("code"));
    return reel ? c.json({ reel }) : c.json({ error: "Reel not found" }, 404);
  });
  api.post("/reels", async (c) => {
    const input = await parse(c, reelInput);
    if (input instanceof Response) return input;
    return c.json({ reel: await store(c).saveReel(input) }, 201);
  });
  api.put("/reels/:code", async (c) => {
    const input = await parse(c, reelInput);
    if (input instanceof Response) return input;
    return c.json({ reel: await store(c).saveReel(input, c.req.param("code").toUpperCase()) });
  });
  api.delete("/reels/:code", async (c) => {
    await store(c).deleteReel(c.req.param("code").toUpperCase());
    return c.json({ ok: true });
  });

  // Categories
  api.get("/categories", async (c) => c.json({ categories: await store(c).listCategories() }));
  api.post("/categories", async (c) => {
    const input = await parse(c, categoryInput);
    if (input instanceof Response) return input;
    await store(c).saveCategory(input);
    return c.json({ ok: true }, 201);
  });
  api.put("/categories/:slug", async (c) => {
    const input = await parse(c, categoryInput);
    if (input instanceof Response) return input;
    await store(c).saveCategory(input, c.req.param("slug"));
    return c.json({ ok: true });
  });
  api.delete("/categories/:slug", async (c) => {
    await store(c).deleteCategory(c.req.param("slug"));
    return c.json({ ok: true });
  });

  // Sale events
  api.get("/events", async (c) => c.json({ events: await store(c).listEvents() }));
  api.post("/events", async (c) => {
    const input = await parse(c, saleEventInput);
    if (input instanceof Response) return input;
    return c.json({ event: await store(c).saveEvent(input) });
  });
  api.delete("/events/:id", async (c) => {
    await store(c).deleteEvent(c.req.param("id"));
    return c.json({ ok: true });
  });

  // Loot deals
  api.get("/deals", async (c) => c.json({ deals: await store(c).listDeals() }));
  api.post("/deals", async (c) => {
    const input = await parse(c, lootDealInput);
    if (input instanceof Response) return input;
    return c.json({ deal: await store(c).saveDeal(input) });
  });
  api.delete("/deals/:id", async (c) => {
    await store(c).deleteDeal(c.req.param("id"));
    return c.json({ ok: true });
  });

  /* ---------------------------------------------------------- operations -- */

  const ops = (c: Context) => {
    const o = getSource(c).ops;
    if (!o) throw new AdminError("This needs the database. Set DATABASE_URL on the server.", 400);
    return o;
  };

  // Broken-link checker
  api.get("/links", async (c) => c.json(await ops(c).links.health()));
  api.post("/links/check", async (c) => {
    ops(c).jobs.start(LINK_JOB);
    return c.json({ started: true });
  });
  api.post("/links/:id/check", async (c) => {
    const r = await ops(c).links.checkOne(c.req.param("id"));
    return r ? c.json(r) : c.json({ error: "Link not found" }, 404);
  });

  // System health: alerts, jobs, errors
  api.get("/system", async (c) => c.json(await ops(c).system()));
  api.post("/system/test-alert", async (c) => {
    const sent = await sendAlert("Test alert from Shopping with Aarti", "If you can read this, alerts work. 🎉", `test:${Date.now()}`);
    return sent ? c.json({ ok: true }) : c.json({ error: "No alert channel set up yet. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (or ALERT_WEBHOOK_URL) on Render." }, 400);
  });
  api.delete("/system/errors", async (c) => {
    await ops(c).errors.clear();
    return c.json({ ok: true });
  });
  api.delete("/system/errors/:id", async (c) => {
    await ops(c).errors.clear(Number(c.req.param("id")));
    return c.json({ ok: true });
  });

  // WhatsApp alert subscribers
  api.get("/subscribers", async (c) => c.json({ subscribers: await ops(c).subscribers.list() }));
  api.delete("/subscribers/:id", async (c) => {
    await ops(c).subscribers.remove(Number(c.req.param("id")));
    return c.json({ ok: true });
  });

  // Push notifications
  api.get("/push", async (c) => c.json(await ops(c).push.status()));
  api.post("/push/send", async (c) => {
    const input = await parse(c, pushMessageInput);
    if (input instanceof Response) return input;
    return c.json(await ops(c).push.send(input));
  });

  // Instagram auto-sync
  api.get("/instagram", async (c) => c.json(await ops(c).instagram.status()));
  api.put("/instagram/token", async (c) => {
    const { token } = (await c.req.json().catch(() => ({}))) as { token?: string };
    if (!token || token.trim().length < 20) return c.json({ error: "Paste the full access token", field: "token" }, 422);
    await ops(c).instagram.connect(token);
    return c.json(await ops(c).instagram.status());
  });
  api.delete("/instagram", async (c) => {
    await ops(c).instagram.disconnect();
    return c.json({ ok: true });
  });
  api.put("/instagram/auto-import", async (c) => {
    const { on } = (await c.req.json().catch(() => ({}))) as { on?: boolean };
    await ops(c).instagram.setAutoImport(on !== false);
    return c.json({ ok: true });
  });
  api.get("/instagram/media", async (c) => c.json({ media: await ops(c).instagram.media() }));
  api.post("/instagram/import/:id", async (c) => c.json({ code: await ops(c).instagram.importOne(c.req.param("id")) }));
  api.post("/instagram/sync", async (c) => {
    const state = await ops(c).jobs.run(IG_JOB);
    return c.json({ job: state });
  });

  // Site settings
  api.get("/settings", async (c) => c.json({ settings: await store(c).getSettings() }));
  api.put("/settings", async (c) => {
    const input = await parse(c, settingsInput);
    if (input instanceof Response) return input;
    await store(c).saveSettings(input);
    return c.json({ ok: true });
  });

  // Demo content from the starter catalogue
  api.get("/demo-content", async (c) => c.json(await store(c).demoContent()));
  api.post("/demo-content/clear", async (c) => c.json({ removed: await store(c).clearDemoContent() }));

  // Enquiries
  api.get("/enquiries", async (c) => c.json({ enquiries: await store(c).listEnquiries() }));
  api.patch("/enquiries/:id", async (c) => {
    const { status } = (await c.req.json().catch(() => ({}))) as { status?: string };
    if (!status || !(enquiryStatuses as readonly string[]).includes(status)) return c.json({ error: "Invalid status" }, 400);
    await store(c).setEnquiryStatus(Number(c.req.param("id")), status as (typeof enquiryStatuses)[number]);
    return c.json({ ok: true });
  });

  // Media uploads (signed URL for a direct browser → R2 upload)
  api.post("/uploads", async (c) => {
    if (!uploadsEnabled(c)) return c.json({ error: "Uploads aren't set up. Paste a media URL instead." }, 400);
    const { fileName, contentType, folder } = (await c.req.json().catch(() => ({}))) as Record<string, string>;
    try {
      return c.json(await signUpload(c, String(fileName ?? "file"), String(contentType ?? ""), String(folder ?? "uploads")));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  return api;
}
