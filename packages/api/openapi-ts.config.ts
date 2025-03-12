import { defaultPlugins, defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "openapi-spec.json",
  output: {
    path: "src/__generated__",
    format: "prettier",
    lint: "eslint",
  },
  plugins: [
    ...defaultPlugins,
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/client-config.ts",
    },
  ],
});
