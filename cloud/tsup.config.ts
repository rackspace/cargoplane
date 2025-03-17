import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["lib/cargoplane-cloud.ts"],
  clean: true,
  sourcemap: true,
  dts: true,
  bundle: false,
  format: ["cjs", "esm"],
  outExtension: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : format === "esm" ? ".mjs" : undefined,
  }),
});
