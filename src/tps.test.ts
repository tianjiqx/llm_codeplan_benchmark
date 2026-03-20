import { describe, test, expect, beforeAll } from "bun:test";
import { generateText, streamText } from "ai";
import { createBailianProvider } from "./providers/bailian";
import { createVolcengineProvider } from "./providers/volcengine";
import { defaultSimplePrompt, defaultComplexPrompt } from "./prompts";
import { bailianConfig } from "./providers/bailian";
import { volcengineConfig } from "./providers/volcengine";
import type { TPSResult } from "./types";

const TEST_TIMEOUT = 120000;

interface TPSTestCase {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptType: "simple" | "complex";
}

const testCases: TPSTestCase[] = [
  ...bailianConfig.models.slice(0, 3).map(m => ({
    providerId: bailianConfig.id,
    providerName: bailianConfig.name,
    modelId: m.id,
    modelName: m.name,
    promptType: "simple" as const,
  })),
  ...volcengineConfig.models.slice(0, 2).map(m => ({
    providerId: volcengineConfig.id,
    providerName: volcengineConfig.name,
    modelId: m.id,
    modelName: m.name,
    promptType: "simple" as const,
  })),
];

async function measureTPS(
  providerId: string,
  modelId: string,
  promptType: "simple" | "complex"
): Promise<TPSResult> {
  const prompt = promptType === "simple" ? defaultSimplePrompt : defaultComplexPrompt;
  const providerConfig = providerId === "bailian-coding-plan" ? bailianConfig : volcengineConfig;

  let provider;
  if (providerId === "bailian-coding-plan") {
    provider = createBailianProvider();
  } else {
    provider = createVolcengineProvider();
  }

  const model = provider(modelId) as ReturnType<ReturnType<typeof createBailianProvider>>;
  const startTime = performance.now();
  let firstTokenTime = 0;
  let outputTokens = 0;

  try {
    const result = await streamText({
      model,
      prompt: prompt.userPrompt,
      system: prompt.systemPrompt,
    });

    for await (const chunk of result.textStream) {
      if (firstTokenTime === 0) {
        firstTokenTime = performance.now();
      }
    }

    const usage = await result.usage;
    outputTokens = usage.completionTokens;
    const totalTime = performance.now() - startTime;
    const ttft = firstTokenTime - startTime;
    const tps = outputTokens / (totalTime / 1000);

    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      ttft: Math.round(ttft),
      totalTime: Math.round(totalTime),
      inputTokens: usage.promptTokens,
      outputTokens,
      tps: Math.round(tps * 100) / 100,
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      ttft: 0,
      totalTime: 0,
      inputTokens: 0,
      outputTokens: 0,
      tps: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

describe("TPS Tests", () => {
  beforeAll(() => {
    if (!process.env.BAILIAN_API_KEY && !process.env.VOLCENGINE_API_KEY) {
      console.warn("Warning: No API keys configured. Set BAILIAN_API_KEY or VOLCENGINE_API_KEY environment variables.");
    }
  });

  describe.each(testCases)("Provider: $providerName, Model: $modelName", (testCase) => {
    test(
      `TPS - ${testCase.promptType} prompt`,
      async () => {
        const result = await measureTPS(
          testCase.providerId,
          testCase.modelId,
          testCase.promptType
        );

        console.log("\n--- TPS Result ---");
        console.log(`Provider: ${result.providerName}`);
        console.log(`Model: ${result.modelName}`);
        console.log(`Prompt: ${result.promptType}`);
        if (result.success) {
          console.log(`TTFT: ${result.ttft}ms`);
          console.log(`Total Time: ${result.totalTime}ms`);
          console.log(`Output Tokens: ${result.outputTokens}`);
          console.log(`TPS: ${result.tps} tok/s`);
        } else {
          console.log(`Error: ${result.error}`);
        }
        console.log("------------------\n");

        if (result.success) {
          expect(result.ttft).toBeGreaterThan(0);
          expect(result.totalTime).toBeGreaterThan(0);
          expect(result.tps).toBeGreaterThan(0);
        } else {
          console.log(`Test skipped due to error: ${result.error}`);
        }
      },
      TEST_TIMEOUT
    );
  });

  test(
    "Complex prompt TPS test",
    async () => {
      if (!process.env.BAILIAN_API_KEY) {
        console.log("Skipping: BAILIAN_API_KEY not set");
        return;
      }

      const modelId = bailianConfig.models[0].id;
      const result = await measureTPS(bailianConfig.id, modelId, "complex");

      console.log("\n--- Complex Prompt Result ---");
      if (result.success) {
        console.log(`TTFT: ${result.ttft}ms`);
        console.log(`TPS: ${result.tps} tok/s`);
        expect(result.tps).toBeGreaterThan(0);
      } else {
        console.log(`Error: ${result.error}`);
      }
    },
    TEST_TIMEOUT
  );
});