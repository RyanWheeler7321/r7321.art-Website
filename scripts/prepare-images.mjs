import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, "src", "images");
const placeholderRoot = path.join(repoRoot, "src", "generated", "placeholders");
const loopRoot = path.join(repoRoot, "src", "generated", "loops");
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
  const ext = path.extname(filePath).toLowerCase();
  const inputArg = ext === ".gif" ? `${filePath}[0]` : filePath;
  const output = execFileSync("magick", ["identify", "-ping", "-format", "%w %h", inputArg], {
    encoding: "utf8"
  }).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  return { width, height };
}

function getPlaceholderSettings(relPosix) {
  if (relPosix === "brand/headerimage.png") {
    return { width: 1280, quality: 64 };
  }

  if (relPosix.startsWith("projects/")) {
    return { width: 420, quality: 50 };
  }

  return { width: 420, quality: 40 };
}

function buildPlaceholder(sourcePath, outputPath, relPosix) {
  const ext = path.extname(sourcePath).toLowerCase();
  const inputArg = ext === ".gif" ? `${sourcePath}[0]` : sourcePath;
  const settings = getPlaceholderSettings(relPosix);
  execFileSync(
    "magick",
    [
      inputArg,
      "-auto-orient",
      "-strip",
      "-resize",
      `${settings.width}x`,
      "-quality",
      String(settings.quality),
      outputPath
    ],
    { stdio: "ignore" }
  );
}

await ensureDir(placeholderRoot);
await ensureDir(loopRoot);
const allFiles = (await walk(imagesRoot)).filter((file) => supported.has(path.extname(file).toLowerCase()));
const manifest = {};

function buildLoopVideos(sourcePath, relPosix) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext !== ".gif" || !relPosix.startsWith("projects/")) {
    return null;
  }

  const baseRel = relPosix.replace(/\.[^.]+$/, "");
  const previewAbs = path.join(loopRoot, `${baseRel}-preview.mp4`);
  const fullAbs = path.join(loopRoot, `${baseRel}-full.mp4`);

  return {
    previewAbs,
    fullAbs,
    previewPublic: `/generated/loops/${baseRel}-preview.mp4`,
    fullPublic: `/generated/loops/${baseRel}-full.mp4`
  };
}

function ensureParentFor(filePath) {
  return ensureDir(path.dirname(filePath));
}

function buildVideoVariant(sourcePath, outputPath, width, crf) {
  const safeWidth = width % 2 === 0 ? width : width - 1;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sourcePath,
      "-movflags",
      "+faststart",
      "-an",
      "-vf",
      `fps=24,scale=${safeWidth}:-2:flags=lanczos`,
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(crf),
      outputPath
    ],
    { stdio: "ignore" }
  );
}

for (const file of allFiles) {
  const relFromImages = path.relative(imagesRoot, file);
  const relPosix = relFromImages.replace(/\\/g, "/");
  const publicPath = `/images/${relPosix}`;
  const placeholderRel = relPosix.replace(/\.[^.]+$/, ".webp");
  const placeholderAbs = path.join(placeholderRoot, placeholderRel);
  const placeholderPublic = `/generated/placeholders/${placeholderRel.replace(/\\/g, "/")}`;
  const loopInfo = buildLoopVideos(file, relPosix);

  await ensureDir(path.dirname(placeholderAbs));
  const { width, height } = identifySize(file);
  buildPlaceholder(file, placeholderAbs, relPosix);
  if (loopInfo) {
    await ensureParentFor(loopInfo.previewAbs);
    await ensureParentFor(loopInfo.fullAbs);
    buildVideoVariant(file, loopInfo.previewAbs, 220, 38);
    buildVideoVariant(file, loopInfo.fullAbs, Math.min(width, 720), 26);
  }

  manifest[publicPath] = {
    width,
    height,
    placeholder: placeholderPublic,
    ...(loopInfo
      ? {
          previewVideo: loopInfo.previewPublic,
          fullVideo: loopInfo.fullPublic
        }
      : {})
  };
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
