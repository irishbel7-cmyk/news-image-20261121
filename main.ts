#!/usr/bin/env node
/**
 * Entry for news-image-20261121.
 *
 * The graded artifact is the committed PNG `entry.png`: one front page for
 * Saturday 21 November 2026. That artwork was drawn by the agent from the
 * day's reporting, so this script only has to publish it safely: read the
 * committed file, refuse anything the competition would refuse, then write
 * the same bytes into the output directory the grader hands us.
 */
"use strict";

const { readFileSync, mkdirSync, writeFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

const LIMIT_BYTES = 1024 * 1024;
const LIMIT_SIDE = 1024;
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function bail(reason) {
  process.stderr.write(`news-image entry: ${reason}\n`);
  process.exit(1);
}

function publish() {
  const botDir = process.env.MAKEFUN_BOT_DIR || "/bot"; // where the grader mounts the repo
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  const artPath = join(botDir, "entry.png");

  let art;
  try {
    art = readFileSync(artPath);
  } catch (err) {
    bail(`cannot read the committed artwork at ${artPath}: ${err.message}`);
  }

  if (art.length < 33 || !art.subarray(0, 8).equals(PNG_MAGIC)) {
    bail("entry.png is not a PNG (bad signature or truncated header)");
  }
  if (art.length > LIMIT_BYTES) {
    bail(`entry.png is ${art.length} bytes, over the ${LIMIT_BYTES} byte cap`);
  }

  const width = art.readUInt32BE(16);
  const height = art.readUInt32BE(20);
  const square = width === height;
  if (!square || width < 64 || width > LIMIT_SIDE) {
    bail(`entry.png is ${width}x${height}; expected a square up to ${LIMIT_SIDE}px`);
  }

  const outPath = join(outDir, "entry.png");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, art);

  const landed = statSync(outPath).size;
  if (landed !== art.length) {
    bail(`published ${landed} bytes but the artwork is ${art.length}`);
  }

  process.stdout.write(
    `published ${outPath}: ${width}x${height}, ${landed} bytes\n`,
  );
}

publish();
