import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "dist");
const mediaRoot = path.join(distRoot, "generated", "media");

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

const referenced = new Set();
for (const file of (await walk(distRoot)).filter((item) => item.endsWith(".html"))) {
  const html = await fs.readFile(file, "utf8");
  for (const match of html.matchAll(/\/generated\/media\/[^\s"'&<>)}]+/g)) {
    referenced.add(decodeURIComponent(match[0]));
  }
}

let removed = 0;
for (const file of await walk(mediaRoot)) {
  if (path.basename(file) === ".htaccess") continue;
  const publicPath = `/${path.relative(distRoot, file).replace(/\\/g, "/")}`;
  if (!referenced.has(publicPath)) {
    await fs.rm(file, { force: true });
    removed += 1;
  }
}

process.stdout.write(`Materialized ${referenced.size} referenced media files (${removed} unused files removed from dist).\n`);
