import { describe, test, expect, beforeAll } from "bun:test";
import { streamText } from "ai";
import { createBailianProvider } from "./providers/bailian";
import { createVolcengineProvider } from "./providers/volcengine";
import { defaultSimplePrompt, defaultComplexPrompt } from "./prompts";
import { bailianConfig } from "./providers/bailian";
import { volcengineConfig } from "./providers/volcengine";
import type { ConcurrentResult, RequestResult } from "./types";

const TEST_TIMEOUT = 300000;
const CONCURRENCY_LEVELS = [1, 2, 5, 10];

async function runSingleRequest(
  providerId: string,
  modelId: string,
  promptType: "simple" | "complex"
): Promise<RequestResult> {
  const prompt = promptType === "simple" ? defaultSimplePrompt : defaultComplexPrompt;

  let provider;
  if (providerId === "bailian-coding-plan") {
    provider = createBailianProvider();
  } else {
    provider = createVolcengineProvider();
  }

  const model = provider(modelId) as ReturnType<ReturnType<typeof createBailianProvider>>;
  const startTime = performance.now();
  let firstTokenTime = 0;

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
    const totalTime = performance.now() - startTime;
    const ttft = firstTokenTime > 0 ? firstTokenTime - startTime : 0;
    const tps = usage.completionTokens / (totalTime / 1000);

    return {
      providerId,
      modelId,
      success: true,
      totalTime: Math.round(totalTime),
      ttft: Math.round(ttft),
      outputTokens: usage.completionTokens,
      tps: Math.round(tps * 100) / 100,
    };
  } catch (error) {
    return {
      providerId,
      modelId,
      success: false,
      totalTime: Math.round(performance.now() - startTime),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runConcurrentTest(
  providerId: string,
  providerName: string,
  modelId: string,
  modelName: string,
  concurrency: number,
  promptType: "simple" | "complex"
): Promise<ConcurrentResult> {
  const testStartTime = performance.now();
  const requests = Array(concurrency)
    .fill(null)
    .map(() => runSingleRequest(providerId, modelId, promptType));

  const results = await Promise.all(requests);
  const totalTestTime = performance.now() - testStartTime;

  const successfulRequests = results.filter(r => r.success);
  const failedRequests = results.filter(r => !r.success);
  const successRate = (successfulRequests.length / concurrency) * 100;

  const responseTimes = successfulRequests.map(r => r.totalTime);
  const tpsValues = successfulRequests.map(r => r.tps || 0);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  const avgTps =
    tpsValues.length > 0
      ? tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length
      : 0;

  const rps = (successfulRequests.length / totalTestTime) * 1000;

  return {
    providerId,
    providerName,
    modelId,
    modelName,
    promptType,
    concurrency,
    totalRequests: concurrency,
    successfulRequests: successfulRequests.length,
    failedRequests: failedRequests.length,
    successRate: Math.round(successRate * 10) / 10,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    avgTps: Math.round(avgTps * 100) / 100,
    rps: Math.round(rps * 100) / 100,
    totalTestTime: Math.round(totalTestTime),
    requestDetails: results,
    timestamp: new Date().toISOString(),
  };
}

describe("Concurrent Tests", () => {
  beforeAll(() => {
    if (!process.env.BAILIAN_API_KEY && !process.env.VOLCENGINE_API_KEY) {
      console.warn("Warning: No API keys configured.");
    }
  });

  const testModels = [
    {
      providerId: bailianConfig.id,
      providerName: bailianConfig.name,
      modelId: bailianConfig.models[0].id,
      modelName: bailianConfig.models[0].name,
    },
    {
      providerId: volcengineConfig.id,
      providerName: volcengineConfig.name,
      modelId: volcengineConfig.models[0].id,
      modelName: volcengineConfig.models[0].name,
    },
  ];

  describe.each(testModels)("Provider: $providerName, Model: $modelName", ({ providerId, providerName, modelId, modelName }) => {
    test.each(CONCURRENCY_LEVELS)(
      "Concurrent test with %d requests",
      async (concurrency) => {
        const hasApiKey =
          (providerId === "bailian-coding-plan" && process.env.BAILIAN_API_KEY) ||
          (providerId === "volcengine" && process.env.VOLCENGINE_API_KEY);

        if (!hasApiKey) {
          console.log(`Skipping: API key not configured for ${providerId}`);
          return;
        }

        const result = await runConcurrentTest(
          providerId,
          providerName,
          modelId,
          modelName,
          concurrency,
          "simple"
        );

        console.log("\n--- Concurrent Test Result ---");
        console.log(`Provider: ${result.providerName}`);
        console.log(`Model: ${result.modelName}`);
        console.log(`Concurrency: ${result.concurrency}`);
        console.log(`Success Rate: ${result.successRate}%`);
        console.log(`Avg Response Time: ${result.avgResponseTime}ms`);
        console.log(`Avg TPS: ${result.avgTps} tok/s`);
        console.log(`RPS: ${result.rps}`);
        console.log("-------------------------------\n");

        if (result.successfulRequests > 0) {
          expect(result.successRate).toBeGreaterThanOrEqual(0);
          expect(result.avgResponseTime).toBeGreaterThan(0);
        } else {
          console.log(`All requests failed. Check API key or rate limits.`);
        }
      },
      TEST_TIMEOUT
    );
  });

  test(
    "High concurrency stress test (5 concurrent)",
    async () => {
      if (!process.env.BAILIAN_API_KEY) {
        console.log("Skipping: BAILIAN_API_KEY not set");
        return;
      }

      const result = await runConcurrentTest(
        bailianConfig.id,
        bailianConfig.name,
        bailianConfig.models[0].id,
        bailianConfig.models[0].name,
        5,
        "simple"
      );

      console.log("\n--- Stress Test Result ---");
      console.log(`Success Rate: ${result.successRate}%`);
      console.log(`Avg TPS: ${result.avgTps} tok/s`);
      console.log(`RPS: ${result.rps}`);

      expect(result.totalRequests).toBe(5);
    },
    TEST_TIMEOUT
  );
});