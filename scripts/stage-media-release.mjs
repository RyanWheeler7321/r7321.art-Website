import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const targetArg = process.argv[2];
if (!targetArg) throw new Error("Usage: node scripts/stage-media-release.mjs <clean-release-source>");

const targetRoot = path.resolve(repoRoot, targetArg);
const targetPackage = path.join(targetRoot, "package.json");
if (!targetRoot.startsWith(`${repoRoot}${path.sep}`) || !(await fs.stat(targetPackage).catch(() => null))?.isFile()) {
  throw new Error("Release target must be an existing source checkout inside this website repo.");
}

const sourceManifest = path.join(repoRoot, "src", "_data", "imageManifest.json");
const targetManifest = path.join(targetRoot, "src", "_data", "imageManifest.json");
const targetMedia = path.join(targetRoot, "src", "generated", "media");
const manifest = JSON.parse(await fs.readFile(sourceManifest, "utf8"));

await fs.mkdir(path.dirname(targetManifest), { recursive: true });
await fs.copyFile(sourceManifest, targetManifest);
await fs.rm(targetMedia, { recursive: true, force: true });

let copied = 0;
for (const entry of Object.values(manifest.entries || {})) {
  for (const variant of [entry.poster, ...(entry.images || []), ...(entry.videos || [])].filter(Boolean)) {
    const source = path.join(repoRoot, "src", variant.url.replace(/^\//, ""));
    const target = path.join(targetRoot, "src", variant.url.replace(/^\//, ""));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    copied += 1;
  }
}

process.stdout.write(`Staged the media manifest and ${copied} current generated assets into ${path.relative(repoRoot, targetRoot)}.\n`);
