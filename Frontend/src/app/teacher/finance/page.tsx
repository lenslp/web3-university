'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useCourseMarket } from '@/hooks/useCourseMarket';
import RouterArtifact from '@/contracts/Router.json';

export default function TeacherFinancePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { useLensBalance, lensTokenAddress } = useCourseMarket();
  const lensBalance = useLensBalance(address);
  
  const routerAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS as `0x${string}`;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL as string | undefined;
  const usdtTokenAddress = (process.env.NEXT_PUBLIC_USDT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7') as `0x${string}`;
  const [mounted, setMounted] = useState(false);
  const [lensAmount, setLensAmount] = useState('');
  const [estimatedUsdt, setEstimatedUsdt] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slippage, setSlippage] = useState('1'); // 滑点 1%

  useEffect(() => {
    setMounted(true);
  }, []);

  // 估算输出（简化版，实际应调用 AMM getAmountOut）
  const estimateOutput = async () => {
    if (!lensAmount || !publicClient) return;
    
    try {
      // 这里简化处理，实际应该调用 AMM 的 getAmountOut 多次计算
      // LENS -> WETH -> USDT 的链式兑换
      const estimate = Number(lensAmount) * 0.02; // 假设 1 LENS ≈ 0.02 USDT
      setEstimatedUsdt(estimate.toFixed(2));
    } catch (err) {
      console.error('Estimate failed:', err);
    }
  };

  useEffect(() => {
    estimateOutput();
  }, [lensAmount]);

  const handleDeposit = async () => {
    if (!address || !publicClient || !lensAmount) {
      setError('请输入有效金额');
      return;
    }

    const amount = parseEther(lensAmount);
    if (amount <= BigInt(0)) {
      setError('金额必须大于 0');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // 1. 授权 Router 使用 LENS
      const approveTx = await writeContractAsync({
        address: lensTokenAddress,
        abi: [
          {
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'approve',
        args: [routerAddress, amount],
      });

      await publicClient!.waitForTransactionReceipt({ hash: approveTx });

      // 2. 通过后端获取 1inch swap calldata（fromAddress/receiver 均为 Router）
      if (!backendUrl) {
        throw new Error('缺少 NEXT_PUBLIC_API_URL 配置');
      }
      const chainId = (publicClient?.chain?.id ?? 1).toString();
      const params = new URLSearchParams({
        chainId,
        fromTokenAddress: lensTokenAddress,
        toTokenAddress: usdtTokenAddress,
        amountWei: amount.toString(),
        fromAddress: routerAddress,
        receiver: routerAddress,
        slippage,
      });
      const res = await fetch(`${backendUrl}/defi/1inch/swap-data?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`获取 1inch 数据失败: ${text}`);
      }
      const swap = await res.json();
      const toAmountStr: string | null = swap?.toAmount ?? null;
      // 3. 计算 minUsdtOut（按滑点基点法，避免浮点误差）
      let minUsdtOut = BigInt(0);
      if (toAmountStr) {
        const toAmount = BigInt(toAmountStr);
        const bps = Math.floor((1 - Number(slippage) / 100) * 10000);
        minUsdtOut = (toAmount * BigInt(bps)) / BigInt(10000);
      } else {
        // 回退：使用前端估算
        const slippagePercent = Number(slippage);
        minUsdtOut = parseEther((Number(estimatedUsdt) * (1 - slippagePercent / 100)).toFixed(6));
      }

      // 4. 调用合约新方法：合约内部执行 1inch 聚合兑换并存入 AAVE
      const depositTx = await writeContractAsync({
        address: routerAddress,
        abi: RouterArtifact.abi,
        functionName: 'depositLensVia1Inch',
        args: [amount, minUsdtOut, false, swap?.data as `0x${string}`],
      });

      await publicClient!.waitForTransactionReceipt({ hash: depositTx });

      setSuccess(`✅ 成功质押 ${lensAmount} LENS（经 1inch 兑换）到 AAVE！`);
      setLensAmount('');
      lensBalance.refetch?.();
    } catch (err: any) {
      setError(err?.message || '操作失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">连接钱包</h1>
          <p className="text-gray-400 mb-6">请先连接你的钱包以使用理财功能</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border border-white/20 mb-4">
              <span className="text-4xl">💰</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">LENS 理财</h1>
            <p className="text-gray-300 text-lg">
              将课程收益自动兑换为稳定币并质押到 AAVE 赚取利息
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
              {success}
            </div>
          )}

          {/* 余额显示 */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">LENS 余额</p>
                <p className="text-3xl font-bold text-white">
                  {lensBalance.data ? formatEther(lensBalance.data as bigint) : '0'} LENS
                </p>
              </div>
              <div className="text-5xl">💎</div>
            </div>
          </div>

          {/* 理财表单 */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">一键理财</h2>
            
            {/* 流程说明 */}
            <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-2">自动化流程</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>1️⃣ LENS → WETH（通过 AMM 兑换）</p>
                    <p>2️⃣ WETH → USDT（通过 AMM 兑换）</p>
                    <p>3️⃣ USDT → AAVE 质押（赚取利息）</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 输入金额 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                质押金额 (LENS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={lensAmount}
                  onChange={(e) => setLensAmount(e.target.value)}
                  placeholder="输入 LENS 数量"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/20 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
                <button
                  onClick={() => {
                    if (lensBalance.data) {
                      setLensAmount(formatEther(lensBalance.data as bigint));
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded transition-colors"
                >
                  最大
                </button>
              </div>
            </div>

            {/* 滑点设置 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                滑点容忍度 (%)
              </label>
              <div className="flex gap-3">
                {['0.5', '1', '2', '5'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      slippage === val
                        ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500'
                        : 'bg-white/5 text-gray-400 border-white/10'
                    } border`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* 预估输出 */}
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">预估获得 USDT</span>
                <span className="text-lg font-bold text-green-400">≈ {estimatedUsdt}</span>
              </div>
              <p className="text-xs text-gray-500">*预估值，实际以链上交易为准</p>
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleDeposit}
              disabled={isProcessing || !lensAmount || Number(lensAmount) <= 0}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all text-lg"
            >
              {isProcessing ? '处理中...' : '立即理财'}
            </button>
          </div>

          {/* 提示信息 */}
          <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-3">重要提示</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• 质押后将获得 aUSDT（生息凭证），可随时赎回</li>
                  <li>• 兑换过程会收取 AMM 手续费，注意滑点设置</li>
                  <li>• AAVE 收益率实时变动，以实际质押时为准</li>
                  <li>• 操作不可逆，请仔细确认金额</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
