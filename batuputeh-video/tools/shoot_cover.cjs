// node tools/shoot_cover.cjs -> boards/cover-bg.jpg (globe from the film, no UI) then cover.jpg from boards/cover.html
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2" };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route("http://local/**", (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || "application/octet-stream" }); });
  await p.goto("http://local/index.html"); await p.waitForFunction(() => window.__renderAt, null, { timeout: 120000 });
  const t = +process.argv[2] || 9;
  await p.addStyleTag({ content: "#ui{display:none!important}" });
  await p.evaluate((x) => window.__renderAt(x), t); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(ROOT, "boards/cover-bg.jpg"), type: "jpeg", quality: 92 });
  await p.goto("http://local/boards/cover.html"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(ROOT, "cover.jpg"), type: "jpeg", quality: 92 }); await b.close(); })();
