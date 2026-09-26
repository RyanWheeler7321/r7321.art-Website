const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const distRoot = path.join(root, "dist");
const playwrightLibraries = process.env.PLAYWRIGHT_LIBRARY_PATH;
if (playwrightLibraries && !process.env.LD_LIBRARY_PATH?.split(":").includes(playwrightLibraries)) {
  process.env.LD_LIBRARY_PATH = `${playwrightLibraries}:${process.env.LD_LIBRARY_PATH || ""}`;
}
const artifactRoot = process.env.MEDIA_TEST_ARTIFACTS
  || path.join(root, "local", "media-browser-check");
const port = Number(process.env.MEDIA_TEST_PORT || 8879);
const baseUrl = `http://127.0.0.1:${port}`;
const { chromium } = require("playwright");
const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_BROWSER) launchOptions.executablePath = process.env.PLAYWRIGHT_BROWSER;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageUrl(file) {
  const relative = path.relative(distRoot, file).replace(/\\/g, "/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Media test server did not start");
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const wrappers = [...document.querySelectorAll("[data-r7-media]")];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      highPriority: wrappers.filter((item) => item.dataset.mediaPriority === "high").length,
      degraded: wrappers.filter((item) => item.dataset.mediaState === "degraded").map((item) => item.dataset.mediaKey),
      missingPreview: wrappers.filter((item) => !getComputedStyle(item).backgroundImage.includes("data:image/webp"))
        .map((item) => item.dataset.mediaKey),
      missingDimensions: wrappers.filter((item) => {
        const rect = item.getBoundingClientRect();
        return !item.style.aspectRatio || (rect.width > 0 && rect.height <= 0);
      }).map((item) => item.dataset.mediaKey),
      rawRasters: [...document.images]
        .map((image) => image.currentSrc || image.src)
        .filter((src) => /\/images\/.*\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(src)),
      registryCount: window.__r7media?.entries?.length || 0,
      wrapperCount: wrappers.length
    };
  });
}

async function allPagesContract(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const gifRequests = [];
  page.on("request", (request) => {
    if (/\.gif(?:\?|$)/i.test(request.url())) gifRequests.push(request.url());
  });
  const htmlFiles = walk(distRoot).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const url = pageUrl(file);
    await page.goto(`${baseUrl}${url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(80);
    const state = await inspectPage(page);
    assert(state.overflow <= 1, `${url} overflowed horizontally`);
    assert(state.highPriority <= 1, `${url} declared more than one high-priority media item`);
    assert(state.degraded.length === 0, `${url} degraded media: ${state.degraded.join(", ")}`);
    assert(state.missingPreview.length === 0, `${url} missed inline previews`);
    assert(state.missingDimensions.length === 0, `${url} missed intrinsic dimensions`);
    assert(state.rawRasters.length === 0, `${url} loaded original raster sources`);
    assert(state.registryCount === state.wrapperCount, `${url} media registry did not cover every wrapper`);
  }
  assert(gifRequests.length === 0, `Browser requested raw GIFs: ${gifRequests.join(", ")}`);
  results.push(`all ${htmlFiles.length} generated pages satisfy the shared browser contract`);
  await context.close();
}

async function slowColdLoopTest(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 100000,
    connectionType: "cellular4g"
  });
  const mp4Requests = [];
  const gifRequests = [];
  page.on("request", (request) => {
    if (/\.mp4(?:\?|$)/i.test(request.url())) mp4Requests.push(request.url());
    if (/\.gif(?:\?|$)/i.test(request.url())) gifRequests.push(request.url());
  });

  const started = Date.now();
  await page.goto(`${baseUrl}/support/`, { waitUntil: "domcontentloaded" });
  const immediate = await page.evaluate(() => [...document.querySelectorAll(".progressive-loop")].map((wrapper) => ({
    background: getComputedStyle(wrapper).backgroundImage,
    inlinePreview: wrapper.style.getPropertyValue("--media-lqip"),
    poster: wrapper.querySelector(".managed-media-poster")?.getAttribute("src"),
    videoSource: wrapper.querySelector("video")?.getAttribute("src")
  })));
  assert(immediate.length === 2, "Support page did not render both managed loops");
  assert(immediate.every((item) => item.background.includes("data:image/webp")), `Cold page lacked immediate inline loop pixels: ${JSON.stringify(immediate)}`);
  assert(immediate.every((item) => item.poster?.endsWith(".webp")), "Cold page lacked loop posters");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(artifactRoot, "support-slow-4g-300ms.png"), fullPage: false });
  await page.waitForFunction(() => {
    const loops = window.__r7media?.entries?.filter((entry) => entry.kind === "loop") || [];
    return loops.length === 2 && loops.every((entry) => ["playing", "held", "degraded"].includes(entry.state));
  }, null, { timeout: 20000 });
  const final = await page.evaluate(() => window.__r7media.entries.filter((entry) => entry.kind === "loop"));
  assert(final.every((entry) => entry.state === "playing"), `Slow loops did not reach playing: ${JSON.stringify(final)}`);
  assert(mp4Requests.length === 2, `Expected one MP4 per loop, received ${mp4Requests.length}`);
  assert(new Set(mp4Requests).size === 2, "A loop requested more than one video rendition");
  assert(gifRequests.length === 0, "Slow page requested a raw GIF");
  results.push(`slow-4G support loops show inline pixels immediately and both play from exactly one MP4 in ${Date.now() - started} ms`);
  await context.close();
}

async function offscreenAndPreferenceTests(browser, results) {
  const supportHtml = fs.readFileSync(path.join(distRoot, "support", "index.html"), "utf8");
  const context = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => {
    if (/\.mp4(?:\?|$)/i.test(request.url())) requests.push(request.url());
  });
  await page.route(`${baseUrl}/support/`, (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: supportHtml.replace('<section class="project-support-page shell">', '<div style="height:4000px" aria-hidden="true"></div><section class="project-support-page shell">')
  }));
  await page.goto(`${baseUrl}/support/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  assert(requests.length === 0, "Offscreen loops requested video before the observer threshold");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => window.__r7media.entries.filter((entry) => entry.kind === "loop").every((entry) => entry.state === "playing"), null, { timeout: 10000 });
  assert(requests.length === 2, "Scrolling into range did not request exactly one MP4 per loop");
  await context.close();

  for (const mode of ["reduced-motion", "save-data"]) {
    const options = { viewport: { width: 900, height: 700 } };
    if (mode === "reduced-motion") options.reducedMotion = "reduce";
    const heldContext = await browser.newContext(options);
    if (mode === "save-data") {
      await heldContext.addInitScript(() => {
        Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
      });
    }
    const heldPage = await heldContext.newPage();
    const heldRequests = [];
    heldPage.on("request", (request) => {
      if (/\.mp4(?:\?|$)/i.test(request.url())) heldRequests.push(request.url());
    });
    await heldPage.goto(`${baseUrl}/support/`, { waitUntil: "domcontentloaded" });
    await heldPage.waitForTimeout(500);
    const states = await heldPage.evaluate(() => window.__r7media.entries.filter((entry) => entry.kind === "loop").map((entry) => entry.state));
    assert(states.length === 2 && states.every((state) => state === "held"), `${mode} did not hold animations on their posters`);
    assert(heldRequests.length === 0, `${mode} still requested MP4 media`);
    await heldContext.close();
  }
  results.push("offscreen, reduced-motion, and Save-Data paths avoid premature video requests");
}

async function failureAndNoJsTests(browser, results) {
  const failureContext = await browser.newContext({ viewport: { width: 900, height: 700 } });
  await failureContext.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
  });
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`${baseUrl}/support/`, { waitUntil: "domcontentloaded" });
  await failurePage.waitForFunction(() => window.__r7media.entries.filter((entry) => entry.kind === "loop").every((entry) => entry.state === "held"));
  const fallback = await failurePage.evaluate(() => [...document.querySelectorAll(".progressive-loop")].map((wrapper) => ({
    posterVisible: getComputedStyle(wrapper.querySelector(".managed-media-poster")).display !== "none",
    videoOpacity: getComputedStyle(wrapper.querySelector(".managed-media-video")).opacity
  })));
  assert(fallback.every((item) => item.posterVisible && item.videoOpacity === "0"), "Autoplay rejection exposed a blank or unpainted video layer");
  await failureContext.close();

  const noJsContext = await browser.newContext({ viewport: { width: 900, height: 700 }, javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseUrl}/support/`, { waitUntil: "load" });
  const noJs = await noJsPage.evaluate(() => [...document.querySelectorAll(".progressive-loop")].map((wrapper) => ({
    poster: wrapper.querySelector(".managed-media-poster")?.complete,
    source: wrapper.querySelector("video")?.getAttribute("src"),
    height: wrapper.getBoundingClientRect().height
  })));
  assert(noJs.length === 2 && noJs.every((item) => item.poster && !item.source && item.height > 0), "No-JavaScript loop fallback was not a complete poster");
  await noJsContext.close();
  results.push("autoplay rejection and no-JavaScript paths retain complete nonblank posters");
}

async function loopConcurrencyTest(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  let active = 0;
  let peak = 0;
  const requested = new Set();
  await page.route(/\.mp4(?:\?|$)/i, async (route) => {
    active += 1;
    peak = Math.max(peak, active);
    requested.add(route.request().url());
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
    active -= 1;
  });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const loopCount = await page.locator(".progressive-loop").count();
  assert(loopCount >= 3, `Homepage needs at least three loops for the concurrency check, found ${loopCount}`);
  await page.waitForFunction(() => {
    const loops = window.__r7media?.entries?.filter((entry) => entry.kind === "loop") || [];
    return loops.length >= 3 && loops.every((entry) => entry.state === "playing");
  }, null, { timeout: 20000 });
  assert(requested.size === loopCount, `Expected one selected MP4 for each of ${loopCount} loops, received ${requested.size}`);
  assert(peak <= 2, `Loop loader exceeded its two-request concurrency cap: ${peak}`);
  results.push(`homepage loaded ${loopCount} loops with one rendition each and peak assignment concurrency ${peak}`);
  await context.close();
}

async function responsiveLayoutTest(browser, results) {
  for (const viewport of [
    { label: "wide", width: 1600, height: 1000, expectedThumb: 76 },
    { label: "mobile", width: 390, height: 844, expectedThumb: 72 }
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      thumbnails: [...document.querySelectorAll(".home-list-thumbnail")].map((item) => {
        const rect = item.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }).filter((item) => item.width > 0),
      blankVisible: [...document.querySelectorAll("[data-r7-media]")]
        .filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0
            && getComputedStyle(item).backgroundImage === "none"
            && !item.querySelector("img")?.complete;
        }).length
    }));
    assert(layout.overflow <= 1, `${viewport.label} homepage overflowed after media migration`);
    assert(layout.thumbnails.length > 0, `${viewport.label} homepage had no managed update thumbnails`);
    assert(layout.thumbnails.every((item) => Math.abs(item.width - viewport.expectedThumb) <= 1 && Math.abs(item.height - viewport.expectedThumb) <= 1), `${viewport.label} homepage thumbnail sizing drifted: ${JSON.stringify(layout.thumbnails)}`);
    assert(layout.blankVisible === 0, `${viewport.label} homepage exposed a blank managed-media region`);
    await page.screenshot({ path: path.join(artifactRoot, `home-${viewport.label}.png`), fullPage: true });
    await context.close();
  }
  results.push("wide and mobile homepage layouts retain their intended thumbnail sizing and nonblank media");
}

(async () => {
  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", distRoot], { stdio: "ignore" });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch(launchOptions);
    const results = [];
    await allPagesContract(browser, results);
    await slowColdLoopTest(browser, results);
    await offscreenAndPreferenceTests(browser, results);
    await failureAndNoJsTests(browser, results);
    await loopConcurrencyTest(browser, results);
    await responsiveLayoutTest(browser, results);
    const report = { ok: true, tests: results };
    fs.writeFileSync(path.join(artifactRoot, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
