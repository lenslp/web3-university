'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import type React from 'react';
import { useCourseMarket } from '@/hooks/useCourseMarket';
import { formatEther } from 'viem';

interface StudentCourse {
  id: bigint;
  title: string;
  description: string;
  price: bigint;
  author: string;
  uri: string;
  duration?: string;
  soldCount: number;
  isPurchased: boolean;
}

export default function StudentCoursesPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { buyCourse, approveLens, COURSE_MARKET_ABI, LENS_TOKEN_ABI, lensTokenAddress, courseMarketAddress, useLensBalance, isCourseSuccess, isCourseLoading } = useCourseMarket();

  const [mounted, setMounted] = useState(false);
  const lensBalance = useLensBalance(address);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'purchased' | 'unpurchased'>('all');
  const [approvingCourseId, setApprovingCourseId] = useState<bigint | null>(null);
  const [buyingCourseId, setBuyingCourseId] = useState<bigint | null>(null);

  // 防止 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  // 购买成功后重新加载
  useEffect(() => {
    if (isCourseSuccess) {
      setApprovingCourseId(null);
      setBuyingCourseId(null);
      loadAllCourses();
      lensBalance.refetch?.();
    }
  }, [isCourseSuccess]);

  // 加载所有课程
  const loadAllCourses = async () => {
    if (!address || !publicClient || !courseMarketAddress) return;
    
    setIsLoading(true);
    const allCourses: StudentCourse[] = [];

    try {
      // 查询所有 Purchased 事件以统计购买次数
      const purchasedLogs = await publicClient.getLogs({
        address: courseMarketAddress,
        event: {
          type: 'event',
          name: 'Purchased',
          inputs: [
            { type: 'uint256', indexed: true, name: 'courseId' },
            { type: 'address', indexed: true, name: 'student' },
          ],
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });
      
      // 统计每门课程的购买次数和当前用户是否购买过
      const soldCountMap = new Map<string, number>();
      const userPurchasedSet = new Set<string>();
      for (const purchaseLog of purchasedLogs) {
        const { courseId, student } = purchaseLog.args as { courseId: bigint; student: string };
        const key = courseId.toString();
        soldCountMap.set(key, (soldCountMap.get(key) || 0) + 1);
        
        if (student?.toLowerCase() === address.toLowerCase()) {
          userPurchasedSet.add(key);
        }
      }

      // 使用 getAllCourses 直接获取所有激活课程
      const courseInfos = (await publicClient.readContract({
        address: courseMarketAddress,
        abi: COURSE_MARKET_ABI,
        functionName: 'getAllCourses',
      })) as any[];

      // 处理返回的课程数据（使用合约 hasAccess 判断是否已购）
      for (const courseInfo of courseInfos) {
        try {
          const id: bigint = courseInfo.id;
          const author: string = courseInfo.author;
          const price: bigint = courseInfo.price;
          const uri: string = courseInfo.uri;

          // 解析 URI 中的 JSON 数据
          let parsedData = { title: '', description: '', duration: '' };
          try {
            parsedData = JSON.parse(uri || '{}');
          } catch (e) {
            // 解析失败，使用默认值
          }

          // 合约查询用户是否已购，优先于日志判断
          const hasAccess = await publicClient.readContract({
            address: courseMarketAddress,
            abi: COURSE_MARKET_ABI,
            functionName: 'hasAccess',
            args: [id, address],
          }) as boolean;

          allCourses.push({
            id,
            title: parsedData.title || `课程 #${id}`,
            description: parsedData.description || '暂无描述',
            price,
            author,
            uri,
            duration: parsedData.duration,
            soldCount: soldCountMap.get(id.toString()) || 0,
            isPurchased: hasAccess,
          });
        } catch (e) {
          // 处理失败，跳过该课程
        }
      }

      // 按课程 ID 倒序排列（最新的在前）
      allCourses.sort((a, b) => Number(b.id) - Number(a.id));

      setCourses(allCourses);
    } catch (error) {
      setCourses([]);
    }

    setIsLoading(false);
  };

  // 当地址变化时重新加载
  useEffect(() => {
    if (mounted && address && publicClient) {
      loadAllCourses();
    }
  }, [address, mounted, publicClient]);

  // 过滤课程
  const filteredCourses = courses.filter(course => {
    // 搜索过滤
    const matchesSearch = course.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      course.description.toLowerCase().includes(searchKeyword.toLowerCase());
    
    // 购买状态过滤
    if (selectedFilter === 'purchased') {
      return matchesSearch && course.isPurchased;
    } else if (selectedFilter === 'unpurchased') {
      return matchesSearch && !course.isPurchased;
    }
    
    return matchesSearch;
  });

  const handleApproveThenBuy = async (course: StudentCourse) => {
    if (!address || !publicClient || !lensTokenAddress) {
      alert('请先连接钱包');
      return;
    }

    setApprovingCourseId(course.id);
    try {
      // 0) 购买前拦截：如果已购则阻止重复购买
      const alreadyPurchased = await publicClient.readContract({
        address: courseMarketAddress,
        abi: COURSE_MARKET_ABI,
        functionName: 'hasAccess',
        args: [course.id, address],
      }) as boolean;
      if (alreadyPurchased) {
        setApprovingCourseId(null);
        alert('您已购买该课程，无需重复购买');
        return;
      }

      // 1) 基础校验：余额、课程价格、允许度
      const [allowance, balance] = await Promise.all([
        publicClient.readContract({
          address: lensTokenAddress,
          abi: LENS_TOKEN_ABI,
          functionName: 'allowance',
          args: [address, courseMarketAddress],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: lensTokenAddress,
          abi: LENS_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        }) as Promise<bigint>,
      ]);

      if (balance < course.price) {
        throw new Error('余额不足，需至少 ' + formatEther(course.price) + ' LENS');
      }

      // 2) 如授权不足，先授权并等待确认
      if (allowance < course.price) {
        const approveHash = await approveLens(formatEther(course.price));
        if (approveHash) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      setApprovingCourseId(null);
      setBuyingCourseId(course.id);

      // 3) 购买前模拟，提前拿到 revert 原因
      await publicClient.simulateContract({
        account: address,
        address: courseMarketAddress,
        abi: COURSE_MARKET_ABI,
        functionName: 'buy',
        args: [course.id],
      });

      // 4) 正式购买并等待确认
      const buyHash = await buyCourse(course.id);
      if (buyHash) {
        await publicClient.waitForTransactionReceipt({ hash: buyHash });
      }
    } catch (err: any) {
      alert('授权或购买失败: ' + (err?.shortMessage || err?.message || '请重试'));
    } finally {
      setApprovingCourseId(null);
      setBuyingCourseId(null);
    }
  };

  // 服务器端渲染时显示加载状态
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
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3 text-white">课程市场</h1>
          <p className="text-gray-300 text-lg">
            发现并购买高质量的 Web3 课程，学习最新的区块链技术
          </p>
        </div>

        {/* 搜索和过滤 */}
        <div className="mb-8 space-y-4">
          {/* 搜索框 */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索课程名称或描述..."
              className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-white/20"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 过滤按钮 */}
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              全部课程
            </button>
            <button
              onClick={() => setSelectedFilter('unpurchased')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                selectedFilter === 'unpurchased'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              未购买
            </button>
            <button
              onClick={() => setSelectedFilter('purchased')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                selectedFilter === 'purchased'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              已购买
            </button>
          </div>
        </div>

        {/* 课程列表 */}
        {!address ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/20 mx-auto mb-4">
              <span className="text-4xl">🔗</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">请连接钱包</h3>
            <p className="text-gray-400">连接后即可浏览和购买课程</p>
          </div>
        ) : isLoading ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-purple-500/20 mx-auto mb-4">
              <span className="text-4xl animate-spin">⏳</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">加载中...</h3>
            <p className="text-gray-400">正在从区块链查询课程数据</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-purple-500/20 mx-auto mb-4">
              <span className="text-4xl">{courses.length === 0 ? '📖' : '🔍'}</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">{courses.length === 0 ? '暂无课程' : '未找到匹配的课程'}</h3>
            <p className="text-gray-400">{courses.length === 0 ? '敬请期待更多课程上线' : '试试其他搜索关键词'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group relative bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 flex flex-col h-full"
              >
                {/* 装饰性渐变背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-6 flex flex-col h-full">
                  {/* 头部：标题和购买状态 */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-bold text-white leading-snug flex-1 line-clamp-2">{course.title}</h3>
                      {course.isPurchased && (
                        <div className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-md">
                          <span className="text-lg">✓</span>
                          <span className="text-xs text-green-300 font-semibold">已购</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{course.description}</p>
                  </div>

                  {/* 中部：课程信息 */}
                  <div className="flex-1 mb-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">价格</p>
                          <p className="text-sm font-semibold text-blue-400">{formatEther(course.price)} LENS</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">时长</p>
                          <p className="text-sm font-semibold text-purple-400">{course.duration || '未设置'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">讲师</p>
                          <p className="text-xs font-semibold text-gray-300 truncate" title={course.author}>
                            {course.author.slice(0, 6)}...{course.author.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部：操作按钮 */}
                  {course.isPurchased ? (
                    <button
                      disabled
                      className="w-full px-4 py-3 bg-green-500/10 text-green-300 rounded-lg transition-all duration-200 font-semibold border border-green-500/30 cursor-default"
                    >
                      ✓ 已购买
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproveThenBuy(course)}
                      disabled={approvingCourseId === course.id || buyingCourseId === course.id || isCourseLoading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                    >
                      {approvingCourseId === course.id ? '授权中...' : buyingCourseId === course.id ? '购买中...' : '购买课程'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 余额提示 */}
        {address && (
          <div className="mt-12 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-3">购买前须知</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• 您的 LENS 余额: <span className="font-semibold text-white">{lensBalance.data ? formatEther(lensBalance.data as bigint) : '0'} LENS</span></li>
                  <li>• 购买课程需要授权 LENS Token，请确保钱包中有足够余额</li>
                  <li>• 购买后可以永久访问课程内容</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
