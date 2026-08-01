import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, "src", "images");
const generatedRoot = path.join(repoRoot, "src", "generated", "media");
const manifestPath = path.join(repoRoot, "src", "_data", "imageManifest.json");
const localRoot = path.join(repoRoot, "local");
const lockPath = path.join(localRoot, "media-build.lock");
const verifyOnly = process.argv.includes("--verify-only");
const supported = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const schemaVersion = 2;
const recipeVersion = "2026-08-01-media-v4";

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return !result.error && result.status === 0;
}

if (!commandExists("python", ["--version"])) {
  throw new Error("Python is required for media preparation.");
}
if (!verifyOnly && !commandExists("ffmpeg", ["-version"])) {
  throw new Error("FFmpeg is required for animated media preparation.");
}

function runImageTool(args, options = {}) {
  return execFileSync("python", [path.join(repoRoot, "scripts", "image_tool.py"), ...args], options);
}

function ffmpegUsesWindowsPaths() {
  try {
    const version = execFileSync("ffmpeg", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return version.includes("gyan.dev") || version.includes("full_build-www.gyan.dev");
  } catch {
    return false;
  }
}

const ffmpegNeedsWindowsPaths = ffmpegUsesWindowsPaths();

function toMediaPath(filePath) {
  if (!ffmpegNeedsWindowsPaths || !filePath.startsWith("/mnt/")) {
    return filePath;
  }
  return execFileSync("wslpath", ["-w", filePath], { encoding: "utf8" }).trim();
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function omitGitIgnored(files) {
  if (!files.length) return files;
  const relativePaths = files.map((file) => path.relative(repoRoot, file).replace(/\\/g, "/"));
  const result = spawnSync("git", ["check-ignore", "--stdin", "-z"], {
    cwd: repoRoot,
    input: `${relativePaths.join("\0")}\0`,
    encoding: "utf8"
  });
  if (result.error || ![0, 1].includes(result.status)) return files;
  const ignored = new Set(result.stdout.split("\0").filter(Boolean));
  return files.filter((file, index) => !ignored.has(relativePaths[index]));
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

async function inspectImage(filePath) {
  return JSON.parse(runImageTool(["inspect", filePath], { encoding: "utf8" }));
}

async function inspectDimensions(filePath) {
  const output = runImageTool(["identify", filePath], { encoding: "utf8" }).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  return { width, height };
}

function publicUrl(relativePath) {
  return `/generated/media/${relativePath.replace(/\\/g, "/")}`;
}

function variantFilePath(variant) {
  return path.join(repoRoot, "src", variant.url.replace(/^\//, ""));
}

function entryVariants(entry) {
  return [entry.poster, ...(entry.images || []), ...(entry.videos || [])].filter(Boolean);
}

async function verifyVariant(variant, label) {
  const filePath = variantFilePath(variant);
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) throw new Error(`${label}: missing generated file ${variant.url}`);
  if (stat.size !== variant.bytes) throw new Error(`${label}: byte mismatch for ${variant.url}`);
  const hash = await sha256File(filePath);
  if (hash !== variant.hash) throw new Error(`${label}: hash mismatch for ${variant.url}`);
}

async function verifyEntry(entry, key, sourcePath = "") {
  if (!entry || !["still", "loop"].includes(entry.type)) throw new Error(`${key}: invalid media type`);
  if (!Number.isFinite(entry.width) || !Number.isFinite(entry.height) || entry.width < 1 || entry.height < 1) {
    throw new Error(`${key}: invalid intrinsic dimensions`);
  }
  if (!entry.lqip?.startsWith("data:image/webp;base64,")) throw new Error(`${key}: missing inline WebP preview`);
  if (!/^#[0-9a-f]{6}$/i.test(entry.dominantColor || "")) throw new Error(`${key}: invalid dominant color`);
  if (entry.type === "still" && !entry.images?.length) throw new Error(`${key}: missing responsive image variants`);
  if (entry.type === "loop" && (!entry.poster || !entry.videos?.length)) throw new Error(`${key}: missing poster or video variants`);
  for (const variant of entryVariants(entry)) await verifyVariant(variant, key);
  if (sourcePath && await pathExists(sourcePath)) {
    const sourceHash = await sha256File(sourcePath);
    if (sourceHash !== entry.sourceHash) throw new Error(`${key}: source hash is stale; run npm run media:prepare`);
  }
}

async function loadManifest(required = false) {
  if (!(await pathExists(manifestPath))) {
    if (required) throw new Error("Media manifest is missing; run npm run media:prepare from the website repo.");
    return null;
  }
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== schemaVersion || manifest.recipeVersion !== recipeVersion || !manifest.entries) {
    if (required) throw new Error("Media manifest schema/recipe is stale; run npm run media:prepare.");
    return null;
  }
  return manifest;
}

async function acquireLock() {
  await fs.mkdir(localRoot, { recursive: true });
  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(`${process.pid}\n`);
    await handle.close();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existingPid = Number.parseInt((await fs.readFile(lockPath, "utf8").catch(() => "0")).trim(), 10);
    let active = false;
    if (existingPid > 0) {
      try {
        process.kill(existingPid, 0);
        active = true;
      } catch {
        active = false;
      }
    }
    if (active) throw new Error(`Media preparation is already running as PID ${existingPid}.`);
    await fs.rm(lockPath, { force: true });
    return acquireLock();
  }
}

async function writeManifest(manifest) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const temporary = `${manifestPath}.tmp-${process.pid}`;
  await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.rename(temporary, manifestPath);
}

function imageQuality(relPosix) {
  if (relPosix === "brand/headerimage.png") return 84;
  if (relPosix.startsWith("tools/") || relPosix.startsWith("updates/")) return 84;
  return 82;
}

async function finalizeVariant(tempPath, relDir, stem, role, mime) {
  const hash = await sha256File(tempPath);
  const extension = mime === "video/mp4" ? ".mp4" : ".webp";
  const filename = `${stem}.${role}.${hash.slice(0, 12)}${extension}`;
  const relative = path.posix.join(relDir, filename);
  const finalPath = path.join(generatedRoot, relative);
  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  if (!(await pathExists(finalPath))) await fs.copyFile(tempPath, finalPath);
  const stat = await fs.stat(finalPath);
  return { url: publicUrl(relative), mime, bytes: stat.size, hash };
}

async function buildWebp(sourcePath, tempRoot, relPosix, role, width, quality, frame = 0) {
  const baseRel = relPosix.replace(/\.[^.]+$/, "");
  const relDir = path.posix.dirname(baseRel) === "." ? "" : path.posix.dirname(baseRel);
  const stem = path.posix.basename(baseRel);
  const tempPath = path.join(tempRoot, `${stem}-${role}.webp`);
  runImageTool([
    "resize", sourcePath, tempPath,
    "--width", String(width),
    "--quality", String(quality),
    "--frame", String(frame)
  ], { stdio: "ignore" });
  const dimensions = await inspectDimensions(tempPath);
  return { ...(await finalizeVariant(tempPath, relDir, stem, role, "image/webp")), ...dimensions };
}

function buildVideo(sourcePath, outputPath, width, fps) {
  const safeWidth = Math.max(2, width % 2 === 0 ? width : width - 1);
  execFileSync("ffmpeg", [
    "-y",
    "-i", toMediaPath(sourcePath),
    "-movflags", "+faststart",
    "-an",
    "-vf", `fps=${fps.toFixed(3)},scale=${safeWidth}:-2:flags=lanczos`,
    "-pix_fmt", "yuv420p",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "26",
    toMediaPath(outputPath)
  ], { stdio: "ignore" });
}

function probeVideo(filePath) {
  const output = execFileSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json",
    toMediaPath(filePath)
  ], { encoding: "utf8" });
  const result = JSON.parse(output);
  return {
    width: Number(result.streams?.[0]?.width || 0),
    height: Number(result.streams?.[0]?.height || 0),
    durationMs: Math.round(Number(result.format?.duration || 0) * 1000)
  };
}

async function buildVideoVariant(sourcePath, tempRoot, relPosix, width, fps) {
  const baseRel = relPosix.replace(/\.[^.]+$/, "");
  const relDir = path.posix.dirname(baseRel) === "." ? "" : path.posix.dirname(baseRel);
  const stem = path.posix.basename(baseRel);
  const role = `loop-w${width}`;
  const tempPath = path.join(tempRoot, `${stem}-${role}.mp4`);
  buildVideo(sourcePath, tempPath, width, fps);
  return { ...(await finalizeVariant(tempPath, relDir, stem, role, "video/mp4")), ...probeVideo(tempPath) };
}

async function buildEntry(sourcePath, relPosix, sourceHash, inspection, tempRoot) {
  const sourceStat = await fs.stat(sourcePath);
  const lqipTemp = path.join(tempRoot, `${path.basename(relPosix)}-lqip.webp`);
  runImageTool(["resize", sourcePath, lqipTemp, "--width", "24", "--quality", "38", "--frame", "0"], { stdio: "ignore" });
  const lqip = `data:image/webp;base64,${(await fs.readFile(lqipTemp)).toString("base64")}`;
  const base = {
    type: inspection.animated ? "loop" : "still",
    sourceFormat: path.extname(relPosix).slice(1).toLowerCase(),
    sourceHash,
    sourceBytes: sourceStat.size,
    width: inspection.width,
    height: inspection.height,
    alpha: Boolean(inspection.alpha),
    dominantColor: inspection.dominantColor,
    lqip
  };

  if (!inspection.animated) {
    const targets = [...new Set([Math.min(720, inspection.width), Math.min(1400, inspection.width)])].sort((a, b) => a - b);
    const images = [];
    for (const width of targets) {
      images.push(await buildWebp(sourcePath, tempRoot, relPosix, `image-w${width}`, width, imageQuality(relPosix)));
    }
    return { ...base, images };
  }

  const poster = await buildWebp(sourcePath, tempRoot, relPosix, "poster", Math.min(420, inspection.width), 58, 0);
  const fps = 24;
  const videoTargets = [...new Set([Math.min(360, inspection.width), inspection.width])].sort((a, b) => a - b);
  const videos = [];
  for (const width of videoTargets) videos.push(await buildVideoVariant(sourcePath, tempRoot, relPosix, width, fps));
  return {
    ...base,
    frameCount: inspection.frameCount,
    durationMs: inspection.durationMs,
    fps: Number(fps.toFixed(3)),
    poster,
    videos
  };
}

async function verifyManifest() {
  const manifest = await loadManifest(true);
  for (const [key, entry] of Object.entries(manifest.entries)) {
    const sourcePath = path.join(repoRoot, "src", key.replace(/^\//, ""));
    await verifyEntry(entry, key, sourcePath);
  }
  process.stdout.write(`Verified ${Object.keys(manifest.entries).length} media entries.\n`);
}

async function prepareManifest() {
  await fs.mkdir(generatedRoot, { recursive: true });
  const previous = await loadManifest(false);
  const tempRoot = path.join(localRoot, `media-build-${process.pid}`);
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(tempRoot, { recursive: true });
  try {
    const files = omitGitIgnored(await walk(imagesRoot))
      .filter((file) => supported.has(path.extname(file).toLowerCase()))
      .sort((left, right) => left.localeCompare(right));
    const entries = {};
    let reused = 0;
    let generated = 0;

    for (const file of files) {
      const relPosix = path.relative(imagesRoot, file).replace(/\\/g, "/");
      const key = `/images/${relPosix}`;
      const sourceHash = await sha256File(file);
      const prior = previous?.entries?.[key];
      if (prior?.sourceHash === sourceHash) {
        try {
          await verifyEntry(prior, key, file);
          entries[key] = prior;
          reused += 1;
          continue;
        } catch {
        }
      }
      const inspection = await inspectImage(file);
      entries[key] = await buildEntry(file, relPosix, sourceHash, inspection, tempRoot);
      generated += 1;
    }

    const manifest = { schemaVersion, recipeVersion, entries };
    await writeManifest(manifest);
    for (const [key, entry] of Object.entries(entries)) await verifyEntry(entry, key);
    process.stdout.write(`Prepared ${files.length} media entries (${generated} generated, ${reused} reused).\n`);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

await acquireLock();
try {
  if (verifyOnly) await verifyManifest();
  else await prepareManifest();
} finally {
  await fs.rm(lockPath, { force: true });
}
