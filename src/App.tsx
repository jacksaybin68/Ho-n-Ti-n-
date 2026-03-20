import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  TicketCheck,
  Database,
  ShieldCheck,
  Ticket,
  MessageCircle,
  Shield,
  LogOut,
  Settings,
  Sun,
  Moon,
  User as UserIcon,
  PhoneCall,
  Mail,
  Clock,
  Menu,
  X
} from 'lucide-react';

// Hooks
import { useAuth } from './features/auth/useAuth';
import { useDashboardData } from './hooks/useDashboardData';

// Components
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationBell } from './components/NotificationBell';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { AuthLayout } from './features/auth/AuthLayout';
import { UserDashboard } from './features/user/UserDashboard';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { UserManagement } from './features/admin/components/UserManagement';
import { RefundRequestManagement } from './features/admin/components/RefundRequestManagement';
import { AuditLogView } from './features/admin/components/AuditLogView';
import { AdminBookingManagement } from './features/admin/components/AdminBookingManagement';
import { ProfileSettings } from './features/shared/components/ProfileSettings';
import { AbayHomePage } from './features/public/AbayHomePage';

// Utils & Types
import { cn } from './utils';
import { db, collection, query, getDocs } from './mockFirebase';

export default function App() {
  const { user, profile, loading, isLoading: authIsLoading, loginError, loginSuccess, login, register, logout: signOut } = useAuth();
  const {
    requests,
    allRequests,
    users,
    auditLogs,
    bookingCodes,
    messages,
    conversations,
    isLoading: dataLoading
  } = useDashboardData(profile);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'settings' | 'audit' | 'bookings'>('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [config, setConfig] = useState<any>({
    brandName: 'TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM',
    supportPhone: '1900 6091',
    supportEmail: 'hotro@aerorefund.com',
    workingHours: '0h - 24h',
    copyright: '© 2026 TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM. All Rights Reserved.'
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const refreshDbStats = useCallback(async () => {
    const collections = ['users', 'refundRequests', 'basedata', 'chats', 'adminAuditLog'];
    const newStats: Record<string, number> = {};
    
    for (const col of collections) {
      try {
        const q = query(collection(db, col));
        const snapshot = await getDocs(q);
        newStats[col] = snapshot.size;
      } catch (err) {
        console.warn(`Error fetching stats for ${col}:`, err);
        newStats[col] = 0;
      }
    }
    
    setDbStats(newStats);

    try {
      const qConfig = query(collection(db, 'config'));
      const snapshot = await getDocs(qConfig);
      if (!snapshot.empty) {
        setConfig(snapshot.docs[0].data());
      }
    } catch { }
  }, []);

  useEffect(() => {
    refreshDbStats();
  }, [profile, allRequests, users, refreshDbStats]);

  const handleResetCollection = async (type: string) => {
    if (type === 'all') {
      // For Cloud/Supabase, we usually don't delete all. For now, clear LocalStorage only
      const keysToRemove = ['mockUser', 'theme'];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    } else {
      try {
        const q = query(collection(db, type));
        const snapshot = await getDocs(q);
        const { deleteDoc, doc } = await import('./mockFirebase');
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, type, d.id));
        }
        await refreshDbStats();
      } catch (err) {
        console.error('Reset error:', err);
        alert('Lỗi khi xóa dữ liệu Cloud.');
      }
    }
  };

  const handleExportDb = () => {
    const data: Record<string, any> = {};
    const keys = ['col_users', 'col_refundRequests', 'col_basedata', 'col_chats', 'col_adminAuditLog', 'mockUsers'];
    keys.forEach(k => {
      try {
        data[k] = JSON.parse(localStorage.getItem(k) || '[]');
      } catch { data[k] = []; }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aerorefund_db_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.entries(data).forEach(([key, val]) => {
          localStorage.setItem(key, JSON.stringify(val));
        });
        window.location.reload();
      } catch (err) {
        alert('Lỗi import dữ liệu: Định dạng không hợp lệ');
      }
    };
    reader.readAsText(file);
  };

  const handleSeedData = async () => {
    const pnrCodes = ['ABCXYZ', 'DEF123', 'VNA456', 'QWERTY', 'JET789'];
    const { addDoc, collection, serverTimestamp } = await import('./mockFirebase');
    
    try {
      for (const [index, code] of pnrCodes.entries()) {
        await addDoc(collection(db, 'refundRequests'), {
          userId: 'user_0356812812', 
          userSdt: '0356812812',
          userEmail: 'nguyenvana@aerorefund.com',
          bankName: 'Vietcombank',
          accountNumber: '123456789' + index,
          accountHolder: 'NGUYEN VAN A',
          amount: 1500000 + (index * 100000),
          orderCode: code,
          status: index === 0 ? 'pending' : (index === 1 ? 'processing' : 'completed'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await refreshDbStats();
      alert('Đã thêm dữ liệu mẫu vào Cloud Database!');
    } catch (err) {
      console.error('Seed error:', err);
      alert('Lỗi seed dữ liệu Cloud.');
    }
  };

  const dbCollections = useMemo(() => [
    { key: 'users', label: 'Hồ sơ người dùng', icon: <UserIcon size={16} className="text-blue-600" /> },
    { key: 'mockUsers', label: 'Tài khoản đăng nhập', icon: <Shield size={16} className="text-violet-600" /> },
    { key: 'refundRequests', label: 'Yêu cầu hoàn vé', icon: <TicketCheck size={16} className="text-amber-600" /> },
    { key: 'basedata', label: 'Mã đặt chỗ (PNR)', icon: <Ticket size={16} className="text-emerald-600" /> },
    { key: 'chats', label: 'Tin nhắn chat', icon: <MessageCircle size={16} className="text-sky-600" /> },
    { key: 'adminAuditLog', label: 'Nhật ký Admin', icon: <ShieldCheck size={16} className="text-rose-600" /> },
    { key: 'config', label: 'Cấu hình hệ thống', icon: <Settings size={16} className="text-gray-600" /> },
  ], []);

  const adminStats = useMemo(() => ({
    pendingCount: allRequests.filter(r => r.status === 'pending').length,
    processingCount: allRequests.filter(r => r.status === 'processing').length,
    completedCount: allRequests.filter(r => r.status === 'completed').length,
    userCount: users.length,
    recentRequests: allRequests.slice(0, 5)
  }), [allRequests, users]);

  if (loading) return <LoadingSpinner />;

  if (!user || !profile) {
    if (!showLogin) {
      return <AbayHomePage onLoginClick={() => setShowLogin(true)} />;
    }
    return (
      <AuthLayout
        title="Đăng Nhập Hệ Thống"
        subtitle="Hệ thống hoàn tiền vé & tra cứu kết quả hàng không Việt Nam"
      >
        <LoginForm
          onLogin={login}
          isLoading={authIsLoading}
          error={loginError}
          success={loginSuccess}
          onSwitchToRegister={() => {}}
        />
      </AuthLayout>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <div className="bg-[#f0f2f5] min-h-[100dvh] font-sans text-gray-800 antialiased selection:bg-orange-200">
      
      {/* Top Header - Sourced from AbayHomePage */}
      <div className="container-safe py-3 flex flex-col sm:flex-row justify-between items-center bg-transparent relative z-10 gap-3 md:gap-0">
        <div className="flex flex-col items-center sm:items-start">
          <h1 className="text-3xl md:text-4xl font-black text-amber-500 italic tracking-tighter shadow-sm flex items-end">
            <span className="text-blue-900 text-4xl md:text-5xl">365</span><span className="text-sm font-bold text-gray-600 no-italic ml-1 mb-1">.vn</span>
          </h1>
          <p className="text-[10px] md:text-xs text-orange-600 font-bold sm:ml-1 mt-1 uppercase">HỆ THỐNG {isAdmin ? 'QUẢN TRỊ' : 'ĐẠI LÝ'} VÉ MÁY BAY</p>
        </div>
        
        <div className="flex items-center gap-2 text-center sm:text-right">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-blue-100 flex items-center justify-center text-blue-800 shrink-0">
             <PhoneCall size={18} className="md:w-6 md:h-6" strokeWidth={2} />
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <div className="text-[12px] md:text-sm text-gray-600 font-bold flex flex-wrap justify-center sm:justify-end gap-1 items-center">
              <span>Tổng đài hỗ trợ:</span>
              <span className="text-lg md:text-xl font-black text-red-600 tracking-tight">{config?.supportPhone || '1900 6091'}</span>
            </div>
            <div className="text-[9px] md:text-[10px] text-gray-500 font-semibold bg-gray-200/50 px-2 py-0.5 mt-0.5 rounded italic">Giờ làm việc: {config?.workingHours || '0h - 24h'}</div>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu - Abay Style */}
      <div className="w-full bg-[#113C85] shadow-md border-b-2 border-orange-500 sticky top-0 z-40">
        <div className="container-safe flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
              className="min-w-[42px] h-[42px] px-4 flex items-center justify-center bg-gradient-to-b from-blue-300 to-[#113C85] border-r border-[#1a4a9c] flex-shrink-0"
            >
              <LayoutDashboard size={20} className="text-white" />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex text-[13px] font-bold text-white uppercase tracking-tight leading-none whitespace-nowrap">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'dashboard' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <LayoutDashboard size={14} className="mr-1.5" /> Tổng quan
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'users' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <Users size={14} className="mr-1.5" /> Người dùng
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'requests' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <TicketCheck size={14} className="mr-1.5" /> Hoàn vé
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'audit' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <ShieldCheck size={14} className="mr-1.5" /> Nhật ký Admin
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'bookings' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <Database size={14} className="mr-1.5" /> Quản lý PNR
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'dashboard' && "bg-[#0d2e66] text-amber-400")}
                  >
                    <TicketCheck size={14} className="mr-1.5" /> Quản lý hoàn vé
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('settings')}
                className={cn("h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]", activeTab === 'settings' && "bg-[#0d2e66] text-amber-400")}
              >
                <Settings size={14} className="mr-1.5" /> Cài đặt
              </button>
            </nav>
            
            {/* Mobile Navigation Title */}
            <div className="md:hidden px-3 text-white font-bold text-[13px] uppercase tracking-wide">
              {activeTab === 'dashboard' && 'Tổng quan'}
              {activeTab === 'users' && 'Người dùng'}
              {activeTab === 'requests' && 'Hoàn vé'}
              {activeTab === 'audit' && 'Nhật ký'}
              {activeTab === 'bookings' && 'PNR'}
              {activeTab === 'settings' && 'Cài đặt'}
            </div>
          </div>

          {/* User Info & Hamburger */}
          <div className="flex items-center h-[42px]">
            <div className="hidden sm:flex h-full items-center border-x border-[#1a4a9c]">
              <div className="px-3 flex items-center gap-2 text-amber-300">
                <UserIcon size={14} />
                <span className="text-white max-w-[80px] md:max-w-[120px] truncate">{profile.displayName}</span>
              </div>
            </div>
            <button onClick={signOut} className="hidden sm:flex h-full px-4 hover:bg-red-700 bg-red-600 transition-colors items-center text-white gap-1.5 font-black uppercase text-[12px]">
              <LogOut size={14} /> Thoát
            </button>
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden h-full px-4 flex items-center justify-center text-white bg-[#0d2e66] border-l border-[#1a4a9c]"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-[#0d2e66] border-t border-blue-800 overflow-hidden"
            >
              <div className="flex flex-col py-2">
                {isAdmin ? (
                  <>
                    <button onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'dashboard' && "text-amber-400 bg-blue-900")}>
                      <LayoutDashboard size={16} /> Tổng quan
                    </button>
                    <button onClick={() => { setActiveTab('users'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'users' && "text-amber-400 bg-blue-900")}>
                      <Users size={16} /> Người dùng
                    </button>
                    <button onClick={() => { setActiveTab('requests'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'requests' && "text-amber-400 bg-blue-900")}>
                      <TicketCheck size={16} /> Hoàn vé
                    </button>
                    <button onClick={() => { setActiveTab('audit'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'audit' && "text-amber-400 bg-blue-900")}>
                      <ShieldCheck size={16} /> Nhật ký Admin
                    </button>
                    <button onClick={() => { setActiveTab('bookings'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'bookings' && "text-amber-400 bg-blue-900")}>
                      <Database size={16} /> Quản lý PNR
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'dashboard' && "text-amber-400 bg-blue-900")}>
                    <TicketCheck size={16} /> Quản lý hoàn vé
                  </button>
                )}
                <button onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }} className={cn("px-6 py-3 text-left font-bold text-white border-b border-blue-900/50 flex items-center gap-2", activeTab === 'settings' && "text-amber-400 bg-blue-900")}>
                  <Settings size={16} /> Cài đặt
                </button>
                <button onClick={signOut} className="px-6 py-4 text-left font-bold text-red-400 flex items-center gap-2 mt-2">
                  <LogOut size={16} /> Đăng xuất hệ thống
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Greeting Banner */}
      <div className="w-full bg-white border-b border-gray-200">
        <div className="container-safe py-2 flex flex-col sm:flex-row items-center justify-between text-[11px] md:text-[13px] gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left">
            <span className="text-gray-600 font-semibold">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(currentTime)}</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="text-red-500 font-bold">Xin chào, {profile.displayName} ({isAdmin ? 'Q.Trị' : 'Đại lý'})</span>
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell count={isAdmin ? adminStats.pendingCount : requests.filter(r => r.status === 'processing').length} onClick={() => { }} />
             <button onClick={toggleDarkMode} className="text-gray-500 hover:text-orange-500 transition-colors bg-gray-100 p-1.5 rounded-full">
               {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
             </button>
          </div>
        </div>
      </div>

      {/* Dynamic Content Area */}
      <main className="w-full max-w-[900px] mx-auto py-6 px-4 md:px-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              isAdmin ? (
                <AdminDashboard
                  stats={adminStats}
                  users={users}
                  dbStats={dbStats}
                  dbCollections={dbCollections}
                  handleResetCollection={handleResetCollection}
                  handleExportDb={handleExportDb}
                  handleImportDb={handleImportDb}
                  handleSeedData={handleSeedData}
                  config={config}
                  onUpdateConfig={refreshDbStats}
                />
              ) : (
                <UserDashboard requests={requests} profile={profile} isDashboard={true} />
              )
            )}

            {activeTab === 'users' && isAdmin && (
              <UserManagement
                users={users}
                allRequests={allRequests}
                profile={profile}
                isLoading={dataLoading}
              />
            )}

            {activeTab === 'requests' && isAdmin && (
              <RefundRequestManagement
                requests={allRequests}
                isLoading={dataLoading}
              />
            )}

            {activeTab === 'audit' && isAdmin && (
              <AuditLogView logs={auditLogs} />
            )}

            {activeTab === 'bookings' && isAdmin && (
              <AdminBookingManagement codes={bookingCodes} />
            )}

            {activeTab === 'settings' && (
              <ProfileSettings profile={profile} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Dark Blue Wide Footer - Abay Style */}
      <div className="w-full bg-[#113C85] border-t-4 border-[#FFAA00] py-8 mt-10 relative z-10 overflow-hidden">
        {/* Wave decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFAA00] to-transparent"></div>
        </div>

        <div className="w-full max-w-[1020px] mx-auto px-4 md:px-0 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

            {/* Brand */}
            <div>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-2xl font-black text-amber-400 italic tracking-tighter">365</span>
                <span className="text-sm font-bold text-blue-300 no-italic mb-0.5">.vn</span>
              </div>
              <p className="text-[11px] text-blue-200 leading-relaxed">
                Hệ thống quản lý đại lý<br/>
                & hoàn vé máy bay tự động
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Liên hệ hỗ trợ</h4>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[11px] text-blue-200">
                  <PhoneCall size={12} className="text-amber-400 shrink-0" />
                  <span>Tổng đài: <span className="text-white font-bold">{config?.supportPhone || '1900 6091'}</span></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-blue-200">
                  <Mail size={12} className="text-amber-400 shrink-0" />
                  <span>{config?.supportEmail || 'hotro@aerorefund.com'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-blue-200">
                  <Clock size={12} className="text-amber-400 shrink-0" />
                  <span>Giờ làm việc: {config?.workingHours || '0h - 24h'}</span>
                </div>
              </div>
            </div>

            {/* Policies */}
            <div>
              <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Chính sách</h4>
              <div className="flex flex-col gap-1">
                {['Điều khoản sử dụng', 'Chính sách bảo mật', 'Quy trình hoàn vé', 'Phí dịch vụ'].map(item => (
                  <div key={item} className="text-[11px] text-blue-200 cursor-pointer hover:text-amber-400 transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Divider */}
          <div className="border-t border-blue-700 pt-3">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="text-[10px] text-blue-300 text-center md:text-left leading-relaxed">
                {config?.copyright || '© 2026 365.vn — Hệ thống quản lý đại lý & hoàn vé tự động.'}<br/>
                <span className="text-blue-400">Mọi hành vi sao chép, phát hành nội dung mà không có sự đồng ý đều bị nghiêm cấm.</span>
              </div>
              <div className="flex items-center gap-3">
                {['Facebook', 'Zalo', 'YouTube'].map(social => (
                  <div key={social} className="text-[10px] text-blue-300 bg-blue-800/50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-700 hover:text-amber-400 transition-colors">
                    {social}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

