import "@hyperbolic/api";

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";

import { hyperbolicClient, showModelsV1ModelsGet } from "@hyperbolic/api";

/**
 * Generates the list of models supported by Hyperbolic for the AI SDK Provider.
 */
const main = async () => {
  const {
    data: { data },
  } = await showModelsV1ModelsGet({ client: hyperbolicClient, throwOnError: true });

  const models = data as {
    id: string;
    supports_chat: boolean;
    supports_image_input: boolean;
    [key: string]: unknown;
  }[];
  // NOTE: `supports_image_input` describes models that *accept* an image, i.e.
  // vision-capable chat models — not text-to-image models. The generated
  // `HyperbolicImageModelId` union is built from it, so it may list models the
  // image endpoint cannot serve. Confirming the correct field requires a live
  // `/v1/models` response, so the behaviour is left unchanged here.
  const imageModelIds = models
    .filter((model) => model.supports_image_input)
    .map((model) => model.id);
  const chatModelIds = models.filter((model) => model.supports_chat).map((model) => model.id);
  const completionModelIds = chatModelIds;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(__dirname, "templates", "models.ts.hbs");
  const templateContent = readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(templateContent);

  const output = template({ imageModelIds, chatModelIds, completionModelIds });

  writeFileSync(new URL("../__generated__/models.gen.ts", import.meta.url), output);
};

// The returned promise was never awaited or caught. A failed API call or an
// unreadable template surfaced as an unhandled rejection, and the process still
// exited 0 — so a code-generation step could fail while the build continued with
// the previous `models.gen.ts`. Fail loudly and non-zero instead.
main().catch((error: unknown) => {
  console.error("Failed to update the models list:", error);
  process.exit(1);
});
