# Hyperbolic Provider for Vercel AI SDK

The [Hyperbolic](https://hyperbolic.xyz/) provider for the [Vercel AI SDK](https://sdk.vercel.ai/docs) gives access to image models and speech (audio) models found at <https://app.hyperbolic.xyz/models>. For chat and completion models, use the [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider) package instead.

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

You can create a provider instance with `createHyperbolic` from `@hyperbolic/ai-sdk-provider`:

```ts
import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";
```

## Example - Image Model

```ts
import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";

const exampleHyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
});
const imageModel = exampleHyperbolic.imageModel("mistralai/Pixtral-12B-2409");
const result = await imageModel.doGenerate({
  prompt: "A man riding a horse in SF.",
  aspectRatio: "16:9",
  size: "1024x1024",
  n: 1,
  seed: 42,
  files: [],
  mask: undefined,
  providerOptions: {
    hyperbolic: {
      steps: 30,
    },
  },
});
```

## Example - Speech Model

```ts
import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
});
const speechModel = hyperbolic.speechModel("MeloTTS");
const result = await speechModel.doGenerate({
  text: "Hello, this is a speech synthesis example.",
  providerOptions: {
    hyperbolic: {
      speed: 1,
    },
  },
});
console.log(result.audio);
```

## Supported models

This list is not a definitive list of models supported by Hyperbolic, as it constantly changes as we add new models (and deprecate old ones) to our system.
You can find the latest list of models supported by Hyperbolic [here](https://app.hyperbolic.ai/models).
