/**
 * 简单 Prompt 定义
 * 用于测量纯生成速度
 */

import type { PromptDefinition } from "../types";

export const simplePrompts: PromptDefinition[] = [
  {
    type: "simple",
    userPrompt: "请用中文写一首关于春天的诗，大约100字。",
    expectedOutputLength: 100,
  },
  {
    type: "simple",
    userPrompt: "请用中文解释什么是递归，举一个简单的例子。",
    expectedOutputLength: 200,
  },
  {
    type: "simple",
    userPrompt: "请列出5个提高编程效率的方法。",
    expectedOutputLength: 150,
  },
];

/**
 * 默认简单 prompt（用于单一测试）
 */
export const defaultSimplePrompt: PromptDefinition = simplePrompts[0];