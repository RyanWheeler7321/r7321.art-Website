import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, "src", "images");
const placeholderRoot = path.join(repoRoot, "src", "generated", "placeholders");
const manifestPath = path.join(repoRoot, "src", "_data", "imageManifest.json");
const supported = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

function identifySize(filePath) {
  const output = execFileSync("magick", ["identify", "-ping", "-format", "%w %h", filePath], {
    encoding: "utf8"
  }).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  return { width, height };
}

function buildPlaceholder(sourcePath, outputPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  const inputArg = ext === ".gif" ? `${sourcePath}[0]` : sourcePath;
  execFileSync(
    "magick",
    [
      inputArg,
      "-auto-orient",
      "-strip",
      "-resize",
      "64x64>",
      "-quality",
      "26",
      outputPath
    ],
    { stdio: "ignore" }
  );
}

await ensureDir(placeholderRoot);
const allFiles = (await walk(imagesRoot)).filter((file) => supported.has(path.extname(file).toLowerCase()));
const manifest = {};

for (const file of allFiles) {
  const relFromImages = path.relative(imagesRoot, file);
  const relPosix = relFromImages.replace(/\\/g, "/");
  const publicPath = `/images/${relPosix}`;
  const placeholderRel = relPosix.replace(/\.[^.]+$/, ".webp");
  const placeholderAbs = path.join(placeholderRoot, placeholderRel);
  const placeholderPublic = `/generated/placeholders/${placeholderRel.replace(/\\/g, "/")}`;

  await ensureDir(path.dirname(placeholderAbs));
  const { width, height } = identifySize(file);
  buildPlaceholder(file, placeholderAbs);

  manifest[publicPath] = {
    width,
    height,
    placeholder: placeholderPublic
  };
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
