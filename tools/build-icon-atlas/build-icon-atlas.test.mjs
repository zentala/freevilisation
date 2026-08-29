import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildIconAtlas } from "./build-icon-atlas.mjs";

test("builds byte-identical atlas and sorted UV metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "freevilisation-atlas-"));
  const input = join(root, "icons");
  const firstPng = join(root, "first.png");
  const firstJson = join(root, "first.json");
  const secondPng = join(root, "second.png");
  const secondJson = join(root, "second.json");
  await writeFile(join(root, "make-icons.mjs"), "");
  await mkdir(input);
  await writeFile(join(input, "zulu.svg"), '<svg viewBox="0 0 10 10"><circle /></svg>');
  await writeFile(join(input, "alpha.svg"), '<svg viewBox="0 0 10 10"><rect /></svg>');
  try {
    await buildIconAtlas({
      inputDir: input,
      outputPng: firstPng,
      outputJson: firstJson,
      columns: 2,
    });
    await buildIconAtlas({
      inputDir: input,
      outputPng: secondPng,
      outputJson: secondJson,
      columns: 2,
    });
    assert.deepEqual(await readFile(firstPng), await readFile(secondPng));
    assert.equal(await readFile(firstJson, "utf8"), await readFile(secondJson, "utf8"));
    const metadata = JSON.parse(await readFile(firstJson, "utf8"));
    assert.deepEqual(Object.keys(metadata.icons), ["alpha", "zulu"]);
    assert.equal(metadata.icons.alpha.x, 0);
    assert.equal(metadata.icons.zulu.x, 64);
    assert.equal((await readFile(firstPng)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
