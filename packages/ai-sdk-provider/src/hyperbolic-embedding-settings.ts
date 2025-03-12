export type HyperbolicEmbeddingModelId = "hyperbolic-embed" | (string & {});

export interface HyperbolicEmbeddingSettings {
  /**
Override the maximum number of embeddings per call.
   */
  maxEmbeddingsPerCall?: number;

  /**
Override the parallelism of embedding calls.
    */
  supportsParallelCalls?: boolean;
}
