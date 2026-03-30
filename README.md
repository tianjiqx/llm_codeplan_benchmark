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
| `--model` | 指定模型 ID | 测试配置中所有 | `--model=glm-4.7` |

> **注意**：当前版本不支持多参数值（如 `--provider=a,b`），每个参数只能指定单个值。

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

### `--model` 参数值

模型 ID 取决于提供商配置，详见下文"支持的模型"。需配合 `--provider` 参数使用。

示例：
```bash
# 测试百炼的 qwen3.5-plus 模型
bun run src/benchmark.ts --provider=bailian-coding-plan --model=qwen3.5-plus

# 测试火山引擎的 deepseek-v3.2 模型
bun run src/benchmark.ts --provider=volcengine --model=deepseek-v3.2
```

### 支持的模型

**百炼 Coding Plan (`bailian-coding-plan`)：**
| 模型 ID | 模型名称 |
|---------|----------|
| `qwen3.5-plus` | Qwen3.5 Plus |
| `qwen3-max-2026-01-23` | Qwen3 Max |
| `qwen3-coder-next` | Qwen3 Coder Next |
| `qwen3-coder-plus` | Qwen3 Coder Plus |
| `glm-5` | GLM-5 |
| `glm-4.7` | GLM-4.7 |
| `MiniMax-M2.5` | MiniMax M2.5 |
| `kimi-k2.5` | Kimi K2.5 |

**火山引擎 (`volcengine`)：**
| 模型 ID | 模型名称 |
|---------|----------|
| `glm-4.7` | GLM-4.7 |
| `deepseek-v3.2` | DeepSeek V3.2 ⚠️ |
| `kimi-k2.5` | Kimi K2.5 |
| `minimax-m2.5` | MiniMax M2.5 |
| `doubao-seed-2.0-pro` | Doubao-Seed-2.0-Pro |
| `doubao-seed-2.0-code` | Doubao-Seed-2.0-Code |

> ⚠️ **DeepSeek V3.2 注意**：该模型支持深度思考模式，处理复杂问题时会先进行内部推理（thinking），可能导致 TTFT 异常长（60-120秒）。详见"已知问题"。

**GLM Code Plan (`glm-codeplan`)：**
| 模型 ID | 模型名称 | 对应 Claude 模型 |
|---------|----------|------------------|
| `glm-5.1` | GLM-5.1 | - |
| `glm-4.7` | GLM-4.7 | Claude Opus/Sonnet |
| `glm-4.5-air` | GLM-4.5-Air | Claude Haiku |
| `glm-4-plus` | GLM-4 Plus | - |
| `glm-4-air` | GLM-4 Air | - |
| `glm-4-airx` | GLM-4 AirX | - |
| `glm-4-flash` | GLM-4 Flash | - |
| `glm-4-long` | GLM-4 Long | - |

### 使用示例

```bash
# 测试所有提供商的所有模型
bun run benchmark

# 仅测试 TPS
bun run src/benchmark.ts --mode=tps

# 仅测试 GLM Code Plan 提供商
bun run src/benchmark.ts --provider=glm-codeplan

# 仅测试 GLM-4.7 模型（需指定提供商）
bun run src/benchmark.ts --provider=glm-codeplan --model=glm-4.7

# 完整示例：测试火山引擎 DeepSeek V3.2 的 TPS
bun run src/benchmark.ts --mode=tps --provider=volcengine --model=deepseek-v3.2

# 测试百炼所有模型（配置中指定的）
bun run src/benchmark.ts --provider=bailian-coding-plan
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
    "repetitions": 3
  }
}
```

### 重复次数（repetitions）

默认每个测试运行 **3 次**，取平均值和标准差：

- 提高评测准确性
- 统计结果显示：平均值 ± 标准差
- 示例输出：`TTFT=30.45s (±0.12s), TPS=64.02 tok/s (±0.62)`

可修改配置中的 `repetitions` 值：
```json
{
  "test": {
    "repetitions": 5  // 每个测试运行 5 次
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

## 已知问题

### DeepSeek V3.2 深度思考模式导致 TTFT 异常

**现象**：火山引擎使用 DeepSeek V3.2 模型测试 complex prompt 时，TTFT 可能长达 60-120 秒。

**原因**：
- DeepSeek V3.2 支持深度思考（reasoning）模式
- 处理复杂问题时，模型会先进行内部推理（thinking）
- 思考过程不输出到 `textStream`，导致 TTFT 包含了思考时间
- 当前统计逻辑无法区分"思考时间"和"真正的生成延迟"

**影响**：
- TTFT 数值不准确（包含了思考时间）
- 生成 TPS 数值不准确（思考 tokens 未计入）
- 端到端 TPS 相对准确（基于总输出 tokens）

**临时解决方案**：
- 测试 DeepSeek V3.2 时使用 `--mode=tps --prompt=simple`（简单 prompt 触发思考较少）
- 对比测试时注意区分：thinking 模型 vs 非 thinking 模型

**未来改进**：
- 需要火山引擎 API 支持 `reasoning_tokens` 字段
- 需要修改统计逻辑，区分 thinking tokens 和 output tokens

## License

MIT