import React, { useState } from 'react';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Users, 
  ChevronRight, 
  Ticket, 
  User as UserIcon, 
  Database, 
  Trash2, 
  AlertTriangle,
  Download,
  Upload,
  DatabaseZap,
  Save
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { UserProfile, RefundRequest } from '../../types';

interface AdminDashboardProps {
  stats: {
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    userCount: number;
    recentRequests: RefundRequest[];
  };
  users: UserProfile[];
  dbStats: Record<string, number>;
  dbCollections: { key: string; label: string; icon: React.ReactNode }[];
  handleResetCollection: (type: string) => void;
  handleExportDb: () => void;
  handleImportDb: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSeedData: () => void;
  config: any;
  onUpdateConfig: () => void;
}

export function AdminDashboard({ 
  stats, 
  users, 
  dbStats, 
  dbCollections, 
  handleResetCollection,
  handleExportDb,
  handleImportDb,
  handleSeedData,
  config,
  onUpdateConfig
}: AdminDashboardProps) {
  const [resetConfirm, setResetConfirm] = useState<{ type: string; label: string } | null>(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(config);

  const handleSaveConfig = () => {
    localStorage.setItem('col_config', JSON.stringify([editConfig]));
    setIsEditingConfig(false);
    onUpdateConfig();
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <div className="bg-white border border-[#FF8800] shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3 transition-transform active:scale-95">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 flex items-center justify-center rounded-full text-[#FF8800] shrink-0">
            <Clock size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Chờ duyệt</div>
            <div className="text-base md:text-xl font-black text-orange-600 leading-none">{stats.pendingCount}</div>
          </div>
        </div>
        <div className="bg-white border border-purple-400 shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3 transition-transform active:scale-95">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 flex items-center justify-center rounded-full text-purple-600 shrink-0">
            <RefreshCw size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Chuyển tiền</div>
            <div className="text-base md:text-xl font-black text-purple-700 leading-none">{stats.processingCount}</div>
          </div>
        </div>
        <div className="bg-white border border-emerald-500 shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3 transition-transform active:scale-95">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 flex items-center justify-center rounded-full text-emerald-600 shrink-0">
            <CheckCircle2 size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Hoàn tất</div>
            <div className="text-base md:text-xl font-black text-emerald-700 leading-none">{stats.completedCount}</div>
          </div>
        </div>
        <div className="bg-white border border-[#0A73D1] shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3 transition-transform active:scale-95">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 flex items-center justify-center rounded-full text-blue-700 shrink-0">
            <Users size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Người dùng</div>
            <div className="text-base md:text-xl font-black text-blue-900 leading-none">{stats.userCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
          <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
            <h3 className="text-white font-bold text-[14px] uppercase tracking-wide flex items-center gap-2">
               <Ticket size={16}/> Yêu cầu mới nhất
            </h3>
            <ChevronRight size={16} className="text-white opacity-70" />
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-[13px]">
                <EmptyState message="Chưa có yêu cầu nào" icon={<Ticket size={24} />} />
              </div>
            ) : (
              stats.recentRequests.map((req, i) => (
                <div key={`${req.id}-${i}`} className="p-3 flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <Ticket size={16} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-black">{req.orderCode}</p>
                      <p className="text-[11px] text-gray-500">{req.userEmail}</p>
                    </div>
                  </div>
                  <Badge status={req.status} className="!text-[10px] !px-1.5 !py-0.5" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
          <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
            <h3 className="text-white font-bold text-[14px] uppercase tracking-wide flex items-center gap-2">
               <Users size={16}/> Người dùng mới
            </h3>
            <ChevronRight size={16} className="text-white opacity-70" />
          </div>
          <div className="divide-y divide-gray-200">
            {users.slice(0, 5).map((u, i) => (
              <div key={`${u.uid}-${i}`} className="p-3 flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <UserIcon size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-black">{u.displayName}</p>
                    <p className="text-[11px] text-gray-500">{u.email}</p>
                  </div>
                </div>
                <Badge status={u.role} className="!text-[10px] !px-1.5 !py-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quản lý Database */}
      {import.meta.env.DEV && (
        <div className="bg-white rounded-md overflow-hidden shadow-md border border-rose-300 mt-2">
          <div className="bg-rose-50 py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-200 gap-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-rose-600" />
              <div>
                <h3 className="font-bold text-rose-800 text-[13px] md:text-[14px] uppercase">Quản lý Cloud Database</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportDb}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 uppercase"
                title="Xuất dữ liệu ra file JSON"
              >
                <Download size={12} /> <span className="xs:inline">Xuất</span>
              </button>
              <label className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 uppercase cursor-pointer">
                <Upload size={12} /> <span className="xs:inline">Nhập</span>
                <input type="file" accept=".json" onChange={handleImportDb} className="hidden" />
              </label>
              <button
                onClick={handleSeedData}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-1.5 uppercase"
                title="Tạo dữ liệu mẫu để test"
              >
                <DatabaseZap size={12} /> <span className="xs:inline">Seed</span>
              </button>
              <button
                onClick={() => setResetConfirm({ type: 'all', label: 'TOÀN BỘ dữ liệu' })}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 uppercase"
              >
                <Trash2 size={12} /> Reset
              </button>
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dbCollections.map(col => (
                <div key={col.key} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:border-rose-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                      {col.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-gray-800">{col.label}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {dbStats[col.key] !== undefined ? `${dbStats[col.key]} bản ghi` : '...'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setResetConfirm({ type: col.key, label: col.label })}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 transition-colors"
                    title={`Xóa ${col.label}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cấu hình hệ thống */}
      <div className="bg-white rounded-md overflow-hidden shadow-md border border-blue-300 mt-5">
        <div className="bg-blue-50 py-3 px-4 flex items-center justify-between border-b border-blue-200">
          <div className="flex items-center gap-2">
            <Save size={18} className="text-blue-600" />
            <h3 className="font-bold text-blue-800 text-[14px] uppercase font-sans tracking-wide">Cấu hình hệ thống</h3>
          </div>
          {!isEditingConfig ? (
            <button
              onClick={() => { setIsEditingConfig(true); setEditConfig(config); }}
              className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 transition-colors shadow-sm uppercase"
            >
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingConfig(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-[11px] font-bold rounded hover:bg-gray-300 transition-colors uppercase"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 uppercase transition-colors"
              >
                <Save size={12} /> Lưu cấu hình
              </button>
            </div>
          )}
        </div>
        <div className="p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Số điện thoại hỗ trợ</label>
              <input
                disabled={!isEditingConfig}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] bg-white disabled:bg-gray-50 focus:border-blue-500 outline-none transition-colors"
                value={isEditingConfig ? editConfig?.supportPhone : config?.supportPhone}
                onChange={e => setEditConfig({ ...editConfig, supportPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Email hỗ trợ</label>
              <input
                disabled={!isEditingConfig}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] bg-white disabled:bg-gray-50 focus:border-blue-500 outline-none transition-colors"
                value={isEditingConfig ? editConfig?.supportEmail : config?.supportEmail}
                onChange={e => setEditConfig({ ...editConfig, supportEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Giờ làm việc</label>
              <input
                disabled={!isEditingConfig}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] bg-white disabled:bg-gray-50 focus:border-blue-500 outline-none transition-colors"
                value={isEditingConfig ? editConfig?.workingHours : config?.workingHours}
                onChange={e => setEditConfig({ ...editConfig, workingHours: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Thông tin bản quyền (Copyright)</label>
              <input
                disabled={!isEditingConfig}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] bg-white disabled:bg-gray-50 focus:border-blue-500 outline-none transition-colors"
                value={isEditingConfig ? editConfig?.copyright : config?.copyright}
                onChange={e => setEditConfig({ ...editConfig, copyright: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận Reset */}
      {resetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-gray-200 shadow-2xl p-6 text-center rounded-md">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-[16px] font-black tracking-tight text-gray-900 mb-2 uppercase">Xác nhận xóa dữ liệu</h3>
            <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">
              Bạn sắp xóa <span className="font-bold text-red-600">{resetConfirm.label}</span>.
              {resetConfirm.type === 'all' && ' Tất cả dữ liệu sẽ bị xóa và trang sẽ được tải lại.'}
              {resetConfirm.type === 'mockUsers' && ' Chỉ giữ lại tài khoản Admin mặc định.'}
              <br/><span className="text-xs italic text-gray-400 mt-2 block">Hành động này không thể hoàn tác.</span>
            </p>
            <div className="flex gap-3">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[13px] py-2 rounded transition-colors" onClick={() => setResetConfirm(null)}>HỦY</button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] py-2 rounded shadow-md transition-colors" onClick={() => {
                handleResetCollection(resetConfirm.type);
                setResetConfirm(null);
              }}>XÓA DỮ LIỆU</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
