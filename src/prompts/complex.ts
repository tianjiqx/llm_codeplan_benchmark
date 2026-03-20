/**
 * 复杂 Prompt 定义
 * 包含上下文，测试上下文处理能力
 */

import type { PromptDefinition } from "../types";

/**
 * 代码上下文示例
 */
const codeContext = `
以下是一个 TypeScript 函数的实现：

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

async function fetchUsers(filter: {
  minAge?: number;
  nameContains?: string;
}): Promise<User[]> {
  const response = await fetch('/api/users');
  const users: User[] = await response.json();
  
  return users.filter(user => {
    if (filter.minAge !== undefined && user.age < filter.minAge) {
      return false;
    }
    if (filter.nameContains && !user.name.includes(filter.nameContains)) {
      return false;
    }
    return true;
  });
}

async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      createdAt: new Date(),
    }),
  });
  return response.json();
}

async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function deleteUser(id: string): Promise<void> {
  await fetch(\`/api/users/\${id}\`, {
    method: 'DELETE',
  });
}
\`\`\`
`;

/**
 * 系统设计上下文示例
 */
const systemDesignContext = `
系统架构概述：

我们正在构建一个电商系统，包含以下模块：

1. 用户模块 (User Module)
   - 用户注册、登录、权限管理
   - 支持 OAuth2.0 第三方登录
   - 用户画像和行为分析

2. 商品模块 (Product Module)
   - 商品 CRUD 操作
   - 商品分类和标签管理
   - 库存管理和预警

3. 订单模块 (Order Module)
   - 购物车功能
   - 订单创建、支付、发货、完成
   - 订单退款和售后

4. 支付模块 (Payment Module)
   - 支持支付宝、微信支付
   - 支付回调处理
   - 退款处理

技术栈：
- 后端: Node.js + Express + TypeScript
- 数据库: PostgreSQL + Redis
- 消息队列: RabbitMQ
- 缓存: Redis
- 日志: ELK Stack

数据库表设计：

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);
\`\`\`
`;

export const complexPrompts: PromptDefinition[] = [
  {
    type: "complex",
    systemPrompt: "你是一个经验丰富的软件工程师，精通 TypeScript 和 Node.js 开发。",
    userPrompt: `${codeContext}\n\n请分析以上代码，指出潜在的问题和改进建议，并给出优化后的代码实现。`,
    expectedOutputLength: 500,
  },
  {
    type: "complex",
    systemPrompt: "你是一个系统架构师，擅长设计高可用、可扩展的分布式系统。",
    userPrompt: `${systemDesignContext}\n\n请基于以上需求，设计一个完整的服务架构图（用文字描述），包括：\n1. 服务拆分建议\n2. 各服务之间的通信方式\n3. 数据一致性方案\n4. 缓存策略`,
    expectedOutputLength: 800,
  },
  {
    type: "complex",
    systemPrompt: "你是一个代码审查专家，擅长发现代码中的 bug 和安全问题。",
    userPrompt: `${codeContext}\n\n请对以上代码进行全面的代码审查，包括：\n1. 潜在的 bug\n2. 安全隐患\n3. 性能问题\n4. 代码风格和最佳实践`,
    expectedOutputLength: 400,
  },
];

/**
 * 默认复杂 prompt（用于单一测试）
 */
export const defaultComplexPrompt: PromptDefinition = complexPrompts[0];