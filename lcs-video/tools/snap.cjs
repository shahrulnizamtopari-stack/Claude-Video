// node tools/snap.cjs out_prefix t1 t2 ...  -> screenshots of index.html at times (server on :8765)
const { chromium } = require("playwright");
(async () => {
  const [pre, ...ts] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  p.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  await p.goto("http://localhost:8765/index.html");
  await p.waitForFunction(() => window.__renderAt, null, { timeout: 90000 });
  for (const t of ts) { await p.evaluate((t) => window.__renderAt(+t), t); await p.waitForTimeout(50); await p.screenshot({ path: `${pre}-${t}.png` }); }
  await b.close();
})();
