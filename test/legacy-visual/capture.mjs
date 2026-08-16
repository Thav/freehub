import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL || "http://legacy:3000";
const output = path.resolve(process.argv[2] || "tmp/legacy-baseline-candidate");
const selection = process.argv[3] || "";
const requestedIds = new Set(selection.startsWith("from:") ? [] : selection.split(",").filter(Boolean));
const manifestPath = "/capture/manifest.json";
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes);

if (!output.startsWith("/work/tmp/")) {
  throw new Error(`capture output must be below /work/tmp, got ${output}`);
}

await mkdir(path.join(output, "screenshots"), { recursive: true });
await mkdir(path.join(output, "downloads"), { recursive: true });

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const accounts = {
  manager: ["fixture_manager", "fixture-password"],
  empty_manager: ["fixture_empty", "fixture-password"],
  observer: ["fixture_observer", "fixture-password"]
};

function easternDate(deltaDays = 0) {
  const instant = new Date(Date.now() + deltaDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(instant);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

const today = easternDate();
const yesterday = easternDate(-1);
const tomorrow = easternDate(1);
function expandRoute(route) {
  return route
    .replaceAll("{today.year}", today.year)
    .replaceAll("{today.month}", today.month)
    .replaceAll("{today.day}", today.day)
    .replaceAll("{yesterday.year}", yesterday.year)
    .replaceAll("{yesterday.month}", yesterday.month)
    .replaceAll("{yesterday.day}", yesterday.day)
    .replaceAll("{tomorrow.year}", tomorrow.year)
    .replaceAll("{tomorrow.month}", tomorrow.month)
    .replaceAll("{tomorrow.day}", tomorrow.day);
}

const expandValue = expandRoute;

const ids = new Set();
for (const capture of manifest.captures) {
  if (ids.has(capture.id)) throw new Error(`duplicate capture id: ${capture.id}`);
  ids.add(capture.id);
  for (const required of ["id", "area", "title", "auth", "route", "fixture", "steps"]) {
    if (capture[required] === undefined) throw new Error(`${capture.id} lacks ${required}`);
  }
  if ((capture.kind || "screenshot") === "screenshot" && !capture.screenshot) {
    throw new Error(`${capture.id} lacks screenshot`);
  }
}

const browser = await chromium.launch({ headless: true });
const evidence = {
  schemaVersion: 1,
  manifestSha256: sha256(manifestBytes),
  baseOrigin: new URL(baseURL).origin,
  viewport: manifest.viewport,
  results: []
};

async function preparePage(auth) {
  const context = await browser.newContext({
    viewport: manifest.viewport,
    acceptDownloads: true,
    locale: "en-US",
    timezoneId: "America/New_York",
    colorScheme: "light",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL).origin || ["data:", "about:"].includes(url.protocol)) {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  if (auth !== "none") {
    const [login, password] = accounts[auth] || [];
    if (!login) throw new Error(`unknown auth fixture: ${auth}`);
    await page.goto(`${baseURL}/session/new`, { waitUntil: "networkidle" });
    await page.locator("#login").fill(login);
    await page.locator("#password").fill(password);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.locator("input[type=submit]").click()
    ]);
  }
  return { context, page };
}

async function perform(page, action) {
  const locator = page.locator(action.selector);
  switch (action.type) {
    case "fill":
      await locator.fill(expandValue(action.value));
      break;
    case "type":
      await locator.pressSequentially(action.value, { delay: action.delay || 100 });
      break;
    case "click":
      await locator.click();
      break;
    case "clickAndWait":
      await Promise.all([page.waitForLoadState("networkidle"), locator.click()]);
      break;
    case "addHidden":
      await page.locator(action.form).evaluate((form, input) => {
        const element = document.createElement("input");
        element.type = "hidden";
        element.name = input.name;
        element.value = input.value;
        form.appendChild(element);
      }, { name: action.name, value: expandValue(action.value) });
      break;
    case "appendQuery":
      await locator.evaluate((element, query) => {
        element.href += `${element.href.includes("?") ? "&" : "?"}${query}`;
      }, action.query);
      break;
    case "waitFor":
      await locator.first().waitFor({ state: "visible" });
      break;
    default:
      throw new Error(`unsupported action type: ${action.type}`);
  }
}

async function assertPage(capture, page) {
  const visibleText = await page.locator("body").innerText();
  const controlText = await page.locator("input:not([type=hidden]), button, select, textarea").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const values = [element.value, element.getAttribute("aria-label"), element.getAttribute("title")];
      if (element instanceof HTMLSelectElement) values.push(...Array.from(element.options, (option) => option.textContent));
      return values.filter(Boolean);
    }).join(" ")
  );
  const body = `${visibleText} ${controlText}`.replace(/\s+/g, " ");
  for (const label of capture.labels || []) {
    if (!body.includes(label)) {
      throw new Error(`${capture.id}: missing expected label ${JSON.stringify(label)}; rendered text: ${body.slice(0, 1200)}`);
    }
  }
  for (const label of capture.forbiddenLabels || []) {
    if (body.includes(label)) throw new Error(`${capture.id}: found forbidden label ${JSON.stringify(label)}`);
  }
  return body;
}

try {
  const fromId = selection.startsWith("from:") ? selection.slice(5) : null;
  const fromIndex = fromId ? manifest.captures.findIndex((capture) => capture.id === fromId) : 0;
  if (fromId && fromIndex < 0) throw new Error(`requested start capture does not exist: ${fromId}`);
  const selectedCaptures = requestedIds.size
    ? manifest.captures.filter((capture) => requestedIds.has(capture.id))
    : manifest.captures.slice(fromIndex);
  if (requestedIds.size && selectedCaptures.length !== requestedIds.size) {
    throw new Error("one or more requested capture IDs do not exist");
  }
  for (const capture of selectedCaptures) {
    const { context, page } = await preparePage(capture.auth);
    try {
      const response = await page.goto(`${baseURL}${expandRoute(capture.route)}`, { waitUntil: "networkidle" });
      const expectedStatus = capture.expectedStatus || 200;
      if (!response || response.status() !== expectedStatus) {
        throw new Error(`${capture.id}: route returned ${response ? response.status() : "no response"}, expected ${expectedStatus}`);
      }
      for (const action of capture.actions || []) await perform(page, action);
      const body = await assertPage(capture, page);

      if ((capture.kind || "screenshot") === "download") {
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          page.locator(capture.downloadSelector).click()
        ]);
        const suggested = download.suggestedFilename();
        const downloadPath = path.join(output, "downloads", `${capture.id}.csv`);
        await download.saveAs(downloadPath);
        const contents = await readFile(downloadPath);
        const header = contents.toString("utf8").split(/\r?\n/, 1)[0];
        for (const field of capture.headerIncludes) {
          if (!header.includes(field)) throw new Error(`${capture.id}: CSV header lacks ${field}`);
        }
        evidence.results.push({
          id: capture.id,
          kind: "download",
          status: response.status(),
          suggestedFilename: suggested,
          header,
          bytes: contents.length,
          sha256: sha256(contents)
        });
      } else if ((capture.kind || "screenshot") === "probe") {
        evidence.results.push({
          id: capture.id,
          kind: "probe",
          status: response.status(),
          finalPath: new URL(page.url()).pathname,
          labels: capture.labels || [],
          bodySha256: sha256(body)
        });
      } else {
        await page.locator("img").evaluateAll((images) => Promise.all(images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })));
        await page.evaluate(() => document.activeElement?.blur());
        await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; } #application_footer { background: none !important; } #visits td.when, img[src*='.gif'] { visibility: hidden !important; }" });
        const screenshotPath = path.join(output, "screenshots", capture.screenshot);
        const bytes = await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
        evidence.results.push({
          id: capture.id,
          kind: "screenshot",
          status: response.status(),
          finalPath: new URL(page.url()).pathname,
          labels: capture.labels || [],
          screenshot: capture.screenshot,
          bytes: bytes.length,
          sha256: sha256(bytes)
        });
      }
    } finally {
      await context.close();
    }
  }

  const sheetContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const sheet = await sheetContext.newPage();
  const screenshotResults = evidence.results.filter((result) => result.kind === "screenshot");
  const cards = await Promise.all(screenshotResults.map(async (result) => {
    const bytes = await readFile(path.join(output, "screenshots", result.screenshot));
    return `<figure><img src="data:image/png;base64,${bytes.toString("base64")}"><figcaption>${result.id}</figcaption></figure>`;
  }));
  await sheet.setContent(`<style>body{font:14px sans-serif;margin:16px;background:#ddd}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0;padding:8px;background:white}img{width:100%;height:260px;object-fit:contain;object-position:top;border:1px solid #aaa}figcaption{padding-top:6px;font-weight:bold}</style><main>${cards.join("")}</main>`);
  await sheet.screenshot({ path: path.join(output, "contact-sheet.png"), fullPage: true });
  await sheetContext.close();

  await writeFile(path.join(output, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(path.join(output, "manifest.json"), manifestBytes);
  const review = {
    schemaVersion: 1,
    manifestSha256: evidence.manifestSha256,
    reviewer: "REQUIRED",
    reviewedAt: "YYYY-MM-DDTHH:MM:SSZ",
    reviewMethod: "Contact sheet plus every full-resolution PNG",
    entries: evidence.results
      .filter((result) => result.kind === "screenshot")
      .map((result) => ({
        id: result.id,
        decision: "pending",
        personalDataFinding: "REQUIRED"
      }))
  };
  await writeFile(path.join(output, "personal-data-review.json"), `${JSON.stringify(review, null, 2)}\n`);
  process.stdout.write(`captured ${evidence.results.length} manifest entries in ${output}\n`);
} finally {
  await browser.close();
}
