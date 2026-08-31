import type { CreateClientConfig } from "./__generated__/client.gen";

/** Public Hyperbolic API origin, used when the caller does not supply one. */
export const HYPERBOLIC_API_BASE_URL = "https://api.hyperbolic.xyz";

export const createClientConfig: CreateClientConfig = (config) => {
  return {
    // Set fallback options first so that any custom properties or overrides
    // provided by the caller via `config` take correct precedence.
    baseUrl: config?.baseUrl ?? HYPERBOLIC_API_BASE_URL,
    auth: config?.auth ?? process.env.HYPERBOLIC_API_KEY,
    ...config,
  };
};
