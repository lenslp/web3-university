# useSiweAuth Hook - 使用指南

> 通用的 SIWE 认证 Hook，支持教师端和学生端复用

## 📚 概览

`useSiweAuth` 是一个自定义 React Hook，封装了完整的 SIWE (Sign-In with Ethereum) 认证流程：

- ✅ 会话管理（localStorage 持久化）
- ✅ SIWE 标准签名认证
- ✅ 自动 Bearer Token 管理
- ✅ 会话过期检测

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { useSiweAuth } from '@/hooks/useSiweAuth';

function MyComponent() {
  const { 
    authenticate,           // 发起签名认证
    authenticatedFetch,     // 使用 token 的请求
    isSessionValid,         // 会话是否有效
    restoreSession,         // 恢复会话
  } = useSiweAuth();

  // 你的组件逻辑...
}
```

### 2. 完整示例：教师资料编辑

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSiweAuth } from '@/hooks/useSiweAuth';

export default function TeacherProfile() {
  const { address, isConnected } = useAccount();
  
  // ⭐ 使用 SIWE 认证 Hook
  const { 
    authenticate, 
    authenticatedFetch, 
    isSessionValid, 
    restoreSession,
  } = useSiweAuth();
  
  const [formData, setFormData] = useState({ name: '', email: '', bio: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // 恢复会话
  useEffect(() => {
    restoreSession(address);
  }, [address, restoreSession]);

  // 保存资料
  const handleSave = async () => {
    if (!address) return;

    try {
      setIsSaving(true);
      setError('');

      // 方案 A：会话有效，直接使用 token（无需签名弹窗）
      if (isSessionValid) {
        const { success } = await authenticatedFetch('/profile', {
          method: 'POST',
          body: JSON.stringify({ address, profile: formData }),
        });

        if (!success) {
          // 会话失效，需要重新认证
          await authenticateAndSave();
        }
      } 
      // 方案 B：会话无效，需要签名认证
      else {
        await authenticateAndSave();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // 认证并保存
  const authenticateAndSave = async () => {
    try {
      // 1. 发起 SIWE 认证（钱包弹窗）
      await authenticate(address!);

      // 2. 获得 token 后保存资料
      const { success, error: fetchError } = await authenticatedFetch('/profile', {
        method: 'POST',
        body: JSON.stringify({ address, profile: formData }),
      });

      if (!success) {
        throw new Error(fetchError || 'Failed to save profile');
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <div>
      <input 
        name="name" 
        value={formData.name} 
        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
      />
      {error && <div className="text-red-500">{error}</div>}
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
```

---

## 📖 API 参考

### `useSiweAuth(options?)`

#### 参数

```typescript
interface UseSiweAuthOptions {
  backendUrl?: string;      // 后端地址（默认: process.env.NEXT_PUBLIC_API_URL）
  sessionKey?: string;      // localStorage key 前缀（默认: 'siwe_session'）
}
```

#### 返回值

```typescript
interface UseSiweAuthReturn {
  // ===== 会话状态 =====
  sessionToken: string | null;        // 当前会话令牌
  isSessionValid: boolean;            // 会话是否有效
  isLoading: boolean;                 // 认证过程中是否加载中
  error: string | null;               // 错误信息

  // ===== 会话管理方法 =====
  saveSession: (token: string, expiryTime: number) => void;     // 保存会话
  clearSession: () => void;                                      // 清除会话
  restoreSession: (address: string | undefined) => Promise<void>; // 恢复会话

  // ===== 认证方法 =====
  authenticate: (address: string) => Promise<{ token: string; expiresIn: number }>;

  // ===== 数据请求方法 =====
  authenticatedFetch: <T = any>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<{ success: boolean; data?: T; error?: string }>;
}
```

---

## 🔄 使用流程

### 流程 1：首次认证（需要钱包签名）

```
1. 用户点击"保存"
   ↓
2. Hook 获取 nonce
   ↓
3. 构造 SIWE 消息
   ↓
4. 请求钱包签名（⭐ 用户看到签名弹窗）
   ↓
5. 验证签名，发放会话令牌
   ↓
6. 令牌存储到 localStorage
   ↓
7. 保存资料（使用令牌）
```

### 流程 2：后续操作（会话有效，无需签名）

```
1. 用户点击"保存"
   ↓
2. 检查 localStorage 中的会话
   ↓
3. 会话有效 ✅
   ↓
4. 直接发送请求（自动带 Bearer token）
   ↓
5. 保存资料（⭐ 无签名弹窗）
```

### 流程 3：会话过期（自动重新认证）

```
1. 使用过期令牌请求
   ↓
2. 后端返回 401 Unauthorized
   ↓
3. Hook 自动清除本地会话
   ↓
4. 回到流程 1（重新签名）
```

---

## 📋 常见场景

### 场景 1：编辑个人资料

```typescript
const handleSaveProfile = async () => {
  if (isSessionValid) {
    // 会话有效，直接保存
    const { success } = await authenticatedFetch('/profile', {
      method: 'POST',
      body: JSON.stringify({ address, profile: formData }),
    });

    if (!success) {
      // 重新认证
      await authenticate(address);
    }
  } else {
    // 会话无效，需要签名
    await authenticate(address);
    const { success } = await authenticatedFetch('/profile', {
      method: 'POST',
      body: JSON.stringify({ address, profile: formData }),
    });
  }
};
```

### 场景 2：发布课程

```typescript
const handlePublishCourse = async (courseData: any) => {
  // 如果没有会话，先认证
  if (!isSessionValid) {
    await authenticate(address!);
  }

  // 使用 token 发布课程
  const { success, data, error } = await authenticatedFetch('/courses', {
    method: 'POST',
    body: JSON.stringify({ courseData }),
  });

  if (!success) {
    if (error === 'Session expired') {
      // 重新认证后重试
      await authenticate(address!);
      return handlePublishCourse(courseData);
    }
    throw new Error(error);
  }

  return data;
};
```

### 场景 3：更新账户设置

```typescript
const handleUpdateSettings = async (settings: any) => {
  const { success, error } = await authenticatedFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

  if (!success && error?.includes('Session')) {
    // 会话失效，重新认证
    await authenticate(address!);
    return handleUpdateSettings(settings);
  }

  return success;
};
```

---

## 🔒 安全特性

### 1. localStorage 安全

- ✅ 只存储 token（32位十六进制），不存储敏感数据
- ✅ Token 绑定地址，无法跨账户使用
- ✅ 自动过期（5分钟后失效）

### 2. 防重放攻击

- ✅ 每次签名使用唯一 nonce
- ✅ Nonce 使用后立即删除
- ✅ SIWE 标准验证签名有效期

### 3. 会话管理

- ✅ 401 自动清除本地会话
- ✅ 支持多账户切换（不同 address 的 localStorage key 不同）
- ✅ 自动恢复会话（组件挂载时）

---

## 📝 最佳实践

### 1. 在页面顶级使用

```typescript
// ✅ 好
function Page() {
  const { authenticate, authenticatedFetch, isSessionValid } = useSiweAuth();
  // ...
}

// ❌ 不好
function Button() {
  // 在组件内部条件调用
  if (condition) {
    const { authenticate } = useSiweAuth();
  }
}
```

### 2. 处理会话过期

```typescript
// ✅ 好：自动重试
const { success, error } = await authenticatedFetch('/endpoint', options);
if (!success && error?.includes('expired')) {
  await authenticate(address);
  return authenticatedFetch('/endpoint', options);
}

// ❌ 不好：忽略错误
const { success } = await authenticatedFetch('/endpoint', options);
if (!success) return; // 没有重试逻辑
```

### 3. 加载初始化会话

```typescript
// ✅ 好：组件挂载时恢复会话
useEffect(() => {
  restoreSession(address);
}, [address, restoreSession]);

// ❌ 不好：没有恢复
// ... (用户刷新页面后会话丢失)
```

---

## 🐛 常见问题

### Q1: 为什么会话过期?

**A**: 会话有效期为 5 分钟，这是 SIWE 标准的安全做法。5 分钟后用户需要重新签名。

### Q2: 能修改会话时间吗？

**A**: 可以在后端修改，修改 `/profile/auth` 的 `expiresIn` 返回值：

```typescript
// 后端：修改会话有效期为 30 分钟
return {
  token: sessionToken,
  expiresIn: 30 * 60, // 从 5*60 改为 30*60
};
```

### Q3: 多个标签页会不会冲突？

**A**: 不会。相同 address 的 localStorage key 在多个标签页是共享的，后一个标签页的会话会覆盖前一个，都能正常工作。

### Q4: 能在非认证页面使用吗？

**A**: 可以，但要检查 `isSessionValid` 再使用 `authenticatedFetch`：

```typescript
if (isSessionValid) {
  const { success, data } = await authenticatedFetch('/data');
}
```

---

## 📚 文件列表

- `Frontend/src/hooks/useSiweAuth.ts` - Hook 实现
- `Frontend/src/app/teacher/profile/page.tsx` - 教师端使用示例
- `Frontend/src/app/student/profile/page.tsx` - 学生端使用示例
- `签名.md` - SIWE 完整文档

---

**最后更新**: 2025-12-26  
**版本**: 1.0.0  
**状态**: ✅ 生产可用
