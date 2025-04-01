# Hyperbolic Provider for Vercel AI SDK

The [Hyperbolic](https://hyperbolic.xyz/) provider for the [Vercel AI SDK](https://sdk.vercel.ai/docs) gives access to over 300 large language model on the OpenRouter chat and completion APIs.

This is based on the [OpenRouter](https://openrouter.ai/) provider for the Vercel AI SDK, with a number of changes to support the Hyperbolic API and add image generation support.

## Setup

```bash
# For pnpm
pnpm add @hyperbolic/ai-sdk-provider

# For npm
npm install @hyperbolic/ai-sdk-provider

# For yarn
yarn add @hyperbolic/ai-sdk-provider
```

## Provider Instance

You can import the default provider instance `openrouter` from `@openrouter/ai-sdk-provider`:

```ts
import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";
```

## Example

```ts
import { generateText } from "ai";

import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
});

const { text } = await generateText({
  model: hyperbolic.chat("deepseek-ai/DeepSeek-R1"),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
```

## Supported models

This list is not a definitive list of models supported by Hyperbolic, as it constantly changes as we add new models (and deprecate old ones) to our system.  
You can find the latest list of models supported by Hyperbolic [here](https://openrouter.ai/models).

You can find the latest list of tool-supported models supported by OpenRouter [here](https://app.hyperbolic.xyz/models).

## Using Models

### Language Models

```ts
const { text } = await generateText({
  model: hyperbolic.chat("deepseek-ai/DeepSeek-R1"),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});

const { text } = await generateText({
  model: hyperbolic.completion("deepseek-ai/DeepSeek-R1"),
  prompt: "The capital of France is",
});
```

### Image Generation Models

```ts
import { experimental_generateImage as generateImage } from "ai";

// Text to Image
const { images } = await generateImage({
  model: hyperbolic.image("SDXL1.0-base"),
  prompt: "A beautiful sunset over a calm ocean",
  size: "1024x1024",
  providerOptions: {
    hyperbolic: {
      cfgScale: 5,
      steps: 30,
      negativePrompt: "low quality, blurry, distorted",
      enableRefiner: false,
    } satisfies HyperbolicImageProviderOptions,
  },
});
```
