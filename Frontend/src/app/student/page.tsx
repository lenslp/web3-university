'use client';

import Link from 'next/link';

export default function StudentHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center space-y-8 mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl">👨‍🎓</span>
            <h2 className="text-5xl font-bold text-white">学生中心</h2>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            探索丰富的 Web3 课程，购买您感兴趣的内容，并通过学习获得更多收益
          </p>

          <div className="flex gap-4 justify-center pt-4 flex-wrap">
            <Link
              href="/student/buy-lens"
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-lg text-lg hover:from-amber-600 hover:to-amber-700 transition-all font-semibold inline-block"
            >
              购买 LENS
            </Link>
            <Link
              href="/student/courses"
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold inline-block"
            >
              浏览课程
            </Link>
            <Link
              href="/student/profile"
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-lg text-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold inline-block"
            >
              个人中心
            </Link>
            <Link
              href="/student/earnings"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg text-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold inline-block"
            >
              我的收益
            </Link>
          </div>
        </div>

        {/* 功能特性卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-blue-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-400 text-sm mb-2">丰富课程</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                精选 Web3、Solidity、DeFi 等课程
              </p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-green-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-gray-400 text-sm mb-2">代币支付</p>
              <p className="text-gray-300 text-sm leading-relaxed">使用 LENS Token 购买课程</p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-yellow-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative">
              <div className="text-4xl mb-3">📈</div>
              <p className="text-gray-400 text-sm mb-2">被动收益</p>
              <p className="text-gray-300 text-sm leading-relaxed">存入 Aave 获得利息收入</p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative">
              <div className="text-4xl mb-3">🎓</div>
              <p className="text-gray-400 text-sm mb-2">专业讲师</p>
              <p className="text-gray-300 text-sm leading-relaxed">业界专家与顶级开发者</p>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">1000+</div>
              <p className="text-gray-300">已售课程</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">5000+</div>
              <p className="text-gray-300">活跃学生</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">50+</div>
              <p className="text-gray-300">优质讲师</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
