// Cloudflare Workers entry. Static files are served by Workers Static Assets
// (see wrangler.jsonc); only /api/* and /go/* are routed here.
import app from "./app";

export default app;
