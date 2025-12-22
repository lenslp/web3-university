'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { useCourseMarket } from '../../../hooks/useCourseMarket';
import { useDefi } from '../../../hooks/useDefi';
import { formatEther } from 'viem';
import { useToast } from '../../../components/ToastProvider';

export default function StudentEarningsPage() {
  const { address, isConnected } = useAccount();
  const [swapAmount, setSwapAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'swapping'>('idle');
  const [useAave, setUseAave] = useState(true);
  const { showToast } = useToast();
  
  const { useLensBalance } = useCourseMarket();
  const { 
    approveRouter, 
    swapAndDeposit, 
    useATokenBalance,
    isSwapLoading,
    isSwapSuccess,
    isApproveLoading,
    isApproveSuccess
  } = useDefi();

  const { data: lensBalance } = useLensBalance(address);
  const { data: aTokenBalance } = useATokenBalance(address);

  // 监听授权成功
  useEffect(() => {
    if (isApproveSuccess && step === 'approving') {
      showToast('授权成功！正在执行兑换...', 'success');
      setStep('swapping');
      swapAndDeposit(swapAmount, useAave);
    }
  }, [isApproveSuccess, step]);

  // 监听兑换成功
  useEffect(() => {
    if (isSwapSuccess && step === 'swapping') {
      showToast(
        useAave ? '兑换成功并已存入 Aave！🎉' : '兑换 USDT 成功！',
        'success'
      );
      setSwapAmount('');
      setStep('idle');
    }
  }, [isSwapSuccess, step, useAave]);

  const handleSwap = async () => {
    if (!address) {
      showToast('请先连接钱包', 'error');
      return;
    }
    
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      showToast('请输入有效的兑换数量', 'error');
      return;
    }
    
    setStep('approving');
    try {
      showToast('正在授权 Router 使用 LENS...', 'loading');
      await approveRouter(swapAmount);
    } catch (error: any) {
      console.error('Swap failed:', error);
      showToast(error?.message || '兑换失败，请重试', 'error');
      setStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">我的收益</h1>
          <p className="text-gray-300 text-lg">
            将 LENS Token 兑换为 USDT，并存入 Aave 获得被动收益
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
            <p className="text-yellow-400 text-center font-medium">
              请先连接钱包查看收益
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* 余额卡片 */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">资产概览</h3>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">LENS Token</p>
                <p className="text-3xl font-bold text-blue-400">
                  {lensBalance !== undefined ? formatEther(lensBalance) : '0'} LENS
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Aave 存款 (aUSDT)</p>
                <p className="text-3xl font-bold text-green-400">
                  {aTokenBalance !== undefined ? formatEther(aTokenBalance) : '0'} aUSDT
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  持续产生利息收益
                </p>
              </div>
            </div>

            {/* Swap 操作卡片 */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-4">兑换并存入</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    LENS 数量
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                    />
                    <button
                      onClick={() => {
                        if (lensBalance) {
                          setSwapAmount(formatEther(lensBalance));
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-purple-400 font-semibold hover:text-purple-300"
                    >
                      最大
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    可用余额: {lensBalance !== undefined ? formatEther(lensBalance) : '0'} LENS
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">兑换路径</span>
                    <span className="text-sm font-medium text-gray-300">LENS → WETH → USDT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">预估滑点</span>
                    <span className="text-sm font-medium text-green-400">~5%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div>
                    <p className="font-medium text-white">存入 Aave</p>
                    <p className="text-xs text-gray-400">自动获取 aUSDT 持续收益</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAave}
                      onChange={(e) => setUseAave(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <button
                  onClick={handleSwap}
                  disabled={!swapAmount || step !== 'idle'}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all"
                >
                  {step === 'approving'
                    ? '授权中...'
                    : step === 'swapping'
                    ? '兑换中...'
                    : useAave
                    ? '兑换并存入 Aave'
                    : '仅兑换为 USDT'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 说明卡片 */}
        <div className="bg-white/5 backdrop-blur-lg border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">💡 工作原理</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-blue-400">1. 购买课程</strong>：使用 LENS Token 购买课程，LENS 会转入课程市场合约</p>
            <p><strong className="text-green-400">2. 兑换收益</strong>：通过 AMM 将 LENS 兑换为 WETH，再兑换为 USDT</p>
            <p><strong className="text-yellow-400">3. Aave 存款</strong>：USDT 自动存入 Aave，获得 aUSDT 凭证并持续获取利息</p>
            <p><strong className="text-purple-400">4. 随时提取</strong>：aUSDT 可随时从 Aave 提取回 USDT</p>
          </div>
        </div>
      </main>
    </div>
  );
}
