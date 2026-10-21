# Hyperbolic Provider for Vercel AI SDK (deprecated)

> [!WARNING]
> This package is deprecated and no longer maintained. It was built for Hyperbolic's previous inference API, which has been decommissioned. Don't use it in new projects.

## What changed

This package gave access to Hyperbolic image models and speech (text-to-speech) models through `https://api.hyperbolic.xyz/v1`. That API has been decommissioned, and the relaunched Hyperbolic Inference API serves text models only. Image generation and text-to-speech models aren't available, so this package has no models left to call.

## Use the Hyperbolic Inference API instead

The relaunched API accepts OpenAI-compatible chat completion requests:

|                    |                                               |
| ------------------ | --------------------------------------------- |
| **Base URL**       | `https://api.hyperbolic.ai/inference/v1`      |
| **Endpoints**      | `POST /chat/completions`, `GET /models`       |
| **Authentication** | An `sk_live_` API key, sent as a Bearer token |
| **Access**         | A Pro plan or an Organization                 |

Keys issued for the previous API aren't accepted. Create an `sk_live_` key in the [dashboard](https://app.hyperbolic.ai/settings/api-keys) under **Settings > API Keys**.

For example, with the official OpenAI Node.js SDK:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.HYPERBOLIC_API_KEY,
  baseURL: "https://api.hyperbolic.ai/inference/v1",
});

const response = await client.chat.completions.create({
  model: "glm-5.3-flash",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
  max_tokens: 2048,
});

console.log(response.choices[0].message.content);
```

## Documentation

- [Inference overview](https://hyperbolic.ai/docs/inference/overview): models, prices, limits, and who can use inference
- [Quick start](https://hyperbolic.ai/docs/inference/quickstart): create a key and make your first request
- [Chat completions](https://hyperbolic.ai/docs/inference/text-apis): parameters, streaming, tool calling, and SDK examples
