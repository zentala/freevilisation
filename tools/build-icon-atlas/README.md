# Icon atlas builder

Build a deterministic PNG atlas and UV lookup from fixed SVG inputs:

```sh
node tools/build-icon-atlas/build-icon-atlas.mjs \
  --input assets/icons \
  --png apps/client/public/assets/icons.png \
  --json apps/client/public/assets/icons.json
```

Files are sorted by definition id (the SVG basename), so repeated builds with
the same inputs produce byte-identical output. The tool has no network or
native image dependency and is suitable for headless CI.
