import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/node_modules/**", "**/fixtures/**", "**/templates/**"],
    environment: "node",
    globals: false,
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
