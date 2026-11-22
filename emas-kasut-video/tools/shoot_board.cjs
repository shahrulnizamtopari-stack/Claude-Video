const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 1000 } });
  await p.goto("http://localhost:8765/boards/storyboard.html"); await p.waitForTimeout(1500);
  await p.screenshot({ path: "boards/storyboard.png", fullPage: true }); await b.close(); })();
