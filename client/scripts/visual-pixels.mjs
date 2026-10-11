import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { PNG } = require(
  resolve(dirname(require.resolve("playwright-core")), "lib/utilsBundle.js"),
);

export function comparePixels(before, after, brandWidth = 0) {
  const a = PNG.sync.read(before),
    b = PNG.sync.read(after);
  if (a.width !== b.width || a.height !== b.height)
    return { equivalent: false, dimensionsMatch: false };
  let changedPixels = 0,
    maxChannelDelta = 0;
  for (let offset = 0; offset < a.data.length; offset += 4) {
    const x = (offset / 4) % a.width,
      y = Math.floor(offset / 4 / a.width);
    // The approved symbol/wordmark replacement includes its old shadow and modal blur.
    if (x < brandWidth && y < 80) continue;
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(
        a.data[offset + channel] - b.data[offset + channel],
      );
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      if (delta) changed = true;
    }
    if (changed) changedPixels++;
  }
  return {
    equivalent: maxChannelDelta <= 2,
    dimensionsMatch: true,
    changedPixels,
    maxChannelDelta,
    excludedBrandArea: { width: brandWidth, height: 80 },
  };
}
