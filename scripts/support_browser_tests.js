const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const playwrightModule = process.env.PLAYWRIGHT_MODULE
  || "/home/ryan/.npm/_npx/520e866687cefe78/node_modules/playwright";
const browserPath = process.env.PLAYWRIGHT_BROWSER
  || "/home/ryan/.cache/ms-playwright/chromium-1224/chrome-linux64/chrome";
const baseUrl = process.env.SUPPORT_TEST_BASE_URL || "http://127.0.0.1:8767";
const artifactRoot = process.env.SUPPORT_TEST_ARTIFACTS
  || path.join(root, "local", "support-browser-check");
const { chromium } = require(playwrightModule);
const supportHtmlPath = process.env.SUPPORT_TEST_HTML
  || path.join(root, "dist", "message", "index.html");
const supportHtml = fs.readFileSync(supportHtmlPath, "utf8");
const pngPath = path.join(artifactRoot, "draft.png");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function intersects(a, b) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

function parseMultipart(request) {
  const contentType = request.headers()["content-type"] || "";
  const boundary = contentType.match(/boundary=(.+)$/i)?.[1];
  const body = request.postDataBuffer();
  assert(boundary && body, "Submission did not contain a multipart body");

  const fields = new Map();
  const files = [];
  for (const part of body.toString("latin1").split(`--${boundary}`)) {
    const name = part.match(/name="([^"]+)"/i)?.[1];
    if (!name) continue;
    const filename = part.match(/filename="([^"]*)"/i)?.[1];
    const value = part.split("\r\n\r\n")[1]?.replace(/\r\n$/, "") ?? "";
    if (filename !== undefined) files.push({ name, filename, bytes: value.length });
    else fields.set(name, value);
  }
  return { fields, files };
}

async function installLiveRoutes(page, postHandler) {
  await page.route(`${baseUrl}/message/`, (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: supportHtml.replace('data-support-preview="true"', 'data-support-preview="false"')
  }));
  await page.route(`${baseUrl}/api/support.php?action=init`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, formToken: "signed-form-token", turnstileSiteKey: "test-site-key" })
  }));
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `
      (() => {
        let options;
        window.turnstile = {
          ready(callback) { callback(); },
          render(element, value) { options = value; element.dataset.testRendered = "true"; return "test-widget"; },
          reset() {},
          execute() {
            setTimeout(() => {
              if (window.__turnstileMode === "error") options["error-callback"]();
              else options.callback("fresh-turnstile-token");
            }, 0);
          }
        };
      })();
    `
  }));
  await page.route(`${baseUrl}/api/support.php`, postHandler);
}

async function previewAndDraftTest(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  assert(await page.locator("[data-support-form]").getAttribute("data-support-preview") === "true", "Preview mode changed unexpectedly");
  await page.getByText("Bug", { exact: true }).click();
  await page.locator('[name="name"]').fill("Draft Person");
  await page.locator('[name="email"]').fill("draft@example.com");
  await page.locator('[name="message"]').fill("This draft must survive a refresh.");
  await page.locator("[data-support-images]").setInputFiles(pngPath);
  await page.locator(".support-image-item").waitFor();
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".support-image-item").waitFor();
  assert(await page.locator('input[value="bug"]').isChecked(), "Category did not survive refresh");
  assert(await page.locator('[name="name"]').inputValue() === "Draft Person", "Name did not survive refresh");
  assert(await page.locator('[name="email"]').inputValue() === "draft@example.com", "Email did not survive refresh");
  assert(await page.locator('[name="message"]').inputValue() === "This draft must survive a refresh.", "Message did not survive refresh");
  assert(await page.locator(".support-image-item").count() === 1, "Image did not survive refresh");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("This preview is ready for review").waitFor();
  assert(await page.locator('[name="message"]').inputValue() !== "", "Preview submission cleared the draft");
  results.push("preview stays inert and refresh restores text, category, and image");
  await context.close();
}

async function liveSuccessTest(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  let submission = null;
  await installLiveRoutes(page, async (route) => {
    submission = parseMultipart(route.request());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  await page.locator('[name="name"]').fill("Live Person");
  await page.locator('[name="email"]').fill("live@example.com");
  await page.locator('[name="message"]').fill("A browser-level support test.");
  await page.locator("[data-support-images]").setInputFiles(pngPath);
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Thanks for messaging me!").waitFor();
  assert(submission, "Submission never reached the endpoint");
  assert(submission.fields.get("name") === "Live Person", "Name missing from FormData");
  assert(submission.fields.get("email") === "live@example.com", "Email missing from FormData");
  assert(submission.fields.get("message") === "A browser-level support test.", "Message missing from FormData");
  assert(submission.fields.get("formToken") === "signed-form-token", "Signed form token missing");
  assert(submission.fields.get("turnstileToken") === "fresh-turnstile-token", "Fresh Turnstile token missing");
  assert(Boolean(submission.fields.get("idempotencyKey")), "Idempotency key missing");
  assert(submission.files.length === 1, "Image was not submitted exactly once");
  assert(submission.files[0].name === "images[]" && submission.files[0].filename === "draft.png", "Image multipart field was wrong");
  assert(await page.locator("[data-support-form]").isHidden(), "Form stayed visible after acceptance");
  assert(await page.locator(".support-heading").isHidden(), "Heading stayed visible after acceptance");
  const center = await page.locator("[data-support-success]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, viewportX: innerWidth / 2, viewportY: innerHeight / 2 };
  });
  assert(Math.abs(center.x - center.viewportX) <= 2, "Success view was not horizontally centered");
  assert(Math.abs(center.y - center.viewportY) <= 125, "Success body was not near viewport center");
  await page.screenshot({ path: path.join(artifactRoot, "support-success.png"), fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  assert(await page.locator("[data-support-form]").isVisible(), "Refresh after success did not restore the form");
  assert(await page.locator("[data-support-success]").isHidden(), "Refresh after success kept the success view");
  assert(await page.locator('[name="name"]').inputValue() === "", "Name was not blank after success refresh");
  assert(await page.locator('[name="email"]').inputValue() === "", "Email was not blank after success refresh");
  assert(await page.locator('[name="message"]').inputValue() === "", "Message was not blank after success refresh");
  assert(await page.locator(".support-image-item").count() === 0, "Image draft survived an accepted send");
  results.push("live-mock POST contains explicit fields/image and fresh Turnstile data");
  results.push("accepted send shows centered success and refresh returns a blank form");
  await context.close();
}

async function failureTests(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const smtpPage = await context.newPage();
  await installLiveRoutes(smtpPage, (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, code: "mail_failed", message: "Email delivery failed. Please try again." })
  }));
  await smtpPage.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  await smtpPage.locator('[name="message"]').fill("Keep me after failure.");
  await smtpPage.locator("[data-support-images]").setInputFiles(pngPath);
  await smtpPage.getByRole("button", { name: "Send" }).click();
  await smtpPage.getByText("Email delivery failed").waitFor();
  assert(await smtpPage.locator('[name="message"]').inputValue() === "Keep me after failure.", "SMTP failure cleared the message");
  assert(await smtpPage.locator(".support-image-item").count() === 1, "SMTP failure cleared the image");
  assert(await smtpPage.getByRole("button", { name: "Send" }).isEnabled(), "SMTP failure left Send disabled");
  await smtpPage.close();

  const ratePage = await context.newPage();
  await installLiveRoutes(ratePage, (route) => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, code: "rate_limited", message: "Please slow down.", retryAfter: 12 })
  }));
  await ratePage.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  await ratePage.locator('[name="message"]').fill("Rate boundary test.");
  await ratePage.getByRole("button", { name: "Send" }).click();
  await ratePage.getByText(/try again in 12 seconds/).waitFor();
  assert(await ratePage.locator('[name="message"]').inputValue() !== "", "Rate limit cleared the message");
  await ratePage.close();

  const turnstilePage = await context.newPage();
  let postCount = 0;
  await installLiveRoutes(turnstilePage, (route) => {
    postCount += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await turnstilePage.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  await turnstilePage.evaluate(() => { window.__turnstileMode = "error"; });
  await turnstilePage.locator('[name="message"]').fill("Turnstile must fail closed.");
  await turnstilePage.getByRole("button", { name: "Send" }).click();
  await turnstilePage.getByText("Spam protection failed").waitFor();
  assert(postCount === 0, "Endpoint was called after Turnstile failure");
  assert(await turnstilePage.locator('[name="message"]').inputValue() !== "", "Turnstile failure cleared the message");
  results.push("SMTP-style and rate-limit failures preserve state and allow retry");
  results.push("Turnstile failure is fail-closed and never posts");
  await context.close();
}

async function storageFailureTest(browser, results) {
  const context = await browser.newContext({ viewport: { width: 900, height: 760 } });
  await context.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: { open() { throw new DOMException("Storage disabled", "SecurityError"); } }
    });
  });
  const page = await context.newPage();
  await installLiveRoutes(page, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true })
  }));
  await page.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
  await page.locator('[name="message"]').fill("Storage failure must not hide accepted delivery.");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Thanks for messaging me!").waitFor();
  assert(await page.locator("[data-support-form]").isHidden(), "Storage failure blocked the accepted success state");
  results.push("disabled IndexedDB cannot turn an accepted message into a false retry");
  await context.close();
}

async function layoutTests(browser, results) {
  for (const viewport of [
    { width: 1920, height: 1080, label: "wide" },
    { width: 1440, height: 1000, label: "desktop" },
    { width: 768, height: 1024, label: "tablet" },
    { width: 390, height: 844, label: "mobile" }
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-home-fit-panel]")]
      .every((panel) => panel.style.getPropertyValue("--home-fit-max-height")));
    const layout = await page.evaluate(() => {
      const messageAction = document.querySelector("[data-home-message-action]")?.getBoundingClientRect();
      const messageNote = document.querySelector("[data-home-message-note]")?.getBoundingClientRect();
      const projectAction = document.querySelector("[data-home-project-support-action]")?.getBoundingClientRect();
      const header = document.querySelector(".site-header-inner")?.getBoundingClientRect();
      const leftRail = document.querySelector(".home-layout > .home-side-rail:first-of-type")?.getBoundingClientRect();
      const rightRail = document.querySelector(".home-tools-rail")?.getBoundingClientRect();
      const owner = document.querySelector("[data-home-height-owner]")?.getBoundingClientRect();
      const outlineWidth = Number.parseFloat(getComputedStyle(document.querySelector("[data-home-message-action]")).getPropertyValue("--card-outline-width"));
      const rect = (value) => value && ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom });
      const fitPanels = [...document.querySelectorAll("[data-home-fit-panel]")].map((panel) => {
        const bounds = panel.getBoundingClientRect();
        const items = [...panel.querySelectorAll("[data-home-fit-item]")];
        const more = panel.querySelector("[data-home-fit-more]");
        const moreBounds = more?.getBoundingClientRect();
        return {
          height: bounds.height,
          bottom: bounds.bottom,
          total: items.length,
          visible: items.filter((item) => !item.hidden).length,
          hiddenRendered: items.filter((item) => item.hidden && item.getBoundingClientRect().height > 0).length,
          moreVisible: Boolean(more && !more.hidden && moreBounds.height > 0),
          moreFullyVisible: Boolean(moreBounds && moreBounds.top >= bounds.top && moreBounds.bottom <= bounds.bottom + 1),
          moreIsLast: more?.parentElement?.lastElementChild === more,
          moreHref: more?.getAttribute("href")
        };
      });
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        messageHref: document.querySelector("[data-home-message-action]")?.getAttribute("href"),
        projectHref: document.querySelector("[data-home-project-support-action]")?.getAttribute("href"),
        outlineWidth,
        messageAction: rect(messageAction),
        messageNote: rect(messageNote),
        projectAction: rect(projectAction),
        header: rect(header),
        leftRail: rect(leftRail),
        rightRail: rect(rightRail),
        owner: rect(owner),
        ownerHeight: owner?.height,
        fitPanels,
        actionsPosition: getComputedStyle(document.querySelector("[data-home-header-actions]")).position,
        headerPosition: getComputedStyle(document.querySelector(".site-header")).position,
        messageKeywordColor: getComputedStyle(document.querySelector(".home-action-keyword-message")).color,
        supportKeywordColor: getComputedStyle(document.querySelector(".home-action-keyword-support")).color,
        messageNoteText: document.querySelector("[data-home-message-note]")?.textContent.trim(),
        messageNoteStyle: getComputedStyle(document.querySelector("[data-home-message-note]")).fontStyle,
        headerCenter: header && header.left + header.width / 2,
        viewportCenter: innerWidth / 2,
        viewportWidth: innerWidth
      };
    });
    assert(layout.overflow <= 1, `${viewport.label} homepage overflowed horizontally`);
    assert(layout.messageHref === "/message/", `${viewport.label} message action had the wrong route`);
    assert(layout.projectHref === "/support/", `${viewport.label} project support action had the wrong route`);
    assert(layout.outlineWidth >= 2.85, `${viewport.label} action outline was not visibly thicker`);
    assert(layout.messageKeywordColor === "rgb(114, 200, 223)", `${viewport.label} MESSAGE did not use the cyan-blue accent`);
    assert(layout.supportKeywordColor === "rgb(240, 68, 130)", `${viewport.label} SUPPORT did not use the pink-red accent`);
    assert(layout.messageNoteText === "Feedback / Bug Report" && layout.messageNoteStyle === "italic", `${viewport.label} message action note was missing or not italic`);
    assert(layout.actionsPosition === "absolute" && layout.headerPosition === "fixed", `${viewport.label} actions and header did not use separate scroll ownership`);
    assert(Math.abs(layout.headerCenter - layout.viewportCenter) <= 2, `${viewport.label} main header moved off center`);
    assert(layout.messageAction && layout.projectAction && layout.header, `${viewport.label} homepage actions were missing`);
    assert(layout.messageNote && layout.messageNote.top >= layout.messageAction.bottom + 2 && layout.messageNote.top <= layout.messageAction.bottom + 8, `${viewport.label} message action note was not directly beneath the button`);
    assert(!intersects(layout.messageAction, layout.header), `${viewport.label} message action overlapped the header`);
    assert(!intersects(layout.projectAction, layout.header), `${viewport.label} project support action overlapped the header`);
    assert(!intersects(layout.messageAction, layout.projectAction), `${viewport.label} homepage actions overlapped each other`);
    assert(layout.messageAction.left >= 0 && layout.projectAction.right <= layout.viewportWidth, `${viewport.label} homepage actions left the viewport`);
    assert(layout.messageAction.bottom - layout.messageAction.top >= (viewport.label === "wide" ? 63 : viewport.label === "mobile" ? 47 : 55), `${viewport.label} homepage actions were not enlarged`);
    assert(layout.fitPanels.length === 2, `${viewport.label} homepage fit panels were missing`);
    layout.fitPanels.forEach((panel, index) => {
      assert(panel.height <= layout.ownerHeight + 1, `${viewport.label} rail ${index + 1} exceeded the project-column height`);
      assert(panel.hiddenRendered === 0, `${viewport.label} rail ${index + 1} still rendered entries marked hidden`);
      assert(panel.moreVisible && panel.moreFullyVisible && panel.moreIsLast, `${viewport.label} rail ${index + 1} did not end with the fully visible compact more link`);
    });
    assert(layout.fitPanels[0].moreHref === "/updates/" && layout.fitPanels[1].moreHref === "/tools/", `${viewport.label} rail more links had the wrong routes`);
    if (viewport.label === "wide") {
      const center = (rect) => rect.left + (rect.right - rect.left) / 2;
      assert(Math.abs(center(layout.messageAction) - center(layout.leftRail)) <= 2, "Wide message action was not centered above the left rail");
      assert(Math.abs(center(layout.projectAction) - center(layout.rightRail)) <= 2, "Wide project support action was not centered above the right rail");
      assert(layout.fitPanels[0].visible < layout.fitPanels[0].total, "Wide updates rail did not trim overflowing entries");
      assert(layout.fitPanels.every((panel) => panel.bottom <= layout.owner.bottom + 1), "Wide rail extended below the project column");

      const scrollOwnership = await page.evaluate(async () => {
        const header = document.querySelector(".site-header");
        const actions = document.querySelector("[data-home-header-actions]");
        const before = { header: header.getBoundingClientRect().top, actions: actions.getBoundingClientRect().top };
        const target = Math.min(300, Math.max(0, document.documentElement.scrollHeight - innerHeight));
        window.scrollTo({ top: target, behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const after = { header: header.getBoundingClientRect().top, actions: actions.getBoundingClientRect().top };
        window.scrollTo({ top: 0, behavior: "instant" });
        return { before, after, target };
      });
      if (scrollOwnership.target >= 50) {
        assert(Math.abs(scrollOwnership.after.header - scrollOwnership.before.header) <= 1, "Main header did not remain fixed while scrolling");
        assert(scrollOwnership.after.actions <= scrollOwnership.before.actions - scrollOwnership.target + 2, "Side actions stayed attached to the fixed header while scrolling");
      }
    }
    if (viewport.label === "wide" || viewport.label === "mobile") {
      await page.screenshot({ path: path.join(artifactRoot, `home-${viewport.label}.png`), fullPage: true });
    }

    await page.locator("[data-home-message-action]").click();
    assert(new URL(page.url()).pathname === "/message/", `${viewport.label} message action was not clickable`);
    await page.goBack({ waitUntil: "networkidle" });

    await page.locator("[data-home-project-support-action]").click();
    assert(new URL(page.url()).pathname === "/support/", `${viewport.label} project support action was not clickable`);

    await page.waitForLoadState("networkidle");
    const projectSupport = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      patreonHref: document.querySelector("[data-project-support-patreon]")?.getAttribute("href"),
      gameHrefs: [...document.querySelectorAll("[data-project-support-game]")].map((link) => link.getAttribute("href")),
      copy: document.querySelector(".project-support-heading p")?.textContent.trim(),
      boldTerms: [...document.querySelectorAll(".project-support-heading p strong")].map((item) => item.textContent.trim()),
      optionsColumns: getComputedStyle(document.querySelector(".project-support-options")).gridTemplateColumns,
      gamesHeading: document.querySelector("#support-games-title")?.textContent.trim(),
      progressiveLoops: document.querySelectorAll(".project-support-game .progressive-loop").length,
      rawGifImages: [...document.querySelectorAll(".project-support-game img")].filter((image) => image.currentSrc.endsWith(".gif") || image.src.endsWith(".gif")).length,
      previewVideos: [...document.querySelectorAll(".project-support-game .loop-preview source")].map((source) => source.getAttribute("src")),
      fullVideos: [...document.querySelectorAll(".project-support-game .loop-full source")].map((source) => source.getAttribute("src")),
      patreonRect: (() => {
        const rect = document.querySelector("[data-project-support-patreon]")?.getBoundingClientRect();
        return rect && { width: rect.width, height: rect.height };
      })()
    }));
    assert(projectSupport.overflow <= 1, `${viewport.label} project support page overflowed horizontally`);
    assert(projectSupport.patreonHref === "https://www.patreon.com/c/ryanwheeler", `${viewport.label} Patreon link was wrong`);
    assert(projectSupport.gameHrefs.length === 2, `${viewport.label} project support page did not show the two paid games`);
    assert(projectSupport.gameHrefs.every((href) => href.startsWith("https://store.steampowered.com/app/")), `${viewport.label} project support page had a non-Steam game link`);
    assert(!projectSupport.gameHrefs.some((href) => href.includes("2702590")), `${viewport.label} project support page still listed free Sidereal`);
    assert(projectSupport.copy.includes("then thank you!") && projectSupport.copy.includes("purchase one of my games"), `${viewport.label} project support copy was wrong`);
    assert(projectSupport.boldTerms.join("|") === "Steam|Patreon", `${viewport.label} Steam and Patreon were not emphasized`);
    assert(projectSupport.gamesHeading === "Buy and Play My Games", `${viewport.label} games heading was wrong`);
    assert(projectSupport.patreonRect && Math.abs(projectSupport.patreonRect.width - projectSupport.patreonRect.height) <= 2, `${viewport.label} Patreon card was not square`);
    assert(projectSupport.progressiveLoops === 2 && projectSupport.rawGifImages === 0, `${viewport.label} paid game media fell back to raw GIFs`);
    assert(projectSupport.previewVideos.length === 2 && projectSupport.previewVideos.every((src) => src.endsWith("-preview.mp4")), `${viewport.label} low-quality loop previews were missing`);
    assert(projectSupport.fullVideos.length === 2 && projectSupport.fullVideos.every((src) => src.endsWith("-full.mp4")), `${viewport.label} full loop videos were missing`);
    if (viewport.width > 900) {
      assert(projectSupport.optionsColumns.split(" ").length === 2, `${viewport.label} Patreon and Steam were not side by side`);
    }
    if (viewport.label === "wide" || viewport.label === "mobile") {
      await page.screenshot({ path: path.join(artifactRoot, `project-support-${viewport.label}.png`), fullPage: true });
    }

    await page.goto(`${baseUrl}/message/`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `${viewport.label} message page overflowed horizontally`);
    if (viewport.label === "mobile") {
      await page.screenshot({ path: path.join(artifactRoot, "message-mobile.png"), fullPage: true });
    }
    const successCenter = await page.evaluate(() => {
      document.querySelector(".support-heading").hidden = true;
      document.querySelector("[data-support-form]").hidden = true;
      const success = document.querySelector("[data-support-success]");
      success.hidden = false;
      const rect = success.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, viewportX: innerWidth / 2, viewportY: innerHeight / 2 };
    });
    assert(Math.abs(successCenter.x - successCenter.viewportX) <= 2, `${viewport.label} success view was not horizontally centered`);
    assert(Math.abs(successCenter.y - successCenter.viewportY) <= 125, `${viewport.label} success body was not near viewport center`);
    if (viewport.label === "mobile") {
      await page.screenshot({ path: path.join(artifactRoot, "support-success-mobile.png"), fullPage: true });
    }
    await context.close();
  }
  results.push("page-top actions scroll away independently while fitted update/tool rails stop at the project-column height across responsive sizes");
}

(async () => {
  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(pngPath, Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAFUlEQVR4nGP8z0AYYBxVSFUBAAAbQQEXGgZqWQAAAABJRU5ErkJggg==",
    "base64"
  ));
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const results = [];
  try {
    await previewAndDraftTest(browser, results);
    await liveSuccessTest(browser, results);
    await failureTests(browser, results);
    await storageFailureTest(browser, results);
    await layoutTests(browser, results);
    const report = { ok: true, tests: results };
    fs.writeFileSync(path.join(artifactRoot, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
