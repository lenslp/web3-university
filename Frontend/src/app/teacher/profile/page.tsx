'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage, usePublicClient } from 'wagmi';
import { useCourseMarket } from '@/hooks/useCourseMarket';
import type React from 'react';
import { formatEther } from 'viem';

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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TeacherProfilePage() {
  const publicClient = usePublicClient();
  const { COURSE_MARKET_ABI, courseMarketAddress, useLensBalance } = useCourseMarket();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: '👨‍🏫',
  });
  const [courses, setCourses] = useState<any[]>();
  const lensBalance = useLensBalance(address);
  
  // 加载用户资料
  useEffect(() => {
    const loadProfile = async () => {
      if (!address || !isConnected) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${BACKEND_URL}/profile?address=${address}`);
        if (!response.ok) throw new Error('Failed to load profile');
        const data = (await response.json()) as TeacherProfile;
        setProfile(data);
        setFormData({
          name: data.name,
          email: data.email,
          bio: data.bio,
          avatar: data.avatar,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    const loadCourseData = async () => {
      const coursesData = (await publicClient!.readContract({
        address: courseMarketAddress,
        abi: COURSE_MARKET_ABI,
        functionName: 'getAuthorCourses',
        args: [address],
      })) as any[];
      setCourses(coursesData);
    }

    loadProfile();
    loadCourseData();
  }, [address, isConnected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (avatar: string) => {
    setFormData((prev) => ({ ...prev, avatar }));
  };

  const handleSave = async () => {
    if (!address) {
      setError('Please connect wallet');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      // 签名消息
      const message = `Update profile for ${address}`;
      const signature = await signMessageAsync({ account: address, message });

      // 上传更新到后端
      const response = await fetch(`${BACKEND_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature,
          profile: formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update profile');
      const updated = (await response.json()) as TeacherProfile;
      setProfile(updated);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">连接钱包</h1>
          <p className="text-gray-400 mb-6">请先连接你的钱包以查看个人资料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-12">
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

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* 左侧：个人信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              {/* 头像 */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/30 to-purple-500/30 border border-white/20">
                  <span className="text-6xl">{profile?.avatar || '👨‍🏫'}</span>
                </div>
              </div>

              {/* 基本信息 */}
              {!isEditing ? (
                <>
                  <h2 className="text-2xl font-bold text-white text-center mb-2">{profile?.name || 'Unknown'}</h2>
                  <p className="text-gray-400 text-center text-sm mb-4">{profile?.email || 'No email'}</p>
                  <p className="text-gray-400 text-center text-sm mb-6 line-clamp-3">{profile?.bio || 'No bio'}</p>
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
                    <label className="text-xs text-gray-400 mb-1 block">头像</label>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {['👨‍🏫', '👩‍🏫', '🧑‍💼', '👨‍💻', '👩‍💻', '🧑‍🎓'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAvatarChange(emoji)}
                          className={`text-2xl p-2 rounded-lg transition-all ${
                            formData.avatar === emoji
                              ? 'bg-green-500/50 border-green-500'
                              : 'bg-white/10 border-white/20'
                          } border`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
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
                    <label className="text-xs text-gray-400 mb-1 block">邮箱</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
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
                      disabled={isSaving}
                      className="flex-1 px-3 py-2 bg-green-500/80 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition-all font-semibold"
                    >
                      {isSaving ? '保存中...' : '保存'}
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
                  <p className="text-sm font-mono text-blue-400 break-all">{profile?.walletAddress || address}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">加入日期</p>
                  <p className="text-sm text-gray-300">{profile?.joinDate || new Date().toLocaleDateString()}</p>
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
                  <p className="text-3xl font-bold text-green-400">{courses?.length || 0}</p>
                </div>
              </div>
              <div className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-yellow-500/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="text-4xl mb-3">💎</div>
                  <p className="text-gray-400 text-sm mb-2">总收益 (LENS)</p>
                  <p className="text-3xl font-bold text-yellow-400">{lensBalance?.data ? formatEther(lensBalance?.data as bigint) : '0'}</p>
                </div>
              </div>
            </div>

            {/* 认证信息 */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-4">专业认证</h3>
              <div className="space-y-2">
                {(profile?.certifications || []).length > 0 ? (
                  (profile?.certifications || []).map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                      <span className="text-xl">🏆</span>
                      <span className="text-gray-300">{cert}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">还没有获得任何认证</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
