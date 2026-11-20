// node tools/shoot_cover.cjs -> cover.jpg (1080x1920) from boards/cover.html
const { chromium } = require("playwright"); const path = require("path");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file://" + path.resolve(__dirname, "../boards/cover.html")); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.resolve(__dirname, "../cover.jpg"), type: "jpeg", quality: 92 }); await b.close(); })();
