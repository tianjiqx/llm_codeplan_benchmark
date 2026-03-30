import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderConfig } from "../types";
import { getApiKeyFromConfig } from "../config";

export const glmCodeplanConfig: ProviderConfig = {
  id: "glm-codeplan",
  name: "GLM Code Plan",
  npm: "anthropic",
  baseURL: "https://open.bigmodel.cn/api/anthropic/v1",
  apiKey: "",
  models: [
    { id: "glm-5.1", name: "GLM-5.1", enabled: true },
    { id: "glm-4.7", name: "GLM-4.7 (Opus/Sonnet)", enabled: true },
    { id: "glm-4.5-air", name: "GLM-4.5-Air (Haiku)", enabled: true },
    { id: "glm-4-plus", name: "GLM-4 Plus", enabled: true },
    { id: "glm-4-air", name: "GLM-4 Air", enabled: true },
    { id: "glm-4-airx", name: "GLM-4 AirX", enabled: true },
    { id: "glm-4-flash", name: "GLM-4 Flash", enabled: true },
    { id: "glm-4-long", name: "GLM-4 Long", enabled: true },
  ],
};

export function createGlmCodeplanProvider(apiKey?: string) {
  const key = apiKey
    || getApiKeyFromConfig(glmCodeplanConfig.id)
    || process.env.ANTHROPIC_AUTH_TOKEN
    || process.env.GLM_CODEPLAN_API_KEY;

  if (!key) {
    throw new Error(
      `GLM Code Plan API key not configured. ` +
      `Set ANTHROPIC_AUTH_TOKEN environment variable or configure in config/providers.json`
    );
  }

  return createAnthropic({
    baseURL: glmCodeplanConfig.baseURL,
    apiKey: key,
  });
}

export default glmCodeplanConfig;