const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, ".qa");
const localMode = !process.env.SITE_URL;
const siteUrl = (process.env.SITE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
fs.mkdirSync(out, { recursive: true });

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

(async () => {
  if (localMode) await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH,
    headless: true,
  });
  const problems = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const label = `${viewport.width}x${viewport.height}`;
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`${label} console: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`${label} pageerror: ${error.message}`));

    await page.goto(`${siteUrl}/`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      cards: document.querySelectorAll("#project-grid .project-card").length,
      featured: document.querySelectorAll("#featured-projects .featured-card").length,
      title: document.title,
    }));

    if (metrics.width > metrics.viewport) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        })
        .filter((item) => item.right > document.documentElement.clientWidth + 1 || item.left < -1)
        .slice(0, 8));
      problems.push(`${label}: horizontal overflow ${metrics.width} > ${metrics.viewport}; ${JSON.stringify(offenders)}`);
    }
    if (metrics.cards !== 24) problems.push(`${label}: expected 24 project cards, got ${metrics.cards}`);
    if (metrics.featured !== 0) problems.push(`${label}: featured block should be absent, got ${metrics.featured} cards`);

    if (viewport.width === 430) {
      await page.locator('[data-filter="exclusive"]').click();
      const exclusiveCount = await page.locator("#project-grid .project-card").count();
      if (exclusiveCount !== 6) problems.push(`${label}: exclusive filter expected 6, got ${exclusiveCount}`);

      await page.locator('[data-filter="voice"]').click();
      const voiceCount = await page.locator("#project-grid .project-card").count();
      if (voiceCount !== 6) problems.push(`${label}: voice filter expected 6, got ${voiceCount}`);

      await page.locator('[data-filter="all"]').click();
      await page.locator("#project-search").fill("Kafka");
      const searchCount = await page.locator("#project-grid .project-card").count();
      if (searchCount !== 1) problems.push(`${label}: search expected 1, got ${searchCount}`);
      await page.locator("#project-search").fill("");

      await page.locator('#project-grid [data-project="endacopia"]').click();
      if (!(await page.locator("#project-modal").evaluate((dialog) => dialog.open))) problems.push(`${label}: modal did not open`);
      await page.locator(".project-modal__close").click();

      for (const sectionId of ["projects", "about", "team", "support", "contacts"]) {
        await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(out, `${label}-${sectionId}.png`) });
      }
    }

    await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: viewport.width === 430 });
    await page.close();
  }

  await browser.close();
  if (localMode) server.close();

  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`OK: ${viewports.length} viewports, filters, search, modal, no JS errors or horizontal overflow.`);
  }
})().catch((error) => {
  console.error(error);
  if (localMode) server.close();
  process.exitCode = 1;
});
