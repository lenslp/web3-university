'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSignMessage, usePublicClient } from 'wagmi';
import { SiweMessage } from 'siwe';

interface SessionData {
  token: string;
}

interface UseSiweAuthOptions {
  backendUrl?: string;
  sessionKey?: string; // localStorage 的 key 前缀
}

interface UseSiweAuthReturn {
  // 会话状态
  sessionToken: string | null;
  isSessionValid: boolean;
  // 工具方法
  isLoading: boolean;
  error: string | null;
  
  // 认证方法（完整流程：获取 nonce → 签名 → 验证 → 获取 token）
  authenticate: (address: string) => Promise<{ token: string; expiresIn: number }>;
}

/**
 * SIWE (Sign-In with Ethereum) 认证 Hook
 * 
 * 功能：
 * - 管理会话令牌（localStorage 持久化）
 * - 提供 SIWE 标准签名认证
 * - 提供认证后的 fetch 请求（自动 Bearer token）
 * - 支持会话过期自动清除
 */
export function useSiweAuth(options: UseSiweAuthOptions = {}): UseSiweAuthReturn {
  const {
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    sessionKey = 'siwe_session',
  } = options;

  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 判断会话是否有效（只检查 token 存在，真实过期由后端 401 决定）
  const isSessionValid = sessionToken !== null;

  // 保存会话到 localStorage 和 state
  const saveSession = useCallback((token: string) => {
    setSessionToken(token);
    localStorage.setItem(sessionKey, JSON.stringify({ token }));
  }, [sessionKey]);

  // 清除会话
  const clearSession = useCallback(() => {
    setSessionToken(null);
    localStorage.removeItem(sessionKey);
  }, [sessionKey]);

  // Hook 初始化时自动从 localStorage 恢复会话
  useEffect(() => {
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const { token } = JSON.parse(saved) as SessionData;
        setSessionToken(token);
      } catch (err) {
        clearSession();
      }
    }
  }, [sessionKey, clearSession]);

  // 发起 SIWE 签名认证
  const authenticate = useCallback(
    async (address: string): Promise<{ token: string; expiresIn: number }> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!publicClient) {
          throw new Error('Public client not initialized');
        }

        // 1. 获取 nonce
        const nonceResponse = await fetch(`${backendUrl}/profile/nonce?address=${address}`);
        if (!nonceResponse.ok) {
          throw new Error('Failed to get nonce');
        }
        const { nonce } = await nonceResponse.json();

        // 2. 构造 SIWE 消息
        const chainId = await publicClient.getChainId();
        const issuedAt = new Date();
        const expirationTime = new Date(issuedAt.getTime() + 5 * 60 * 1000).toISOString();

        const siweMessage = new SiweMessage({
          domain: typeof window !== 'undefined' ? window.location.host : '',
          address: address as `0x${string}`,
          statement: 'Sign in to Web3 University',
          uri: typeof window !== 'undefined' ? window.location.origin : '',
          version: '1',
          chainId,
          nonce,
          issuedAt: issuedAt.toISOString(),
          expirationTime,
        });

        const message = siweMessage.prepareMessage();

        // 3. 请求用户签名
        const signature = await signMessageAsync({ account: address as `0x${string}`, message });

        // 4. 提交签名，获取会话令牌
        const authResponse = await fetch(`${backendUrl}/profile/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, signature, message }),
        });

        if (!authResponse.ok) {
          const errorData = await authResponse.json().catch(() => ({}));
          throw new Error((errorData as any).message || 'Authentication failed');
        }

        const { token, expiresIn } = await authResponse.json();

        // 5. 保存会话令牌
        saveSession(token);

        return { token, expiresIn };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [publicClient, signMessageAsync, backendUrl, saveSession]
  );

  return {
    // 状态
    sessionToken,
    isSessionValid,
    isLoading,
    error,

    // 方法
    authenticate,
  };
}
