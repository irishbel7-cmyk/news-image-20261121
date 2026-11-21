/*
 * news-image-20261121 entry point: ships one committed PNG.
 *
 * The grader runs `node /bot/main.ts` in a read-only container with no network
 * and an empty writable output directory (MAKEFUN_OUTPUT_DIR, default /output).
 * The whole entry is a committed PNG, so the program only has to place that PNG
 * at $MAKEFUN_OUTPUT_DIR/entry.png and prove it is a valid, contest-legal
 * image before it exits successfully.
 */
const fs = require("node:fs");
const path = require("node:path");

const repoDir = process.env.MAKEFUN_BOT_DIR || "/bot"; // grader mounts the repo here
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const sourcePath = path.join(repoDir, "entry.png"); // committed artwork
const targetPath = path.join(outDir, "entry.png"); // graded artifact

function fail(message) {
  process.stderr.write("entry failed: " + message + "\n");
  process.exit(1);
}

function readPngHeader(file) {
  const fd = fs.openSync(file, "r");
  const header = Buffer.alloc(24);
  const read = fs.readSync(fd, header, 0, 24, 0);
  fs.closeSync(fd);
  if (read < 24) fail("entry.png is shorter than a PNG header");
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!header.subarray(0, 8).equals(signature)) {
    fail("entry.png does not start with the PNG signature");
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

if (!fs.existsSync(sourcePath)) fail("no entry.png in the repository at " + sourcePath);

// The competition cap is 1 MiB; keep it explicit and overridable for local tests.
const DEFAULT_MAX_BYTES = 1024 * 1024;
const MAX_BYTES = Number(process.env.ENTRY_MAX_BYTES || DEFAULT_MAX_BYTES);

const size = fs.statSync(sourcePath).size;
if (size > MAX_BYTES) fail("entry.png is " + size + " bytes, over the " + MAX_BYTES + " byte cap");

const { width, height } = readPngHeader(sourcePath);
if (width < 1 || height < 1 || width > 1024 || height > 1024) {
  fail("entry.png is " + width + "x" + height + ", outside the 1024x1024 limit");
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

// Guard against a silent partial copy: the written file must match byte for byte.
const written = fs.statSync(targetPath).size;
if (written !== size) fail("copied entry.png is " + written + " bytes, expected " + size);

process.stdout.write(
  "wrote " + targetPath + " (" + width + "x" + height + ", " + written +
  " bytes, cap " + MAX_BYTES + ")\n",
);
