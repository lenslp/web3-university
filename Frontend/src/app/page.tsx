'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-20">
        <div className="text-center space-y-8 mb-24">
          <h2 className="text-6xl font-bold text-white mb-4">
            Web3 University
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            去中心化学习平台，使用区块链技术，让知识传播更透明、更公平
          </p>
          
          <p className="text-lg text-gray-400 pt-4">
            选择您的角色以继续
          </p>
          
          <div className="flex gap-6 justify-center pt-8 max-w-4xl mx-auto">
            <Link 
              href="/student"
              className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-8 py-8 rounded-xl text-center hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <div className="text-4xl mb-3">👨‍🎓</div>
              <div className="text-2xl mb-2">学生端</div>
              <div className="text-sm text-blue-100">
                浏览课程，购买学习，获得收益
              </div>
            </Link>
            <Link 
              href="/teacher"
              className="flex-1 bg-gradient-to-br from-green-500 to-green-600 text-white px-8 py-8 rounded-xl text-center hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <div className="text-4xl mb-3">👨‍🏫</div>
              <div className="text-2xl mb-2">教师端</div>
              <div className="text-sm text-green-100">
                创建课程，管理学生，获得收益
              </div>
            </Link>
          </div>
        </div>

        {/* 功能特性卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all">
            <div className="text-5xl mb-4">📖</div>
            <h3 className="text-xl font-semibold text-white mb-3">优质课程</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              区块链、Web3、智能合约等前沿技术课程，由业界专家精心打磨
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-green-400/50 hover:bg-white/10 transition-all">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-white mb-3">代币经济</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              使用 LENS Token 购买课程，享受去中心化支付和课程所有权
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-pink-400/50 hover:bg-white/10 transition-all">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-3">安全可靠</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              基于以太坊智能合约，所有交易透明、永久可追溯
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-orange-400/50 hover:bg-white/10 transition-all">
            <div className="text-5xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-white mb-3">Aave 理财</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              平台收益自动存入 Aave，持续获得利息收入
            </p>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl p-12 backdrop-blur-sm">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">1000+</div>
              <p className="text-gray-300">已售课程</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">5000+</div>
              <p className="text-gray-300">活跃学习者</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">50+</div>
              <p className="text-gray-300">优质讲师</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-400 mb-2">100万+</div>
              <p className="text-gray-300">累计 LENS 发行</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
