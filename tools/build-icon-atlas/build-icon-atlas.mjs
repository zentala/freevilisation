#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const DEFAULT_CELL_SIZE = 64;
const DEFAULT_COLUMNS = 8;

/** @typedef {{x:number,y:number,width:number,height:number,u0:number,v0:number,u1:number,v1:number,sourceHash:string}} IconUv */

/**
 * Build a deterministic atlas from a folder of SVG icons.
 *
 * The encoder intentionally has no native/image dependency: each SVG is
 * represented by a deterministic monochrome raster derived from its content.
 * This keeps CI and contributors on the same output bytes; replacing this
 * encoder with a native rasterizer later does not change the UV contract.
 * @param {{inputDir:string, outputPng:string, outputJson:string, cellSize?:number, columns?:number}} options
 */
export async function buildIconAtlas(options) {
  const cellSize = options.cellSize ?? DEFAULT_CELL_SIZE;
  const columns = options.columns ?? DEFAULT_COLUMNS;
  if (!Number.isInteger(cellSize) || cellSize < 8)
    throw new Error("cellSize must be an integer >= 8");
  if (!Number.isInteger(columns) || columns < 1)
    throw new Error("columns must be a positive integer");

  const names = (await readdir(options.inputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".svg")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  if (names.length === 0) throw new Error(`No SVG icons found in ${options.inputDir}`);

  const rows = Math.ceil(names.length / columns);
  const width = columns * cellSize;
  const height = rows * cellSize;
  const pixels = Buffer.alloc(width * height * 4);
  const icons = {};

  for (const [index, name] of names.entries()) {
    const source = await readFile(join(options.inputDir, name));
    const hash = createHash("sha256").update(source).digest("hex");
    const x = (index % columns) * cellSize;
    const y = Math.floor(index / columns) * cellSize;
    drawIcon(pixels, width, x, y, cellSize, hash);
    const defId = name.slice(0, -4);
    icons[defId] = {
      x,
      y,
      width: cellSize,
      height: cellSize,
      u0: x / width,
      v0: y / height,
      u1: (x + cellSize) / width,
      v1: (y + cellSize) / height,
      sourceHash: hash,
    };
  }

  const png = encodePng(width, height, pixels);
  const metadata =
    JSON.stringify({ version: 1, width, height, cellSize, columns, icons }, null, 2) + "\n";
  await mkdir(dirname(resolve(options.outputPng)), { recursive: true });
  await mkdir(dirname(resolve(options.outputJson)), { recursive: true });
  await writeFile(options.outputPng, png);
  await writeFile(options.outputJson, metadata, "utf8");
  return { width, height, icons };
}

function drawIcon(pixels, atlasWidth, x, y, size, hash) {
  const color = [
    parseInt(hash.slice(0, 2), 16),
    parseInt(hash.slice(2, 4), 16),
    parseInt(hash.slice(4, 6), 16),
  ];
  const center = (size - 1) / 2;
  const radius = size * 0.39;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const distance = Math.hypot(px - center, py - center);
      const visible =
        distance <= radius || (Math.abs(px - py) <= 2 && px > size * 0.2 && px < size * 0.8);
      if (!visible) continue;
      const offset = ((y + py) * atlasWidth + x + px) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
}

function encodePng(width, height, pixels) {
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    rows[y * (width * 4 + 1)] = 0;
    pixels.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", uint32(width, height, 8, 6)),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const body = Buffer.concat([name, data]);
  const crc = crc32(body);
  return Buffer.concat([uint32(data.length), body, uint32(crc)]);
}

function uint32(...values) {
  const output = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => output.writeUInt32BE(value >>> 0, index * 4));
  return output;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const args = new Map(
    process.argv
      .slice(2)
      .flatMap((arg, index, values) => (arg.startsWith("--") ? [[arg, values[index + 1]]] : [])),
  );
  if (!args.get("--input") || !args.get("--png") || !args.get("--json")) {
    console.error(
      "Usage: build-icon-atlas --input <svg-dir> --png <atlas.png> --json <atlas.json> [--cell-size 64] [--columns 8]",
    );
    process.exitCode = 2;
  } else {
    await buildIconAtlas({
      inputDir: args.get("--input"),
      outputPng: args.get("--png"),
      outputJson: args.get("--json"),
      cellSize: Number(args.get("--cell-size") ?? DEFAULT_CELL_SIZE),
      columns: Number(args.get("--columns") ?? DEFAULT_COLUMNS),
    });
  }
}
