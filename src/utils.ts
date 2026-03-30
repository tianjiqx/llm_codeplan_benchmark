/**
 * 工具函数
 */

import type { StatisticsSummary, TPSResult, ConcurrentResult, BenchmarkReport, AggregatedTPSResult, AggregatedConcurrentResult } from "./types";

/**
 * 计算统计数据
 */
export function calculateStatistics(values: number[]): StatisticsSummary {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      min: 0,
      max: 0,
      median: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  const p95Index = Math.ceil(count * 0.95) - 1;
  const p99Index = Math.ceil(count * 0.99) - 1;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    mean: Math.round(mean * 100) / 100,
    min: sorted[0],
    max: sorted[count - 1],
    median: Math.round(median * 100) / 100,
    p95: sorted[Math.min(p95Index, count - 1)],
    p99: sorted[Math.min(p99Index, count - 1)],
    stdDev: Math.round(stdDev * 100) / 100,
  };
}

/**
 * 高精度计时器
 */
export class Timer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  elapsed(): number {
    return (this.endTime || performance.now()) - this.startTime;
  }
}

/**
 * 格式化时间 (ms)
 */
export function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 格式化 TPS
 */
export function formatTps(tps: number): string {
  return `${tps.toFixed(2)} tok/s`;
}

/**
 * 生成 Markdown 报告
 */
export function generateMarkdownReport(report: BenchmarkReport): string {
  const lines: string[] = [
    `# LLM 基准测试报告`,
    ``,
    `> 生成时间: ${report.generatedAt}`,
    ``,
    `## 测试配置`,
    ``,
    `- 并发级别: ${report.config.concurrencyLevels.join(", ")}`,
    `- Prompt 类型: ${report.config.promptTypes.join(", ")}`,
    `- 超时时间: ${report.config.timeout}ms`,
    `- 重复次数: ${report.config.repetitions}`,
    ``,
  ];

  // 优先使用汇总结果（多次运行）
  if (report.aggregatedTPSResults && report.aggregatedTPSResults.length > 0) {
    lines.push(`## TPS 测试结果 (${report.config.repetitions} 次运行平均)`, ``);

    const grouped = groupBy(report.aggregatedTPSResults, r => `${r.providerName}|${r.promptType}`);

    for (const [key, results] of Object.entries(grouped)) {
      const [providerName, promptType] = key.split("|");
      lines.push(`### ${providerName} - ${promptType === "simple" ? "简单" : "复杂"} Prompt`, ``);
      lines.push(`| 模型 | TTFT | 总时间 | 生成 TPS | 端到端 TPS | 成功/运行 |`);
      lines.push(`|------|------|--------|----------|------------|-----------|`);

      for (const r of results) {
        const successInfo = `${r.successfulRuns}/${r.runs}`;
        if (r.success) {
          lines.push(
            `| ${r.modelName} | ` +
            `${formatStats(r.ttft)} | ` +
            `${formatStats(r.totalTime)} | ` +
            `${formatTpsStats(r.tps)} | ` +
            `${formatTpsStats(r.totalTps)} | ` +
            `${successInfo} |`
          );
        } else {
          lines.push(`| ${r.modelName} | - | - | - | - | ${successInfo} ❌ |`);
        }
      }
      lines.push(``);
    }
  } else if (report.tpsResults.length > 0) {
    lines.push(`## TPS 测试结果`, ``);

    const grouped = groupBy(report.tpsResults, r => `${r.providerName}|${r.promptType}`);

    for (const [key, results] of Object.entries(grouped)) {
      const [providerName, promptType] = key.split("|");
      lines.push(`### ${providerName} - ${promptType === "simple" ? "简单" : "复杂"} Prompt`, ``);
      lines.push(`| 模型 | TTFT | 总时间 | 生成时间 | 输出 Tokens | 生成 TPS | 端到端 TPS | 状态 |`);
      lines.push(`|------|------|--------|----------|-------------|----------|------------|------|`);

      for (const r of results) {
        const status = r.success ? "✅" : "❌";
        const ttft = r.success ? formatTime(r.ttft) : "-";
        const totalTime = r.success ? formatTime(r.totalTime) : "-";
        const genTime = r.success ? formatTime(r.generationTime) : "-";
        const outputTokens = r.success ? r.outputTokens : "-";
        const tps = r.success ? formatTps(r.tps) : "-";
        const totalTps = r.success ? formatTps(r.totalTps) : "-";
        lines.push(
          `| ${r.modelName} | ${ttft} | ${totalTime} | ${genTime} | ${outputTokens} | ${tps} | ${totalTps} | ${status} |`
        );
      }
      lines.push(``);
    }
  }

  // 并发测试汇总结果
  if (report.aggregatedConcurrentResults && report.aggregatedConcurrentResults.length > 0) {
    lines.push(`## 并发测试结果 (${report.config.repetitions} 次运行平均)`, ``);

    const byProvider = groupBy(report.aggregatedConcurrentResults, r => r.providerName);

    for (const [providerName, results] of Object.entries(byProvider)) {
      lines.push(`### ${providerName}`, ``);

      const byPromptType = groupBy(results, r => r.promptType);

      for (const [promptType, promptResults] of Object.entries(byPromptType)) {
        lines.push(`#### ${promptType === "simple" ? "简单" : "复杂"} Prompt`, ``);
        lines.push(`| 模型 | 并发数 | 成功率 | 平均响应 | 平均 TPS | RPS | 成功/运行 |`);
        lines.push(`|------|--------|--------|----------|----------|-----|-----------|`);

        for (const r of promptResults) {
          const successInfo = `${r.successfulRuns}/${r.runs}`;
          if (r.success) {
            lines.push(
              `| ${r.modelName} | ${r.concurrency} | ` +
              `${r.successRate.mean.toFixed(1)}% | ` +
              `${formatStats(r.avgResponseTime)} | ` +
              `${formatTpsStats(r.avgTps)} | ` +
              `${formatStats(r.rps)} | ` +
              `${successInfo} |`
            );
          } else {
            lines.push(`| ${r.modelName} | ${r.concurrency} | - | - | - | - | ${successInfo} ❌ |`);
          }
        }
        lines.push(``);
      }
    }
  } else if (report.concurrentResults.length > 0) {
    lines.push(`## 并发测试结果`, ``);

    const byProvider = groupBy(report.concurrentResults, r => r.providerName);

    for (const [providerName, results] of Object.entries(byProvider)) {
      lines.push(`### ${providerName}`, ``);

      const byPromptType = groupBy(results, r => r.promptType);

      for (const [promptType, promptResults] of Object.entries(byPromptType)) {
        lines.push(`#### ${promptType === "simple" ? "简单" : "复杂"} Prompt`, ``);
        lines.push(
          `| 模型 | 并发数 | 成功率 | 平均响应 | 最小响应 | 最大响应 | 平均 TPS | RPS | 错误 |`
        );
        lines.push(
          `|------|--------|--------|----------|----------|----------|----------|-----|------|`
        );

        for (const r of promptResults) {
          const errorInfo = r.errors.length > 0 
            ? r.errors.map(e => e.length > 50 ? e.slice(0, 50) + "..." : e).join("; ")
            : "-";
          lines.push(
            `| ${r.modelName} | ${r.concurrency} | ${r.successRate.toFixed(1)}% | ` +
            `${formatTime(r.avgResponseTime)} | ${formatTime(r.minResponseTime)} | ` +
            `${formatTime(r.maxResponseTime)} | ${formatTps(r.avgTps)} | ${r.rps.toFixed(2)} | ${errorInfo} |`
          );
        }
        lines.push(``);
      }
    }
  }

  return lines.join("\n");
}

function formatStats(stats: StatisticsSummary): string {
  return `${(stats.mean / 1000).toFixed(2)}s (±${(stats.stdDev / 1000).toFixed(2)}s)`;
}

function formatTpsStats(stats: StatisticsSummary): string {
  return `${stats.mean.toFixed(2)} (±${stats.stdDev.toFixed(2)}) tok/s`;
}

/**
 * 分组辅助函数
 */
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * 打印测试进度
 */
export function printProgress(
  current: number,
  total: number,
  message: string
): void {
  const percent = ((current / total) * 100).toFixed(0);
  const bar = "█".repeat(Math.floor((current / total) * 20)) +
              "░".repeat(20 - Math.floor((current / total) * 20));
  console.log(`[${bar}] ${percent}% (${current}/${total}) ${message}`);
}

/**
 * 创建延迟 Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * 读取环境变量或配置文件中的 API key
 */
export function getApiKey(providerId: string, envVar: string, configValue?: string): string {
  // 优先使用环境变量
  const envKey = process.env[envVar];
  if (envKey) return envKey;

  // 其次使用配置文件值
  if (configValue) return configValue;

  throw new Error(
    `API key not found for provider ${providerId}. ` +
    `Please set ${envVar} environment variable or configure it in config/providers.json`
  );
}