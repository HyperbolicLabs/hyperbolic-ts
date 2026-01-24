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

main();
