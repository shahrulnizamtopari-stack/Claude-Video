// node tools/snapr.cjs t1 t2 ... -> renders/snap-<t>.png from index.html (files served from disk, no server)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2" };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route("http://local/**", (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || "application/octet-stream" }); });
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  await p.goto("http://local/index.html"); await p.waitForFunction(() => window.__renderAt, null, { timeout: 120000 });
  fs.mkdirSync(path.join(ROOT, "renders"), { recursive: true });
  for (const t of process.argv.slice(2)) { await p.evaluate((x) => window.__renderAt(+x), t); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(ROOT, `renders/snap-${t}.png`) }); console.log("snap", t); }
  await b.close(); })();
