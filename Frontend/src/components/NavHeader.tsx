'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  id: string;
  label: string;
};

export function NavHeader() {
  const pathname = usePathname();

  // 判断当前是学生端还是教师端
  const isStudentMode = pathname.startsWith('/student');
  const isTeacherMode = pathname.startsWith('/teacher');
  const isHome = pathname === '/';

  // 获取对应的导航项
  const getNavItems = (): NavItem[] => {
    if (isStudentMode) {
      return [
        { href: '/student', id: 'home', label: '首页' },
        { href: '/student/courses', id: 'courses', label: '课程' },
        { href: '/student/buy-lens', id: 'buy-lens', label: '购买 LENS' },
        // { href: '/student/earnings', id: 'earnings', label: '收益' },
        { href: '/student/profile', id: 'profile', label: '个人中心' },
      ];
    }
    if (isTeacherMode) {
      return [
        { href: '/teacher', id: 'home', label: '首页' },
        { href: '/teacher/courses', id: 'courses', label: '我的课程' },
        { href: '/teacher/finance', id: 'finance', label: '理财中心' },
        { href: '/teacher/profile', id: 'profile', label: '个人中心' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const getCurrentPage = (): string => {
    if (isStudentMode) {
      if (pathname === '/student') return 'home';
      if (pathname.startsWith('/student/courses')) return 'courses';
      if (pathname.startsWith('/student/buy-lens')) return 'buy-lens';
      if (pathname.startsWith('/student/earnings')) return 'earnings';
      if (pathname.startsWith('/student/profile')) return 'profile';
    }
    if (isTeacherMode) {
      if (pathname === '/teacher') return 'home';
      if (pathname.startsWith('/teacher/courses')) return 'courses';
      if (pathname.startsWith('/teacher/profile')) return 'profile';
      if (pathname.startsWith('/teacher/finance')) return 'finance';
    }
    return 'home';
  };

  const currentPage = getCurrentPage();

  const itemBase = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors';

  // 在首页或无导航项时隐藏导航
  if (isHome || navItems.length === 0) {
    return (
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="mr-4 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-lg">
              📚
            </span>
            <span className="hidden text-xl font-extrabold tracking-tight sm:inline bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Web3 University
            </span>
          </Link>
          <div className="flex-1" />
          <div className="ml-4">
            <ConnectButton chainStatus="full" accountStatus="address" showBalance />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* 左侧 LOGO */}
        <Link href="/" className="mr-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-lg">
            📚
          </span>
          <span className="hidden text-xl font-extrabold tracking-tight sm:inline bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Web3 University
          </span>
        </Link>

        {/* 中间导航：胶囊容器 */}
        <div className="flex flex-1 justify-center">
          <div className="flex items-center gap-2 rounded-full px-2 py-1">
            {navItems.map((item) => {
              const active = item.id === currentPage;
              const darkActive = 'bg-white/20 text-white';
              const darkIdle = 'text-white/80 hover:text-white hover:bg-white/10';
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={
                    itemBase + ' ' + (active ? darkActive : darkIdle)
                  }
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 右侧连接钱包：显示网络与地址 */}
        <div className="ml-4">
          <ConnectButton chainStatus="full" accountStatus="address" showBalance />
        </div>
      </div>
    </nav>
  );
}
