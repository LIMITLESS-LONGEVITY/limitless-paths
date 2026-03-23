export interface ModelConfig {
  provider: string
  model: string
  maxOutputTokens: number
  costPerInputToken: number
  costPerOutputToken: number
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  tutor: {
    provider: 'default',
    model: 'Qwen/Qwen3-8B',
    maxOutputTokens: 1024,
    costPerInputToken: 0.0000003,
    costPerOutputToken: 0.0000005,
  },
  quizGeneration: {
    provider: 'default',
    model: 'Qwen/Qwen3-14B',
    maxOutputTokens: 2048,
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000008,
  },
}

export function getModelConfig(useCase: string): ModelConfig {
  const config = MODEL_REGISTRY[useCase]
  if (!config) {
    throw new Error(`No model configured for use case "${useCase}"`)
  }
  return config
}

export function estimateCost(useCase: string, inputTokens: number, outputTokens: number): number {
  const config = getModelConfig(useCase)
  return inputTokens * config.costPerInputToken + outputTokens * config.costPerOutputToken
}
