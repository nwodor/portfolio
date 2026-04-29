import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

const copies = [
  [join(root, "public"), join(standaloneDir, "public")],
  [join(root, ".next", "static"), join(standaloneDir, ".next", "static")],
];

for (const [source, destination] of copies) {
  if (!existsSync(source)) continue;
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}
