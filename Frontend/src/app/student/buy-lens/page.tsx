'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import type React from 'react';
import { useCourseMarket } from '@/hooks/useCourseMarket';

export default function BuyLensPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { swapEthForLens, ammAddress, lensTokenAddress, wethAddress, AMM_ABI, useLensBalance, isSwapSuccess } = useCourseMarket();

  const [mounted, setMounted] = useState(false);
  const [ethAmount, setEthAmount] = useState('');
  const [estimatedLens, setEstimatedLens] = useState('0');
  const [loading, setLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: 未开始, 1: 包装ETH, 2: 授权, 3: 交换
  const lensBalance = useLensBalance(address);
  const [errorMsg, setErrorMsg] = useState('');
  const [slippage, setSlippage] = useState('0.5'); // 0.5% default slippage

  useEffect(() => {
    setMounted(true);
  }, []);

  // 交换成功后重新加载余额
  useEffect(() => {
    if (isSwapSuccess) {
      setEthAmount('');
      lensBalance.refetch?.();
      setIsSwapping(false);
      setCurrentStep(0);
    }
  }, [isSwapSuccess]);

  // 估算输出（使用 WETH 地址）
  const estimateSwap = async (ethValue: string) => {
    if (!ethValue || parseFloat(ethValue) <= 0 || !publicClient || !ammAddress || !lensTokenAddress || !wethAddress) {
      setEstimatedLens('0');
      return;
    }

    try {
      setLoading(true);
      const amountIn = parseEther(ethValue);
      
      const amountOut = await publicClient.readContract({
        address: ammAddress,
        abi: AMM_ABI,
        functionName: 'getAmountOut',
        args: [
          wethAddress, // 使用 WETH 地址而不是 address(0)
          lensTokenAddress,
          amountIn
        ],
      }) as bigint;

      setEstimatedLens(formatEther(amountOut));
    } catch (e) {
      console.error('Error estimating swap:', e);
      setEstimatedLens('0');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      estimateSwap(ethAmount);
    }, 500);
    return () => clearTimeout(timer);
  }, [ethAmount]);

  const handleSwap = async () => {
    if (!address || !publicClient || !ammAddress || !lensTokenAddress || !wethAddress) {
      setErrorMsg('请先连接钱包');
      return;
    }

    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setErrorMsg('请输入有效的 ETH 数量');
      return;
    }

    setErrorMsg('');
    setIsSwapping(true);

    try {
      const minLens = (parseFloat(estimatedLens) * (1 - parseFloat(slippage) / 100)).toString();
      
      console.log('Starting swap with 3 steps...');
      setCurrentStep(1); // 包装 ETH
      
      // 执行三步交换流程
      await swapEthForLens(ethAmount, minLens);
      
      console.log('Swap completed successfully!');
    } catch (e: any) {
      console.error('Swap error:', e);
      setErrorMsg(e?.shortMessage || e?.message || '交换失败，请重试');
      setIsSwapping(false);
      setCurrentStep(0);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 text-white">购买 LENS 币</h1>
            <p className="text-gray-300 text-lg">用 ETH 交换 LENS 币，用于购买课程</p>
          </div>

          {!address ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/20 mx-auto mb-4">
                <span className="text-4xl">🔗</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">请连接钱包</h3>
              <p className="text-gray-400">连接钱包后即可开始购买 LENS</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 交易卡片 */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                <div className="space-y-6">
                  {/* ETH 输入 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      支付金额 (ETH)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={ethAmount}
                        onChange={(e) => setEthAmount(e.target.value)}
                        placeholder="输入 ETH 数量"
                        min="0"
                        step="0.01"
                        disabled={isSwapping}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      />
                      <span className="absolute right-4 top-3 text-gray-400">ETH</span>
                    </div>
                  </div>

                  {/* 兑换箭头 */}
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                      </svg>
                    </div>
                  </div>

                  {/* LENS 输出 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      获得金额 (LENS)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={estimatedLens}
                        disabled
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 rounded-lg text-white placeholder-gray-400 opacity-60"
                      />
                      <span className="absolute right-4 top-3 text-gray-400">LENS</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">实际数量会根据滑点影响</p>
                  </div>

                  {/* 滑点设置 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      允许滑点 (%)
                    </label>
                    <input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      min="0"
                      max="50"
                      step="0.1"
                      disabled={isSwapping}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>

                  {/* 错误提示 */}
                  {errorMsg && (
                    <div className="rounded-lg px-4 py-3 text-sm border bg-red-500/20 text-red-300 border-red-500/50">
                      {errorMsg}
                    </div>
                  )}

                  {/* 交换按钮 */}
                  <button
                    onClick={handleSwap}
                    disabled={isSwapping || loading || !ethAmount || parseFloat(ethAmount) <= 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold"
                  >
                    {isSwapping ? '交换中...' : '立即兑换'}
                  </button>
                  
                  {/* 交换中提示 */}
                  {isSwapping && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                        <p className="text-sm text-blue-300">
                          正在处理交易，请在钱包中确认...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 余额展示 */}
              <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">您的 LENS 余额</h3>
                <p className="text-3xl font-bold text-white">
                  {lensBalance.data ? formatEther(lensBalance.data as bigint) : '0'}
                </p>
                <p className="text-sm text-gray-400 mt-2">交换后的 LENS 币可用于购买课程</p>
              </div>

              {/* 提示 */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">交换说明</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 交换价格由 AMM 自动计算，含 0.3% 手续费</li>
                      <li>• 交换过程中可能需要确认多个钱包签名</li>
                      <li>• 交换后的 LENS 币可立即用于购买课程</li>
                      <li>• 设置合理的滑点以保护交易不失败</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
