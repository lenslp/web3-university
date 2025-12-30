'use client';

import Link from "next/link";

export default function TeacherHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-20">
        <div className="text-center space-y-8 mb-24">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl">👨‍🏫</span>
            <h2 className="text-5xl font-bold text-white">教师中心</h2>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            创建和管理您的课程，获得课程销售收益
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/teacher/courses"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg text-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold inline-block"
            >
              创建课程
            </Link>
            <Link
              href="/teacher/profile"
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-lg text-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold inline-block"
            >
              个人中心
            </Link>
            <Link
              href="/teacher/finance"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-lg text-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-semibold inline-block"
            >
              理财中心
            </Link>
          </div>
        </div>

        {/* 功能特性卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-green-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="text-5xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold text-white mb-3">创建课程</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                轻松创建和发布您的课程，设置价格和学习内容
              </p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-orange-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">收益管理</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                实时查看课程销售收益，支持 LENS 结算
              </p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-3">安全保障</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                链上智能合约保障，课程版权和收益安全
              </p>
            </div>
          </div>

          <div className="group bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-yellow-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-white mb-3">LENS 理财</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                一键将 LENS 收益质押到 AAVE，赚取稳定收益
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
