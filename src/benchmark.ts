#!/usr/bin/env bun
import { streamText } from "ai";
import { createBailianProvider } from "./providers/bailian";
import { createVolcengineProvider } from "./providers/volcengine";
import { createGlmCodeplanProvider } from "./providers/glm-codeplan";
import { defaultSimplePrompt, defaultComplexPrompt } from "./prompts";
import { bailianConfig } from "./providers/bailian";
import { volcengineConfig } from "./providers/volcengine";
import { glmCodeplanConfig } from "./providers/glm-codeplan";
import { generateMarkdownReport } from "./utils";
import { getEnabledModelsFromConfig } from "./config";
import type { TPSResult, ConcurrentResult, BenchmarkReport, ProviderConfig } from "./types";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const CONCURRENCY_LEVELS = [1, 2, 5, 10];

function getBeijingTime(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().replace("T", " ").slice(0, 19);
}

function getBeijingTimestamp(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars / 4);
}

function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  
  const msg = error.message;
  const errName = (error as Error).name;
  
  // AI_SDK 包装错误：流中没有输出，通常是因为服务端错误或限流
  if (errName === 'AI_NoOutputGeneratedError') {
    return "限流或服务端错误：请稍后重试";
  }
  
  // 处理速率限制错误 - 从 "message":"xxx" 提取中文错误
  const chineseErrorMatch = msg.match(/"message":\s*"([^"]*[\u4e00-\u9fa5]+[^"]*)"/);
  if (chineseErrorMatch) {
    return `限流: ${chineseErrorMatch[1]}`;
  }
  
  // 处理速率限制错误 - 从 value.error.message 提取
  const valueErrorMatch = msg.match(/"value":\s*\{[^}]*"error":\s*\{[^}]*"message":\s*"([^"]+)"/);
  if (valueErrorMatch) {
    return valueErrorMatch[1];
  }
  
  // 处理其他 API 错误
  const errorMatch = msg.match(/"error":\s*\{[^}]*"message":\s*"([^"]+)"/);
  if (errorMatch) return errorMatch[1];
  
  // 处理 ZodError / TypeValidationError
  if (msg.includes("ZodError") || msg.includes("TypeValidationError")) {
    return "限流或服务端错误";
  }
  
  // 截断长消息
  if (msg.length > 100) {
    return msg.slice(0, 100) + "...";
  }
  
  return msg;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith("--mode="))?.split("=")[1] || "all";
  const provider = args.find(a => a.startsWith("--provider="))?.split("=")[1];
  const model = args.find(a => a.startsWith("--model="))?.split("=")[1];
  return { mode, provider, model };
}

function getProviderConfig(providerId: string): ProviderConfig {
  switch (providerId) {
    case "bailian-coding-plan": return bailianConfig;
    case "volcengine": return volcengineConfig;
    case "glm-codeplan": return glmCodeplanConfig;
    default: return bailianConfig;
  }
}

function createProvider(providerId: string) {
  switch (providerId) {
    case "bailian-coding-plan": return createBailianProvider();
    case "volcengine": return createVolcengineProvider();
    case "glm-codeplan": return createGlmCodeplanProvider();
    default: return createBailianProvider();
  }
}

async function measureTPS(
  providerId: string,
  modelId: string,
  promptType: "simple" | "complex"
): Promise<TPSResult> {
  const prompt = promptType === "simple" ? defaultSimplePrompt : defaultComplexPrompt;
  const providerConfig = getProviderConfig(providerId);

  let provider;
  try {
    provider = createProvider(providerId);
  } catch (error) {
    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      ttft: 0, totalTime: 0, generationTime: 0, inputTokens: 0, outputTokens: 0, tps: 0, totalTps: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: getBeijingTime(),
    };
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

    let fullText = "";
    for await (const chunk of result.textStream) {
      if (firstTokenTime === 0) {
        firstTokenTime = performance.now();
      }
      fullText += chunk;
    }

    const usage = await result.usage;
    const totalTime = performance.now() - startTime;
    const ttft = firstTokenTime > 0 ? firstTokenTime - startTime : 0;

    const outputTokens = usage.outputTokens ?? estimateTokens(fullText);
    const inputTokens = usage.inputTokens ?? estimateTokens(prompt.userPrompt + (prompt.systemPrompt || ""));
    const generationTime = totalTime - ttft;
    const tps = generationTime > 0 ? outputTokens / (generationTime / 1000) : 0;
    const totalTps = totalTime > 0 ? outputTokens / (totalTime / 1000) : 0;

    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      ttft: Math.round(ttft),
      totalTime: Math.round(totalTime),
      generationTime: Math.round(generationTime),
      inputTokens,
      outputTokens,
      tps: Math.round(tps * 100) / 100,
      totalTps: Math.round(totalTps * 100) / 100,
      success: true,
      timestamp: getBeijingTime(),
    };
  } catch (error) {
    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      ttft: 0, totalTime: 0, generationTime: 0, inputTokens: 0, outputTokens: 0, tps: 0, totalTps: 0,
      success: false,
      error: extractErrorMessage(error),
      timestamp: getBeijingTime(),
    };
  }
}

async function runConcurrentTest(
  providerId: string,
  modelId: string,
  concurrency: number,
  promptType: "simple" | "complex"
): Promise<ConcurrentResult> {
  const providerConfig = getProviderConfig(providerId);
  const prompt = promptType === "simple" ? defaultSimplePrompt : defaultComplexPrompt;

  let provider;
  try {
    provider = createProvider(providerId);
  } catch (error) {
    return {
      providerId,
      providerName: providerConfig.name,
      modelId,
      modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
      promptType,
      concurrency,
      totalRequests: concurrency,
      successfulRequests: 0,
      failedRequests: concurrency,
      successRate: 0,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      avgTps: 0,
      rps: 0,
      totalTestTime: 0,
      errors: [extractErrorMessage(error)],
      requestDetails: [],
      timestamp: getBeijingTime(),
    };
  }

  const model = provider(modelId) as ReturnType<ReturnType<typeof createBailianProvider>>;
  const testStartTime = performance.now();

  async function singleRequest() {
    const startTime = performance.now();
    let firstTokenTime = 0;

    try {
      const result = await streamText({
        model,
        prompt: prompt.userPrompt,
        system: prompt.systemPrompt,
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        if (firstTokenTime === 0) {
          firstTokenTime = performance.now();
        }
        fullText += chunk;
      }

      const usage = await result.usage;
      const totalTime = performance.now() - startTime;
      const ttft = firstTokenTime > 0 ? firstTokenTime - startTime : 0;
      const outputTokens = usage.outputTokens ?? estimateTokens(fullText);
      const generationTime = totalTime - ttft;
      const tps = generationTime > 0 ? outputTokens / (generationTime / 1000) : 0;

      return {
        providerId,
        modelId,
        success: true,
        totalTime: Math.round(totalTime),
        ttft: Math.round(ttft),
        outputTokens,
        tps: Math.round(tps * 100) / 100,
      };
    } catch (error) {
      return {
        providerId,
        modelId,
        success: false,
        totalTime: Math.round(performance.now() - startTime),
        error: extractErrorMessage(error),
      };
    }
  }

  const requests = Array(concurrency).fill(null).map(() => singleRequest());
  const results = await Promise.all(requests);
  const totalTestTime = performance.now() - testStartTime;

  const successfulRequests = results.filter(r => r.success);
  const failedRequestList = results.filter(r => !r.success);
  const errors = [...new Set(failedRequestList.map(r => r.error || "Unknown error"))];

  const successRate = (successfulRequests.length / concurrency) * 100;
  const responseTimes = successfulRequests.map(r => r.totalTime);
  const tpsValues = successfulRequests.map(r => r.tps || 0);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  const avgTps = tpsValues.length > 0
    ? tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length
    : 0;
  const rps = (successfulRequests.length / totalTestTime) * 1000;

  return {
    providerId,
    providerName: providerConfig.name,
    modelId,
    modelName: providerConfig.models.find(m => m.id === modelId)?.name || modelId,
    promptType,
    concurrency,
    totalRequests: concurrency,
    successfulRequests: successfulRequests.length,
    failedRequests: failedRequestList.length,
    successRate: Math.round(successRate * 10) / 10,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    avgTps: Math.round(avgTps * 100) / 100,
    rps: Math.round(rps * 100) / 100,
    totalTestTime: Math.round(totalTestTime),
    errors,
    requestDetails: results,
    timestamp: getBeijingTime(),
  };
}

async function runBenchmark() {
  const { mode, provider: filterProvider, model: filterModel } = parseArgs();

  console.log("\n🚀 LLM CodePlan Benchmark\n");
  console.log(`Mode: ${mode}`);
  console.log(`Timestamp: ${getBeijingTime()}\n`);

  const resultsDir = join(process.cwd(), "results");
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const tpsResults: TPSResult[] = [];
  const concurrentResults: ConcurrentResult[] = [];

  const providers = [
    { config: bailianConfig, create: createBailianProvider },
    { config: volcengineConfig, create: createVolcengineProvider },
    { config: glmCodeplanConfig, create: createGlmCodeplanProvider },
  ];

  const filteredProviders = filterProvider
    ? providers.filter(p => p.config.id === filterProvider)
    : providers;

  if (mode === "all" || mode === "tps") {
    console.log("📊 Running TPS Tests...\n");

    for (const { config } of filteredProviders) {
      // 优先使用用户配置的模型列表，否则使用提供商默认模型
      const configModels = getEnabledModelsFromConfig(config.id);
      const models = filterModel
        ? config.models.filter(m => m.id === filterModel)
        : configModels
          ? config.models.filter(m => configModels.includes(m.id))
          : config.models;

      for (const model of models) {
        console.log(`Testing: ${config.name} / ${model.name}`);

        for (const promptType of ["simple", "complex"] as const) {
          const result = await measureTPS(config.id, model.id, promptType);
          tpsResults.push(result);

          if (result.success) {
            const totalSec = (result.totalTime / 1000).toFixed(2);
            const ttftSec = (result.ttft / 1000).toFixed(2);
            console.log(
              `  ✅ ${promptType}: ` +
              `TTFT=${ttftSec}s, ` +
              `总时间=${totalSec}s, ` +
              `tokens=${result.outputTokens}, ` +
              `生成TPS=${result.tps} tok/s, ` +
              `总TPS=${result.totalTps} tok/s`
            );
          } else {
            console.log(`  ❌ ${promptType}: ${result.error}`);
          }
        }
      }
    }
  }

  if (mode === "all" || mode === "concurrent") {
    console.log("\n📊 Running Concurrent Tests...\n");

    for (const { config } of filteredProviders) {
      const configModels = getEnabledModelsFromConfig(config.id);
      const models = filterModel
        ? config.models.filter(m => m.id === filterModel)
        : configModels
          ? config.models.filter(m => configModels.includes(m.id))
          : config.models.slice(0, 2);

      for (const model of models) {
        console.log(`Testing: ${config.name} / ${model.name}`);

        for (const concurrency of CONCURRENCY_LEVELS) {
          const result = await runConcurrentTest(config.id, model.id, concurrency, "simple");
          concurrentResults.push(result);

          console.log(
            `  Concurrency ${concurrency}: ` +
            `${result.successfulRequests}/${result.totalRequests} success, ` +
            `RPS=${result.rps}, avgTPS=${result.avgTps}`
          );
        }
      }
    }
  }

  const report: BenchmarkReport = {
    generatedAt: getBeijingTime(),
    tpsResults,
    concurrentResults,
    config: {
      concurrencyLevels: CONCURRENCY_LEVELS,
      promptTypes: ["simple", "complex"],
      timeout: 120000,
    },
  };

  const timestamp = getBeijingTimestamp();
  const mdPath = join(resultsDir, `benchmark-${timestamp}.md`);
  const mdLatestPath = join(resultsDir, "benchmark-latest.md");

  writeFileSync(mdPath, generateMarkdownReport(report));
  writeFileSync(mdLatestPath, generateMarkdownReport(report));

  console.log("\n✅ Benchmark Complete!");
  console.log(`📄 Markdown Report: ${mdPath}`);
  console.log(`📄 Latest Report: ${mdLatestPath}\n`);

  console.log("📈 Summary:");
  console.log(`   TPS Tests: ${tpsResults.filter(r => r.success).length}/${tpsResults.length} passed`);
  console.log(`   Concurrent Tests: ${concurrentResults.length} completed\n`);
}

runBenchmark().catch(console.error);