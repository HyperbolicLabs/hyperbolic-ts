# Hyperbolic Provider for Vercel AI SDK

The [Hyperbolic](https://hyperbolic.xyz/) provider for the [Vercel AI SDK](https://sdk.vercel.ai/docs) gives access to image models found at <https://app.hyperbolic.xyz/models>. For chat and completion models, use the [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider) package instead.

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

## Example

```ts
import { generateText } from "ai";

import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY, // Found in settings after logging in at https://app.hyperbolic.ai
});

const result = await generateImage({
  model: hyperbolic.image("FLUX.1-dev"),
  prompt: "An image of a man riding a horse in SF.",
  size: `1020x1020`,
  providerOptions: {
    hyperbolic: {
      cfgScale: 5,
      steps: 30,
    } satisfies HyperbolicImageProviderOptions,
  },
});
```

## Supported models

This list is not a definitive list of models supported by Hyperbolic, as it constantly changes as we add new models (and deprecate old ones) to our system.
You can find the latest list of models supported by Hyperbolic [here](https://app.hyperbolic.ai/models).
