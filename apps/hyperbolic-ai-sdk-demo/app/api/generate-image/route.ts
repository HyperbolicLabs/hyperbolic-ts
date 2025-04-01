import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";

import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";
import { HyperbolicImageProviderOptions } from "@hyperbolic/ai-sdk-provider/internal";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
  baseURL: "https://api.hyperbolic.xyz/v1",
});

const model = hyperbolic.image("SDXL-turbo");

// Allow responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const { image } = await generateImage({
    model,
    prompt,
    size: "1024x1024",
    providerOptions: {
      hyperbolic: {
        cfgScale: 5,
        steps: 30,
      } satisfies HyperbolicImageProviderOptions,
    },
  });

  return Response.json(image.base64);
}
