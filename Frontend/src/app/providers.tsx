'use client';

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from '../wagmi';

// 在客户端入口加载 WDYR（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  // 路径相对 Frontend 根目录的 .wdyr.ts
  require('../..' + '/.wdyr');
}

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
