import { chromium } from "@playwright/test";
import axios from "axios";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { comparePixels } from "./visual-pixels.mjs";

const mode = process.argv[2];
if (!["before", "after"].includes(mode))
  throw Error("Usage: node scripts/check-visual-parity.mjs before|after");
const directory = ".local/tailwind-parity";
await mkdir(directory, { recursive: true });
let fixture;
if (mode === "before") {
  try {
    const email = `visual-${Date.now()}@example.test`;
    const auth = await axios.post("http://127.0.0.1:4000/api/auth/register", {name:"Alex Morgan",businessName:"Evergreen Studio",email,password:"VisualTest123!"});
    const response = await axios.get("http://127.0.0.1:4000/api/workspace", {headers:{Authorization:`Bearer ${auth.data.token}`}});
    fixture = response.data;
  } catch {
    throw Error("Start the API with JWT_SECRET configured before capturing visual parity.");
  }
  await writeFile(`${directory}/workspace.json`, JSON.stringify(fixture));
} else
  fixture = JSON.parse(await readFile(`${directory}/workspace.json`, "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
await context.addInitScript(() => localStorage.setItem("opsdesk-jwt", "visual-fixture-token"));
await context.route("**/api/workspace", (route) =>
  route.fulfill({ json: fixture }),
);
// Use a consistent system fallback so network-dependent font availability cannot invalidate comparisons.
await context.route("https://fonts.googleapis.com/**", (route) =>
  route.abort(),
);
await context.route("https://fonts.gstatic.com/**", (route) => route.abort());
const page = await context.newPage();
const quick = process.argv.includes("--quick");
const target = process.argv
  .find((argument) => argument.startsWith("--sample="))
  ?.slice(9);
const allPages = [
  "Overview",
  "Customers",
  "Schedule",
  "Team & tasks",
  "Conversations",
  "Approvals",
  "Agent activity",
  "Settings",
];
const targetPage =
  target &&
  allPages.find(
    (name) =>
      `${target.split("-")[0]}-${name.replaceAll(/[^a-zA-Z]/g, "-")}` ===
      target,
  );
const pages = targetPage ? [targetPage] : quick ? ["Overview"] : allPages;
const samples = [];
const diffs = [];
async function capture(label) {
  if (target && label !== target) return;
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const styles = await page.evaluate(() => {
    const elements = [
      document.documentElement,
      document.body,
      ...document.querySelectorAll("#root *"),
    ];
    return elements
      .filter((element) => !element.closest(".brand"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const values = {};
        for (const pseudo of [null, "::before", "::after"]) {
          const style = getComputedStyle(element, pseudo);
          const computed = {};
          for (const property of style)
            if (!property.startsWith("--"))
              computed[property] = style.getPropertyValue(property);
          values[pseudo || "element"] = computed;
        }
        return {
          tag: element.tagName,
          classes: element.getAttribute("class"),
          rect: [rect.x, rect.y, rect.width, rect.height],
          values,
        };
      });
  });
  const path = `${directory}/${label}`;
  await page.screenshot({
    path: `${path}-${mode}.png`,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    mask: [page.locator(".brand")],
  });
  if (mode === "before")
    await writeFile(`${path}.json`, JSON.stringify(styles));
  else {
    const previous = JSON.parse(await readFile(`${path}.json`, "utf8"));
    const identical = isDeepStrictEqual(styles, previous);
    const pixels = comparePixels(
      await readFile(`${path}-before.png`),
      await readFile(`${path}-after.png`),
      previous.find((element) => element.classes === "sidebar")?.rect[2] || 0,
    );
    if (!identical) {
      for (
        let index = 0;
        index < Math.max(previous.length, styles.length);
        index++
      ) {
        if (isDeepStrictEqual(previous[index], styles[index])) continue;
        const changes = [];
        const old = previous[index],
          current = styles[index];
        if (!old || !current) {
          changes.push("Element count changed");
        } else {
          if (!isDeepStrictEqual(old.rect, current.rect))
            changes.push({ rectBefore: old.rect, rectAfter: current.rect });
          for (const pseudo of Object.keys(old.values))
            for (const property of Object.keys(old.values[pseudo]))
              if (
                old.values[pseudo][property] !==
                current.values[pseudo]?.[property]
              )
                changes.push({
                  pseudo,
                  property,
                  before: old.values[pseudo][property],
                  after: current.values[pseudo]?.[property],
                });
        }
        diffs.push({
          label,
          index,
          tag: current?.tag,
          classes: current?.classes,
          changes,
        });
      }
    }
    console.log(
      `${label}: computed styles ${identical ? "IDENTICAL" : "DIFFER"}, screenshots ${pixels.equivalent ? "MATCH" : "DIFFER"} (${pixels.changedPixels ?? "unknown"} pixels; max channel delta ${pixels.maxChannelDelta ?? "unknown"})`,
    );
    samples.push({
      label,
      computedStylesIdentical: identical,
      screenshotComparison: pixels,
    });
  }
}
try {
  for (const width of target
    ? [Number(target.split("-")[0])]
    : quick
      ? [1766]
      : [1766, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:5173/app");
    await page
      .getByRole("heading", { name: "Your business, in motion." })
      .waitFor();
    for (const name of pages) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name, exact: true })
        .click();
      await capture(`${width}-${name.replaceAll(/[^a-zA-Z]/g, "-")}`);
    }
    if (quick || (target && !target.endsWith("request-dialog"))) continue;
    await page
      .getByRole("button", { name: "Ask OpsDesk", exact: false })
      .first()
      .click();
    await capture(`${width}-request-dialog`);
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
  for (const width of quick || target
    ? []
    : [580, 620, 768, 850, 1100, 1300, 1600]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
    await capture(`${width}-Overview`);
  }
  if (mode === "after") {
    let report = { samples, diffs };
    if (target) {
      const previous = JSON.parse(
        await readFile(`${directory}/report.json`, "utf8"),
      );
      report = {
        samples: [
          ...previous.samples.filter((sample) => sample.label !== target),
          ...samples,
        ],
        diffs: [
          ...previous.diffs.filter((diff) => diff.label !== target),
          ...diffs,
        ],
      };
    }
    await writeFile(
      `${directory}/report.json`,
      JSON.stringify(report, null, 2),
    );
    if (
      diffs.length ||
      samples.some((sample) => !sample.screenshotComparison.equivalent)
    ) {
      console.log(JSON.stringify(diffs.slice(0, 10), null, 2));
      process.exitCode = 1;
    }
  } else
    console.log("Saved baseline for 34 page, dialog, and responsive samples.");
} finally {
  await browser.close();
}
