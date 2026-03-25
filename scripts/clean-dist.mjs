import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");

await fs.rm(distDir, { recursive: true, force: true });
