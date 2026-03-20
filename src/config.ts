import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ProviderConfigFile {
  providers: {
    [key: string]: {
      apiKey: string;
      models: string[];
    };
  };
  test?: {
    concurrencyLevels?: number[];
    timeout?: number;
    repetitions?: number;
  };
}

let cachedConfig: ProviderConfigFile | null = null;

export function loadConfig(): ProviderConfigFile {
  if (cachedConfig) return cachedConfig;

  const configPath = join(process.cwd(), "config", "providers.json");

  if (!existsSync(configPath)) {
    return {
      providers: {},
      test: {},
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    cachedConfig = JSON.parse(content);
    return cachedConfig!;
  } catch {
    return {
      providers: {},
      test: {},
    };
  }
}

export function getApiKeyFromConfig(providerId: string): string | undefined {
  const config = loadConfig();
  return config.providers[providerId]?.apiKey;
}

export function getEnabledModelsFromConfig(providerId: string): string[] | undefined {
  const config = loadConfig();
  return config.providers[providerId]?.models;
}

export function getTestConfig() {
  const config = loadConfig();
  return config.test || {};
}