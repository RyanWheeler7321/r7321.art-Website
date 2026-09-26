import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "dist");
const manifestPath = path.join(repoRoot, "src", "_data", "imageManifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function fail(messages) {
  if (!messages.length) return;
  throw new Error(`Media audit failed:\n- ${messages.join("\n- ")}`);
}

const problems = [];
const htmlFiles = (await walk(distRoot)).filter((file) => file.endsWith(".html"));
let wrappers = 0;
const referenced = new Set();

for (const file of htmlFiles) {
  const relative = path.relative(distRoot, file).replace(/\\/g, "/");
  const html = await fs.readFile(file, "utf8");
  if (/(?:src|srcset|poster)=["'][^"']*\/images\/[^"']+\.(?:png|jpe?g|webp|gif)(?:\?[^"']*)?["']/i.test(html)) {
    problems.push(`${relative} renders an unprocessed local raster source`);
  }

  const pageWrappers = html.match(/data-r7-media(?:=|\s|>)/g) || [];
  wrappers += pageWrappers.length;
  const highPriority = html.match(/data-media-priority="high"/g) || [];
  if (highPriority.length > 1) problems.push(`${relative} declares ${highPriority.length} high-priority media items`);

  for (const tag of html.match(/<span\b[^>]*data-r7-media[^>]*>/g) || []) {
    if (!/data-media-key="[^"]+"/.test(tag)) problems.push(`${relative} has managed media without a source key`);
    if (!/style="[^"]*aspect-ratio:[^;"]+/.test(tag)) problems.push(`${relative} has managed media without intrinsic aspect ratio`);
    if (!/data:image\/webp;base64,/.test(tag)) problems.push(`${relative} has managed media without an inline preview`);
  }

  const inlineBytes = [...html.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)]
    .reduce((total, match) => total + Math.ceil(match[1].length * 0.75), 0);
  if (inlineBytes > 60 * 1024) problems.push(`${relative} exceeds the 60 KB inline preview budget (${inlineBytes} bytes)`);

  for (const match of html.matchAll(/\/generated\/media\/[^\s"'&<>)}]+/g)) referenced.add(decodeURIComponent(match[0]));
}

for (const file of (await walk(path.join(distRoot, "assets"))).filter((item) => item.endsWith(".css"))) {
  const css = await fs.readFile(file, "utf8");
  if (/url\([^)]*\/images\/[^)]*\.(?:png|jpe?g|webp|gif)/i.test(css)) {
    problems.push(`${path.relative(distRoot, file).replace(/\\/g, "/")} references an unprocessed local raster source`);
  }
}

for (const url of referenced) {
  const file = path.join(distRoot, url.replace(/^\//, ""));
  if (!(await pathExists(file))) problems.push(`rendered URL is missing from dist: ${url}`);
}

const publishedRasters = (await walk(path.join(distRoot, "images")))
  .filter((file) => /\.(?:png|jpe?g|webp|gif)$/i.test(file));
if (publishedRasters.length) problems.push(`dist/images still contains ${publishedRasters.length} original raster file(s)`);

const sourceFiles = new Map();
for (const [key, entry] of Object.entries(manifest.entries || {})) {
  for (const variant of [entry.poster, ...(entry.images || []), ...(entry.videos || [])].filter(Boolean)) {
    sourceFiles.set(variant.url, variant);
  }
}
for (const [url, variant] of sourceFiles) {
  const file = path.join(repoRoot, "src", url.replace(/^\//, ""));
  if (!(await pathExists(file))) {
    problems.push(`manifest variant is missing: ${url}`);
    continue;
  }
  const data = await fs.readFile(file);
  if (data.length !== variant.bytes) problems.push(`manifest byte count is stale: ${url}`);
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  if (hash !== variant.hash) problems.push(`manifest content hash is stale: ${url}`);
}

fail(problems);
process.stdout.write(`Audited ${htmlFiles.length} pages, ${wrappers} managed media instances, and ${referenced.size} public media files.\n`);
