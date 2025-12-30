'use client';

import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { useCourseMarket } from '@/hooks/useCourseMarket';

export default function TestContractPage() {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { useNextCourseId, courseMarketAddress, COURSE_MARKET_ABI } = useCourseMarket();
  const { data: nextCourseId, isLoading, isError, error } = useNextCourseId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-12">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">合约连接测试</h1>

        <div className="space-y-6">
          {/* 钱包连接状态 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">钱包状态</h2>
            <div className="space-y-2 text-gray-300">
              <p>
                连接状态:{' '}
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? '已连接' : '未连接'}
                </span>
              </p>
              <p>
                地址: <span className="text-blue-400">{address || '未连接'}</span>
              </p>
              <p>
                链名称: <span className="text-purple-400">{chain?.name || '未知'}</span>
              </p>
              <p>
                链 ID: <span className="text-yellow-400">{chainId || '未知'}</span>
              </p>
            </div>
          </div>

          {/* 合约配置 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">合约配置</h2>
            <div className="space-y-2 text-gray-300">
              <p>
                CourseMarket 地址:{' '}
                <span className="text-green-400 break-all">{courseMarketAddress || '未配置'}</span>
              </p>
              <p>
                ABI 长度: <span className="text-blue-400">{COURSE_MARKET_ABI?.length || 0}</span>
              </p>
              <p>
                PublicClient:{' '}
                <span className={publicClient ? 'text-green-400' : 'text-red-400'}>
                  {publicClient ? '已准备' : '未准备'}
                </span>
              </p>
            </div>
          </div>

          {/* NextCourseId 查询结果 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">NextCourseId 查询</h2>
            <div className="space-y-2 text-gray-300">
              <p>
                加载中:{' '}
                <span className={isLoading ? 'text-yellow-400' : 'text-gray-400'}>
                  {isLoading ? '是' : '否'}
                </span>
              </p>
              <p>
                错误:{' '}
                <span className={isError ? 'text-red-400' : 'text-green-400'}>
                  {isError ? '是' : '否'}
                </span>
              </p>
              {error && (
                <div className="mt-2 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-300 text-sm">错误信息: {error.message}</p>
                </div>
              )}
              <p>
                NextCourseId:{' '}
                <span className="text-2xl font-bold text-green-400">
                  {nextCourseId?.toString() || '未获取'}
                </span>
              </p>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">环境变量</h2>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>
                LENS_TOKEN: {process.env.NEXT_PUBLIC_LENS_TOKEN_ADDRESS ? '✅ 已配置' : '❌ 未配置'}
              </p>
              <p>
                COURSE_MARKET:{' '}
                {process.env.NEXT_PUBLIC_COURSE_MARKET_ADDRESS ? '✅ 已配置' : '❌ 未配置'}
              </p>
              <p>ROUTER: {process.env.NEXT_PUBLIC_ROUTER_ADDRESS ? '✅ 已配置' : '❌ 未配置'}</p>
              <p>
                WALLET_CONNECT_ID:{' '}
                {process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ? '✅ 已配置' : '❌ 未配置'}
              </p>
            </div>
          </div>

          {/* 操作建议 */}
          {!isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <p className="text-yellow-300">⚠️ 请先连接钱包（右上角）</p>
            </div>
          )}

          {isConnected && chainId !== 31337 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
              <p className="text-orange-300">⚠️ 请切换到 Localhost 网络（链 ID: 31337）</p>
              <p className="text-sm text-gray-400 mt-2">当前链 ID: {chainId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
