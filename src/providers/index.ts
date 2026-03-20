export { bailianConfig, createBailianProvider } from "./bailian";
export { volcengineConfig, createVolcengineProvider } from "./volcengine";
export { glmCodeplanConfig, createGlmCodeplanProvider } from "./glm-codeplan";

import type { ProviderConfig } from "../types";
import { bailianConfig } from "./bailian";
import { volcengineConfig } from "./volcengine";
import { glmCodeplanConfig } from "./glm-codeplan";

export const allProviders: ProviderConfig[] = [
  bailianConfig,
  volcengineConfig,
  glmCodeplanConfig,
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return allProviders.find(p => p.id === id);
}

export function getEnabledModels(providerId: string) {
  const provider = getProviderById(providerId);
  if (!provider) return [];
  return provider.models.filter(m => m.enabled !== false);
}