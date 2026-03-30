/**
 * LLM 基准测试类型定义
 */

/** 提供商配置 */
export interface ProviderConfig {
  id: string;
  name: string;
  npm: "anthropic" | "openai-compatible";
  baseURL: string;
  apiKey: string;
  models: ModelConfig[];
}

/** 模型配置 */
export interface ModelConfig {
  id: string;
  name: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

/** TPS 测试结果 */
export interface TPSResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptType: "simple" | "complex";
  /** 首 token 延迟 (ms) */
  ttft: number;
  /** 总生成时间 (ms) */
  totalTime: number;
  /** 生成时间 (ms，不含 TTFT) */
  generationTime: number;
  /** 输入 tokens 数 */
  inputTokens: number;
  /** 输出 tokens 数 */
  outputTokens: number;
  /** 生成 TPS (tokens/生成时间) */
  tps: number;
  /** 端到端 TPS (tokens/总时间) */
  totalTps: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 测试时间戳 */
  timestamp: string;
}

/** 多次运行 TPS 汇总结果 */
export interface AggregatedTPSResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptType: "simple" | "complex";
  /** 运行次数 */
  runs: number;
  /** 成功次数 */
  successfulRuns: number;
  /** 首 token 延迟统计 */
  ttft: StatisticsSummary;
  /** 总时间统计 */
  totalTime: StatisticsSummary;
  /** 生成时间统计 */
  generationTime: StatisticsSummary;
  /** 输出 tokens 统计 */
  outputTokens: StatisticsSummary;
  /** 生成 TPS 统计 */
  tps: StatisticsSummary;
  /** 端到端 TPS 统计 */
  totalTps: StatisticsSummary;
  /** 整体是否成功 */
  success: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 原始单次结果 */
  rawResults: TPSResult[];
  /** 测试时间戳 */
  timestamp: string;
}

/** 单次请求结果 */
export interface RequestResult {
  providerId: string;
  modelId: string;
  success: boolean;
  totalTime: number;
  ttft?: number;
  outputTokens?: number;
  tps?: number;
  error?: string;
}

/** 并发测试结果 */
export interface ConcurrentResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptType: "simple" | "complex";
  concurrency: number;
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 成功率 (%) */
  successRate: number;
  /** 平均响应时间 (ms) - 仅成功请求 */
  avgResponseTime: number;
  /** 最小响应时间 (ms) - 仅成功请求 */
  minResponseTime: number;
  /** 最大响应时间 (ms) - 仅成功请求 */
  maxResponseTime: number;
  /** 平均 TPS - 仅成功请求 */
  avgTps: number;
  /** 请求/秒 */
  rps: number;
  /** 总测试时间 (ms) */
  totalTestTime: number;
  /** 失败请求的错误信息列表 */
  errors: string[];
  /** 各请求详情 */
  requestDetails: RequestResult[];
  /** 测试时间戳 */
  timestamp: string;
}

/** 多次运行并发测试汇总结果 */
export interface AggregatedConcurrentResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptType: "simple" | "complex";
  concurrency: number;
  /** 运行次数 */
  runs: number;
  /** 成功次数 */
  successfulRuns: number;
  /** 总请求数统计 */
  totalRequests: number;
  /** 成功率统计 */
  successRate: StatisticsSummary;
  /** 平均响应时间统计 */
  avgResponseTime: StatisticsSummary;
  /** 平均 TPS 统计 */
  avgTps: StatisticsSummary;
  /** RPS 统计 */
  rps: StatisticsSummary;
  /** 整体是否成功 */
  success: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 原始单次结果 */
  rawResults: ConcurrentResult[];
  /** 测试时间戳 */
  timestamp: string;
}

/** 基准测试报告 */
export interface BenchmarkReport {
  /** 报告生成时间 */
  generatedAt: string;
  /** TPS 测试结果 */
  tpsResults: TPSResult[];
  /** 并发测试结果 */
  concurrentResults: ConcurrentResult[];
  /** TPS 汇总结果（多次运行） */
  aggregatedTPSResults?: AggregatedTPSResult[];
  /** 并发测试汇总结果（多次运行） */
  aggregatedConcurrentResults?: AggregatedConcurrentResult[];
  /** 测试配置 */
  config: {
    concurrencyLevels: number[];
    promptTypes: ("simple" | "complex")[];
    timeout: number;
    repetitions: number;
  };
}

/** 测试配置 */
export interface TestConfig {
  /** 并发级别 */
  concurrencyLevels: number[];
  /** Prompt 类型 */
  promptTypes: ("simple" | "complex")[];
  /** 请求超时 (ms) */
  timeout: number;
  /** 每个测试重复次数 */
  repetitions: number;
}

/** Prompt 定义 */
export interface PromptDefinition {
  type: "simple" | "complex";
  systemPrompt?: string;
  userPrompt: string;
  /** 预期输出长度 */
  expectedOutputLength?: number;
}

/** 统计摘要 */
export interface StatisticsSummary {
  count: number;
  mean: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}