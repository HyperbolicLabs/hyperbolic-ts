import type { CreateClientConfig } from "./__generated__/client.gen";

export const createClientConfig: CreateClientConfig = (config) => {
  return {
    ...config,
    baseUrl: "https://api.hyperbolic.ai/v1",
    auth: config?.auth ?? process.env.HYPERBOLIC_API_KEY,
  };
};
