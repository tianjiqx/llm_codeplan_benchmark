# LLM CodePlan Benchmark

LLM 提供商基准性能测试工具，用于测量不同 LLM 后端服务的 TPS（Tokens Per Second）和并发能力。

## 功能特性

- **TPS 测试**：测量单个请求的 token 生成速度
  - Time to First Token (TTFT) - 首 token 延迟
  - 生成 TPS - 纯生成速度（tokens/生成时间）
  - 端到端 TPS - 总体速度（tokens/总时间）

- **并发测试**：测量不同并发级别下的性能
  - 支持并发数：1, 2, 5, 10
  - 成功率统计
  - 平均响应时间
  - 请求/秒 (RPS)

- **支持提供商**
  - 百炼 Coding Plan (`bailian-coding-plan`)
  - 火山引擎 (`volcengine`)
  - GLM Code Plan (`glm-codeplan`)

## 快速开始

### 1. 安装依赖

```bash
cd /home/tianjiqx/workspace/llm_codeplan_benchmark
bun install
```

### 2. 配置 API Keys

复制配置模板并填入你的 API keys：

```bash
cp config/providers.example.json config/providers.json
# 编辑 config/providers.json，填入你的 API keys
```

配置文件格式：

```json
{
  "providers": {
    "bailian-coding-plan": {
      "apiKey": "your-bailian-api-key",
      "models": ["qwen3.5-plus", "glm-5"]
    },
    "volcengine": {
      "apiKey": "your-volcengine-api-key",
      "models": ["glm-4.7", "deepseek-v3.2"]
    },
    "glm-codeplan": {
      "apiKey": "your-zhipu-api-key",
      "models": ["glm-4.7", "glm-4.5-air"]
    }
  }
}
```

### 3. 运行测试

```bash
# 运行完整基准测试（所有提供商）
bun run benchmark

# 仅运行 TPS 测试
bun run benchmark:tps

# 仅运行并发测试
bun run benchmark:concurrent

# 仅测试百炼提供商
bun run benchmark:bailian

# 仅测试火山引擎提供商
bun run benchmark:volcengine

# 仅测试 GLM Code Plan 提供商
bun run benchmark:glm
```

## 命令行参数

```bash
bun run src/benchmark.ts [options]
```

### 参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--mode` | 测试模式 | `all` | `--mode=tps` |
| `--provider` | 指定提供商 ID | 测试所有 | `--provider=glm-codeplan` |
| `--model` | 指定模型 ID | 测试所有 | `--model=glm-4.7` |

### `--mode` 参数值

| 值 | 说明 |
|----|------|
| `all` | 运行 TPS 测试和并发测试 |
| `tps` | 仅运行 TPS 测试 |
| `concurrent` | 仅运行并发测试 |

### `--provider` 参数值

| 值 | 说明 |
|----|------|
| `bailian-coding-plan` | 百炼 Coding Plan |
| `volcengine` | 火山引擎 |
| `glm-codeplan` | GLM Code Plan |

### 支持的模型

**百炼 Coding Plan (`bailian-coding-plan`)：**
- `qwen3.5-plus` - Qwen3.5 Plus
- `qwen3-max-2026-01-23` - Qwen3 Max
- `qwen3-coder-next` - Qwen3 Coder Next
- `qwen3-coder-plus` - Qwen3 Coder Plus
- `glm-5` - GLM-5
- `glm-4.7` - GLM-4.7
- `MiniMax-M2.5` - MiniMax M2.5
- `kimi-k2.5` - Kimi K2.5

**火山引擎 (`volcengine`)：**
- `glm-4.7` - GLM-4.7
- `deepseek-v3.2` - DeepSeek V3.2
- `kimi-k2.5` - Kimi K2.5
- `minimax-m2.5` - MiniMax M2.5
- `doubao-seed-2.0-pro` - Doubao-Seed-2.0-Pro
- `doubao-seed-2.0-code` - Doubao-Seed-2.0-Code

**GLM Code Plan (`glm-codeplan`)：**
- `glm-5.1` - GLM-5.1
- `glm-4.7` - GLM-4.7（对应 Claude Opus/Sonnet）
- `glm-4.5-air` - GLM-4.5-Air（对应 Claude Haiku）
- `glm-4-plus` - GLM-4 Plus
- `glm-4-air` - GLM-4 Air
- `glm-4-airx` - GLM-4 AirX
- `glm-4-flash` - GLM-4 Flash
- `glm-4-long` - GLM-4 Long

> **注意**：GLM Code Plan 使用 Claude 模型名称作为前端映射，实际后端使用 GLM 模型：
> - Claude Opus/Sonnet → GLM-4.7
> - Claude Haiku → GLM-4.5-Air

### 使用示例

```bash
# 测试所有提供商的所有模型
bun run benchmark

# 仅测试 TPS
bun run src/benchmark.ts --mode=tps

# 仅测试 GLM Code Plan 提供商
bun run src/benchmark.ts --provider=glm-codeplan

# 仅测试 GLM-4.7 模型
bun run src/benchmark.ts --provider=glm-codeplan --model=glm-4.7

# 完整示例：测试 GLM Code Plan 的 TPS
bun run src/benchmark.ts --mode=tps --provider=glm-codeplan --model=glm-4.7
```

## 测试配置

### 并发级别

默认测试并发数：1, 2, 5, 10

可在 `config/providers.json` 中自定义：

```json
{
  "test": {
    "concurrencyLevels": [1, 2, 5, 10, 20],
    "timeout": 120000,
    "repetitions": 1
  }
}
```

### Prompt 类型

- **简单 Prompt**：固定短 prompt（约 20 字），测量纯生成速度
- **复杂 Prompt**：包含约 2000 字上下文，测试上下文处理能力

## 结果输出

测试结果将输出到 `results/` 目录：

```
results/
├── benchmark-2026-03-20T17-44-02.md    # 带时间戳的 Markdown 报告
└── benchmark-latest.md                  # 最新结果
```

### 报告内容

**TPS 测试结果：**
| 指标 | 说明 |
|------|------|
| TTFT | 首 token 延迟（秒） |
| 总时间 | 端到端总时间（秒） |
| 生成时间 | 实际生成时间（秒） |
| 输出 Tokens | 生成的 token 数量 |
| 生成 TPS | 纯生成速度（tok/s） |
| 端到端 TPS | 总体速度（tok/s） |

**并发测试结果：**
- 并发数
- 成功/失败请求数
- 成功率
- 平均/最小/最大响应时间
- 平均 TPS
- RPS（请求/秒）

## 项目结构

```
llm_codeplan_benchmark/
├── src/
│   ├── types.ts              # 类型定义
│   ├── utils.ts              # 工具函数
│   ├── config.ts             # 配置文件读取
│   ├── benchmark.ts          # 主入口脚本
│   ├── prompts/
│   │   ├── simple.ts         # 简单 prompts
│   │   └── complex.ts        # 复杂 prompts
│   └── providers/
│       ├── bailian.ts        # 百炼提供商
│       ├── volcengine.ts     # 火山引擎提供商
│       └── glm-codeplan.ts   # GLM Code Plan 提供商
├── config/
│   ├── providers.example.json
│   └── providers.json        # 实际配置（不提交）
├── results/                  # 测试结果输出
├── package.json
└── README.md
```

## 注意事项

1. **API Key 安全**：请确保 `config/providers.json` 不被提交到版本控制
2. **API 限流**：高并发测试可能触发 API 限流，请根据实际情况调整并发级别
3. **网络稳定**：测试前请确保网络稳定

## License

MIT