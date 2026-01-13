import { createAnthropic } from "@ai-sdk/anthropic"

export const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const SUPPORTED_MODELS = {
  "claude-sonnet-4-5-20250929": {
    label: "Claude Sonnet 4.5",
    description: "Smart model for complex agents and coding",
    maxTokens: 64000,
    contextWindow: 200000,
    inputPrice: 3,
    outputPrice: 15,
    default: true,
  },
  "claude-haiku-4-5-20251001": {
    label: "Claude Haiku 4.5",
    description: "Fastest model with near-frontier intelligence",
    maxTokens: 64000,
    contextWindow: 200000,
    inputPrice: 1,
    outputPrice: 5,
  },
  "claude-opus-4-5-20251101": {
    label: "Claude Opus 4.5",
    description: "Premium model combining maximum intelligence with practical performance",
    maxTokens: 64000,
    contextWindow: 200000,
    inputPrice: 5,
    outputPrice: 25,
  },
} as const

export type SupportedModel = keyof typeof SUPPORTED_MODELS

export function isValidModel(model: string): model is SupportedModel {
  return model in SUPPORTED_MODELS
}

export function getDefaultModel(): SupportedModel {
  for (const [id, config] of Object.entries(SUPPORTED_MODELS)) {
    if ("default" in config && config.default) {
      return id as SupportedModel
    }
  }
  return "claude-sonnet-4-5-20250929"
}

export function getModelConfig(model: SupportedModel) {
  return SUPPORTED_MODELS[model]
}

export function anthropic(model: SupportedModel) {
  return anthropicProvider(model)
}
