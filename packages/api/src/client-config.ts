import type { CreateClientConfig } from "./__generated__/client.gen";

/** Public Hyperbolic API origin, used when the caller does not supply one. */
export const HYPERBOLIC_API_BASE_URL = "https://api.hyperbolic.xyz";

export const createClientConfig: CreateClientConfig = (config) => {
  return {
    ...config,
    // The hard-coded assignment sat *after* the spread, so it overwrote any
    // `baseUrl` the caller passed in. That made the option inert and left no way
    // to target a staging deployment, a proxy, or a local mock — every request
    // went to production regardless of configuration.
    baseUrl: config?.baseUrl ?? HYPERBOLIC_API_BASE_URL,
    auth: config?.auth ?? process.env.HYPERBOLIC_API_KEY,
  };
};
