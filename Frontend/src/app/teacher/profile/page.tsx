'use client';

import Link from 'next/link';
import { useState } from 'react';
import type React from 'react';

interface TeacherProfile {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  walletAddress: string;
  joinDate: string;
  totalCourses: number;
  soldCourses: number;
  totalRevenue: number;
  rating: number;
  certifications: string[];
}

const mockProfile: TeacherProfile = {
  name: '张三',
  email: 'teacher@example.com',
  bio: 'Web3 教育者，擅长智能合约开发和区块链架构',
  avatar: '👨‍🏫',
  walletAddress: '0x1234...5678',
  joinDate: '2024-01-15',
  totalCourses: 5,
  soldCourses: 128,
  totalRevenue: 125000,
  rating: 4.8,
  certifications: ['以太坊开发者认证', 'Solidity专家', '区块链架构师'],
};

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile>(mockProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name,
    bio: profile.bio,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setProfile((prev) => ({
      ...prev,
      name: formData.name,
      bio: formData.bio,
    }));
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* 左侧：个人信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              {/* 头像 */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/30 to-purple-500/30 border border-white/20">
                  <span className="text-6xl">{profile.avatar}</span>
                </div>
              </div>

              {/* 基本信息 */}
              {!isEditing ? (
                <>
                  <h2 className="text-2xl font-bold text-white text-center mb-2">{profile.name}</h2>
                  <p className="text-gray-400 text-center text-sm mb-4">{profile.email}</p>
                  <p className="text-gray-400 text-center text-sm mb-6 line-clamp-3">{profile.bio}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-semibold border border-white/20"
                  >
                    编辑个人资料
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">名字</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">个人简介</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-3 py-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg transition-all font-semibold"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-semibold"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              <div className="border-t border-white/10 my-6" />

              {/* 账户信息 */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">钱包地址</p>
                  <p className="text-sm font-mono text-blue-400 break-all">{profile.walletAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">加入日期</p>
                  <p className="text-sm text-gray-300">{profile.joinDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：统计和认证 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 统计数据 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-green-500/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-gray-400 text-sm mb-2">已发布课程</p>
                  <p className="text-3xl font-bold text-green-400">{profile.totalCourses}</p>
                </div>
              </div>

              <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-blue-500/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-400 text-sm mb-2">已售课程</p>
                  <p className="text-3xl font-bold text-blue-400">{profile.soldCourses}</p>
                </div>
              </div>

              <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-yellow-500/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="text-4xl mb-3">💎</div>
                  <p className="text-gray-400 text-sm mb-2">总收益 (LENS)</p>
                  <p className="text-3xl font-bold text-yellow-400">{profile.totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-purple-500/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-gray-400 text-sm mb-2">平均评分</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-purple-400">{profile.rating}</p>
                    <p className="text-sm text-gray-400">/5.0</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 认证信息 */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-4">专业认证</h3>
              <div className="space-y-2">
                {profile.certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-xl">🏆</span>
                    <span className="text-gray-300">{cert}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
