import { readFile, writeFile } from "node:fs/promises";
import { comparePixels } from "./visual-pixels.mjs";

const directory = ".local/tailwind-parity";
const report = JSON.parse(await readFile(`${directory}/report.json`, "utf8"));
for (const sample of report.samples) {
  const baseline = JSON.parse(
    await readFile(`${directory}/${sample.label}.json`, "utf8"),
  );
  const sidebar = baseline.find((element) => element.classes === "sidebar");
  sample.screenshotComparison = comparePixels(
    await readFile(`${directory}/${sample.label}-before.png`),
    await readFile(`${directory}/${sample.label}-after.png`),
    sidebar?.rect[2] || 0,
  );
  console.log(
    `${sample.label}: styles ${sample.computedStylesIdentical ? "identical" : "DIFFER"}, screenshots ${sample.screenshotComparison.equivalent ? "match" : "DIFFER"}`,
  );
}
await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
if (
  report.diffs.length ||
  report.samples.some(
    (sample) =>
      !sample.computedStylesIdentical ||
      !sample.screenshotComparison.equivalent,
  )
)
  process.exitCode = 1;
