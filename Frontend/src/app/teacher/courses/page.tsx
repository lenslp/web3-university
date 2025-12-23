'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import type React from 'react';
import { useCourseMarket } from '@/hooks/useCourseMarket';
import { formatEther } from 'viem';

interface TeacherCourse {
  id: bigint;
  title: string;
  description: string;
  price: bigint;
  author: string;
  uri: string;
  duration?: string;
  soldCount: number;
}

export default function MyCoursesPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { createCourse, isCourseSuccess, isCourseLoading, courseMarketAddress, COURSE_MARKET_ABI, updateCourse, deactivateCourse, useLensBalance, isUpdateSuccess, isDeleteSuccess, updateCourseRaw, deactivateCourseRaw } = useCourseMarket();

  const [mounted, setMounted] = useState(false);
  const lensBalance = useLensBalance(address);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingCourse, setEditingCourse] = useState<TeacherCourse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 防止 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  // 从链上加载教师课程（使用事件日志查询，效率更高）
  const loadTeacherCourses = useCallback(async () => {
    if (!address || !publicClient || !courseMarketAddress) return;
    
    setIsLoading(true);
    const teacherCourses: TeacherCourse[] = [];

    try {
      // 查询所有日志，然后过滤 Purchased 事件
      const allLogs = await publicClient.getLogs({
        address: courseMarketAddress,
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // 统计每门课程的购买次数
      const soldCountMap = new Map<string, number>();
      console.log(allLogs, 'aaaaaccccc');
      
      // 过滤 Purchased 事件（根据事件签名）
      // 事件签名: Purchased(uint256 indexed courseId, address indexed student)
      for (const log of allLogs) {
        if (log.topics && log.topics.length >= 2 && log.data && log.topics[1]) {
          try {
            // 从 topics[1] 解析 courseId (indexed 参数)
            const courseId = BigInt(log.topics[1]);
            const key = courseId.toString();
            soldCountMap.set(key, (soldCountMap.get(key) || 0) + 1);
          } catch (e) {
            // 忽略无法解析的日志
          }
        }
      }

      // 使用合约的 getAuthorCourses 函数一次性获取当前教师的所有课程数据（最高效）
      const coursesData = (await publicClient.readContract({
        address: courseMarketAddress,
        abi: COURSE_MARKET_ABI,
        functionName: 'getAuthorCourses',
        args: [address],
      })) as any[];
      
      // 直接使用返回的完整课程数据，无需额外查询
      for (const courseInfo of coursesData) {
        try {
          // CourseInfo 结构: {id, author, price, uri}
          const courseId: bigint = courseInfo?.id ?? courseInfo?.[0] ?? BigInt(0);
          const price: bigint = courseInfo?.price ?? courseInfo?.[2] ?? BigInt(0);
          const uri: string = courseInfo?.uri ?? courseInfo?.[3] ?? '';

          // 解析 URI 中的 JSON 数据
          let parsedData = { title: '', description: '', duration: '' };
          try {
            parsedData = JSON.parse(uri || '{}');
          } catch (e) {
            // 解析失败，使用默认值
          }

          teacherCourses.push({
            id: courseId,
            title: parsedData.title || `课程 #${courseId}`,
            description: parsedData.description || '暂无描述',
            price,
            author: address,
            uri,
            duration: parsedData.duration,
            soldCount: soldCountMap.get(courseId.toString()) || 0,
          });
        } catch (e) {
          // 跳过无效数据
        }
      }

      // 按课程 ID 倒序排列（最新的在前）
      teacherCourses.sort((a, b) => Number(b.id) - Number(a.id));

      setCourses(teacherCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
    setIsLoading(false);
  }, [address, publicClient, courseMarketAddress, COURSE_MARKET_ABI]);

  // 监听创建成功
  useEffect(() => {
    if (isCourseSuccess) {
      setIsCreating(false);
      setFormData({ title: '', description: '', price: '', duration: '' });
      setIsModalOpen(false);
      // 延迟以避免在 Hydrate 期间更新
      const timer = setTimeout(() => {
        loadTeacherCourses();
        lensBalance.refetch?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isCourseSuccess, loadTeacherCourses, lensBalance]);

  // 监听编辑成功
  useEffect(() => {
    if (isUpdateSuccess) {
      setIsUpdating(false);
      setIsEditModalOpen(false);
      setEditingCourse(null);
      // 延迟以避免在 Hydrate 期间更新
      const timer = setTimeout(() => {
        loadTeacherCourses();
        lensBalance.refetch?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess, loadTeacherCourses, lensBalance]);

  // 监听删除成功
  useEffect(() => {
    if (isDeleteSuccess) {
      setIsDeleting(false);
      // 延迟以避免在 Hydrate 期间更新
      const timer = setTimeout(() => {
        loadTeacherCourses();
        lensBalance.refetch?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isDeleteSuccess, loadTeacherCourses, lensBalance]);

  // 当地址变化时重新加载
  useEffect(() => {
    if (mounted && address && publicClient) {
      loadTeacherCourses();
    }
  }, [mounted, address, publicClient, loadTeacherCourses]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!address) {
      setErrorText('请先连接钱包');
      return;
    }

    if (!formData.title || !formData.description || !formData.price || !formData.duration) {
      setErrorText('请完善课程标题、描述、价格和时长。');
      return;
    }

    const priceNumber = Number(formData.price);
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setErrorText('请输入合法的价格。');
      return;
    }

    setIsCreating(true);

    try {
      // 序列化课程数据为 JSON URI
      const courseData = JSON.stringify({
        title: formData.title.trim(),
        description: formData.description.trim(),
        duration: formData.duration,
        createdAt: new Date().toISOString().slice(0, 10),
      });

      // 调用链上创建课程
      await createCourse(formData.price, courseData);
    } catch (err: any) {
      setErrorText(err?.message || '创建课程失败，请重试');
      setIsCreating(false);
    }
  };
  const handleDelete = async (courseId: bigint) => {
    if (!confirm('确定要删除这门课程吗？此操作将在链上执行。')) return;
    
    setIsDeleting(true);
    try {
      await deactivateCourse(courseId);
    } catch (error: any) {
      try {
        await deactivateCourseRaw(courseId);
      } catch (rawErr: any) {
        alert('删除失败: ' + (rawErr?.message || error?.message || '请重试'));
        setIsDeleting(false);
      }
    }
  };

  const handleEditClick = (course: TeacherCourse) => {
    setEditingCourse(course);
    setEditForm({
      title: course.title,
      description: course.description,
      price: formatEther(course.price),
      duration: course.duration || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const priceStr = editForm.price.trim();
    if (priceStr && (Number.isNaN(Number(priceStr)) || Number(priceStr) < 0)) {
      alert('请输入合法的价格');
      return;
    }

    setIsUpdating(true);
    try {
      const courseData = JSON.stringify({
        title: editForm.title.trim() || editingCourse.title,
        description: editForm.description.trim() || editingCourse.description,
        duration: editForm.duration,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      await updateCourse(editingCourse.id, priceStr || formatEther(editingCourse.price), courseData);
    } catch (error: any) {
      try {
        await updateCourseRaw(editingCourse.id, priceStr || formatEther(editingCourse.price), JSON.stringify({
          title: editForm.title.trim() || editingCourse.title,
          description: editForm.description.trim() || editingCourse.description,
          duration: editForm.duration,
          updatedAt: new Date().toISOString().slice(0, 10),
        }));
      } catch (rawErr: any) {
        alert('更新失败: ' + (rawErr?.message || error?.message || '请重试'));
        setIsUpdating(false);
      }
    }
  };

  // 根据搜索关键词过滤课程
  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    course.description.toLowerCase().includes(searchKeyword.toLowerCase())
  );

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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-3 text-white">课程控制台</h1>
            <p className="text-gray-300 text-lg max-w-2xl">
              在同一页面创建、管理和跟踪课程表现，实时掌握学生数与收益数据。
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!address || isCreating}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold"
            >
              {!address ? '请连接钱包' : '新建课程'}
            </button>
          </div>
        </div>

        <div className="mb-8">
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
              className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-white/20"
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
          {searchKeyword && (
            <p className="mt-3 text-sm text-gray-400 text-center">
              找到 {filteredCourses.length} 门课程
            </p>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => (isCreating ? null : setIsModalOpen(false))}
            />
            <div className="relative z-10 w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">创建新课程</h2>
                <button
                  onClick={() => (isCreating ? null : setIsModalOpen(false))}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">课程标题 *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="例如：Solidity 零基础入门"
                    className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">课程描述 *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="详细描述课程内容、学习成果与适合人群"
                    rows={4}
                    className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">课程价格 (LENS) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="例如：120"
                      min={0}
                      step={0.1}
                      className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">课程时长 *</label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="例如：6 周"
                      className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                {errorText && (
                  <div className="rounded-lg px-4 py-3 text-sm border bg-red-500/20 text-red-300 border-red-500/50">
                    {errorText}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || isCourseLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all"
                  >
                    {isCreating || isCourseLoading ? '创建中...' : '创建课程'}
                  </button>
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditModalOpen && editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setIsEditModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">编辑课程</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">课程标题</label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    placeholder="课程标题"
                    className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">课程描述</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    placeholder="课程描述"
                    rows={4}
                    className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">课程价格 (LENS)</label>
                    <input
                      type="number"
                      name="price"
                      value={editForm.price}
                      onChange={handleEditChange}
                      placeholder="价格"
                      min={0}
                      step={0.1}
                      className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">课程时长</label>
                    <input
                      type="text"
                      name="duration"
                      value={editForm.duration}
                      onChange={handleEditChange}
                      placeholder="例如：6 周"
                      className="w-full px-4 py-3 border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all"
                  >
                    {isUpdating ? '保存中...' : '保存修改'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isUpdating}
                    className="flex-1 bg-slate-700 text-gray-300 py-3 rounded-lg font-semibold hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
                <p className="text-xs text-gray-400">修改将在链上执行，请确保钱包已连接。</p>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">课程列表</h2>
            </div>
          </div>

          {!address ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/20 mx-auto mb-4">
                <span className="text-4xl">🔗</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">请连接钱包</h3>
              <p className="text-gray-400">连接后即可查看和创建课程</p>
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
              <h3 className="text-2xl font-bold mb-2 text-white">{courses.length === 0 ? '还没有课程' : '未找到匹配的课程'}</h3>
              <p className="text-gray-400 mb-6">{courses.length === 0 ? '在上方创建您的第一门课程吧' : '试试其他搜索关键词'}</p>
              {courses.length === 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold"
                >
                  立即创建
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group relative bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 flex flex-col h-full"
                >
                  {/* 装饰性渐变背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative p-6 flex flex-col h-full">
                    {/* 头部：标题和购买次数 */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-lg font-bold text-white leading-snug flex-1 line-clamp-2">{course.title}</h3>
                        <div className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-blue-500/50 backdrop-blur-md">
                          <span className="text-sm text-blue-200">已售</span>
                          <span className="text-lg font-bold text-blue-300">{course.soldCount}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">{course.description}</p>
                    </div>

                    {/* 中部：课程信息 */}
                    <div className="flex-1 mb-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">价格</p>
                          <p className="text-sm font-semibold text-green-400">{formatEther(course.price)} LENS</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">时长</p>
                          <p className="text-sm font-semibold text-purple-400">{course.duration || '未设置'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 底部：操作按钮 */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                      <button
                        onClick={() => handleEditClick(course)}
                        className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 font-semibold border border-white/20 hover:border-white/40"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg transition-all duration-200 font-semibold border border-red-500/30 hover:border-red-500/50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-3">教师提示</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• 课程数据存储在区块链上，确保数据永久性和透明度。</li>
                <li>• 收益以 LENS Token 实时结算到您的钱包。</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
