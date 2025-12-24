import FriendlyErrorsWebpackPlugin from '@soda/friendly-errors-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // 只在开发模式下添加友好错误插件
    if (dev) {
      // 清理默认的 stats 配置，减少冗余输出
      config.stats = 'none';
      config.infrastructureLogging = {
        level: 'error',
      };

      // 添加友好错误提示插件
      config.plugins.push(
        new FriendlyErrorsWebpackPlugin({
          compilationSuccessInfo: {
            messages: [
              `应用运行在: http://localhost:${isServer ? '3000' : '3000'}`,
              `环境: ${dev ? '开发模式' : '生产模式'}`,
            ],
            notes: ['编译成功！开始愉快地编码吧 🎉'],
          },
          // 自定义错误和警告的输出格式
          clearConsole: true,
          additionalFormatters: [],
          additionalTransformers: [],
        })
      );
    }

    return config;
  },
};

export default nextConfig;
