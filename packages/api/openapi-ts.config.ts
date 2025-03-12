import { defaultPlugins, defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "openapi-spec.json",
  output: "src/__generated__",
  plugins: [...defaultPlugins, "@hey-api/client-fetch"],
});
