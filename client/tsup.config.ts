import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["lib/cargoplane-client.ts"],
  clean: true,
  sourcemap: true,
  dts: true,
  bundle: false,
  format: ["cjs", "esm"],
  outExtension: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : format === "esm" ? ".mjs" : undefined,
  }),
});
