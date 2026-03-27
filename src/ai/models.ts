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
    model: 'nvidia/nemotron-nano-9b-v2:free',
    maxOutputTokens: 1024,
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
  quizGeneration: {
    provider: 'default',
    model: 'nvidia/nemotron-nano-9b-v2:free',
    maxOutputTokens: 2048,
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
  discover: {
    provider: 'default',
    model: 'nvidia/nemotron-nano-9b-v2:free',
    maxOutputTokens: 1024,
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
  actionPlan: {
    provider: 'default',
    model: 'nvidia/nemotron-nano-9b-v2:free',
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
  dailyProtocol: {
    provider: 'default',
    model: 'nvidia/nemotron-nano-9b-v2:free',
    maxOutputTokens: 2048,
    costPerInputToken: 0,
    costPerOutputToken: 0,
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
