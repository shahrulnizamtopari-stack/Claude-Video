// node tools/shoot_board.cjs -> boards/storyboard.png (serves files from disk, no server needed)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 1000 } });
  await p.route("http://local/**", (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: "" }); r.fulfill({ status: 200, body: fs.readFileSync(f) }); });
  await p.goto("http://local/boards/storyboard.html"); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(ROOT, "boards/storyboard.png"), fullPage: true }); await b.close(); })();
