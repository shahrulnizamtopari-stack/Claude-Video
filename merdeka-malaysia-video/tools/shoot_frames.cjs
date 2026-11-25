// node tools/shoot_frames.cjs [frames...]  -> boards/frame-0N.png
// No local server needed: Playwright serves the project from disk through page.route.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };
(async () => {
  const fr = process.argv.slice(2).length ? process.argv.slice(2) : Array.from({ length: 10 }, (_, i) => String(i + 1));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.route("http://local/**", (r) => {
    const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || "application/octet-stream" });
  });
  p.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  for (const f of fr) {
    await p.goto(`http://local/boards/frame.html?f=${f}`);
    await p.waitForSelector("body[data-ready]", { timeout: 90000 });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, `boards/frame-${String(f).padStart(2, "0")}.png`) });
    console.log("shot", f);
  }
  await b.close();
})();
