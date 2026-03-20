import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ProviderConfig } from "../types";
import { getApiKeyFromConfig } from "../config";

export const volcengineConfig: ProviderConfig = {
  id: "volcengine",
  name: "火山引擎",
  npm: "openai-compatible",
  baseURL: "https://ark.cn-beijing.volces.com/api/coding/v3",
  apiKey: "",
  models: [
    { id: "glm-4.7", name: "GLM-4.7", enabled: true },
    { id: "deepseek-v3.2", name: "DeepSeek V3.2", enabled: true },
    { id: "kimi-k2.5", name: "Kimi K2.5", enabled: true },
    { id: "minimax-m2.5", name: "MiniMax M2.5", enabled: true },
  ],
};

export function createVolcengineProvider(apiKey?: string) {
  const key = apiKey
    || getApiKeyFromConfig(volcengineConfig.id)
    || process.env.VOLCENGINE_API_KEY;

  if (!key) {
    throw new Error(
      `VOLCENGINE_API_KEY not configured. ` +
      `Set it in config/providers.json or VOLCENGINE_API_KEY environment variable.`
    );
  }

  return createOpenAICompatible({
    baseURL: volcengineConfig.baseURL,
    apiKey: key,
    name: volcengineConfig.name,
  });
}

export default volcengineConfig;