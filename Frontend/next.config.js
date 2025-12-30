import FriendlyErrorsWebpackPlugin from '@soda/friendly-errors-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // 排除这些 Node.js 模块，防止被打包到浏览器代码中
    // pino-pretty: 日志美化工具（服务端专用）
    // lokijs: 内存数据库（服务端专用）
    // encoding: 字符编码工具（服务端专用）
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // 配置 Node.js 核心模块在浏览器环境中的处理方式
    // 设为 false 表示不使用 polyfill，如果代码中使用了这些模块会报错
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,      // 文件系统（浏览器无法访问磁盘）
      net: false,     // 网络通信（浏览器有自己的网络 API）
      tls: false,     // TLS/SSL 加密（浏览器不支持）
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
