// node tools/shoot_frames.cjs [frames...]  -> boards/frame-0N.png
// Needs a static server on :8765 serving lcs-video/ (python3 -m http.server 8765).
const { chromium } = require("playwright");
(async () => {
  const fr = process.argv.slice(2).length ? process.argv.slice(2) : ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  for (const f of fr) {
    await p.goto(`http://localhost:8765/boards/frame.html?f=${f}`);
    await p.waitForSelector("body[data-ready]", { timeout: 60000 });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `boards/frame-0${f}.png` });
    console.log("shot", f);
  }
  await b.close();
})();
