import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderConfig } from "../types";
import { getApiKeyFromConfig } from "../config";

export const bailianConfig: ProviderConfig = {
  id: "bailian-coding-plan",
  name: "百炼 Coding Plan",
  npm: "anthropic",
  baseURL: "https://coding.dashscope.aliyuncs.com/apps/anthropic/v1",
  apiKey: "",
  models: [
    { id: "qwen3.5-plus", name: "Qwen3.5 Plus", enabled: true },
    { id: "qwen3-max-2026-01-23", name: "Qwen3 Max", enabled: true },
    { id: "qwen3-coder-next", name: "Qwen3 Coder Next", enabled: true },
    { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", enabled: true },
    { id: "glm-5", name: "GLM-5", enabled: true },
    { id: "glm-4.7", name: "GLM-4.7", enabled: true },
    { id: "MiniMax-M2.5", name: "MiniMax M2.5", enabled: true },
    { id: "kimi-k2.5", name: "Kimi K2.5", enabled: true },
  ],
};

export function createBailianProvider(apiKey?: string) {
  const key = apiKey
    || getApiKeyFromConfig(bailianConfig.id)
    || process.env.BAILIAN_API_KEY;

  if (!key) {
    throw new Error(
      `BAILIAN_API_KEY not configured. ` +
      `Set it in config/providers.json or BAILIAN_API_KEY environment variable.`
    );
  }

  return createAnthropic({
    baseURL: bailianConfig.baseURL,
    apiKey: key,
  });
}

export default bailianConfig;