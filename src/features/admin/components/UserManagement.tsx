import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  User as UserIcon,
  MessageCircle,
  UserCog,
  Trash2,
  X,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { Badge } from '../../../components/Badge';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { SkeletonRow } from '../../../components/SkeletonRow';
import { formatDate, cn } from '../../../utils';
import { UserProfile, UserRole, RefundRequest, AuditLog } from '../../../types';
import {
  db,
  adminUpdateUserAuth,
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp
} from '../../../mockFirebase';
import { CreateUserModal } from './CreateUserModal';

interface UserManagementProps {
  users: UserProfile[];
  allRequests: RefundRequest[];
  profile: UserProfile;
  isLoading?: boolean;
  onChatWithUser?: (uid: string) => void;
}

export function UserManagement({
  users,
  allRequests,
  profile,
  isLoading,
  onChatWithUser
}: UserManagementProps) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'requests'>('info');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const usersPerPage = 10;

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const searchMatch = userSearch === '' ||
        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.sdt?.includes(userSearch);
      const roleMatch = roleFilter === 'all' || u.role === roleFilter;
      const statusMatch = statusFilter === 'all' || u.status === statusFilter;
      return searchMatch && roleMatch && statusMatch;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  useEffect(() => { setCurrentPage(1); }, [userSearch, roleFilter, statusFilter]);

  const writeAuditLog = async (action: AuditLog['action'], targetId: string, targetType: AuditLog['targetType'], changes: Record<string, { old: any; new: any }>) => {
    try {
      await addDoc(collection(db, 'adminAuditLog'), {
        adminId: profile.uid,
        adminEmail: profile.email,
        action,
        targetId,
        targetType,
        changes,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }
  };

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>, oldData: Partial<UserProfile>) => {
    try {
      const changes: Record<string, { old: any; new: any }> = {};
      if (data.role !== undefined && data.role !== oldData.role) {
        changes.role = { old: oldData.role, new: data.role };
      }
      if (data.status !== undefined && data.status !== oldData.status) {
        changes.status = { old: oldData.status, new: data.status };
      }
      if (data.displayName !== undefined && data.displayName !== oldData.displayName) {
        changes.displayName = { old: oldData.displayName, new: data.displayName };
      }
      if (data.sdt !== undefined && data.sdt !== oldData.sdt) {
        changes.sdt = { old: oldData.sdt, new: data.sdt };
      }

      await updateDoc(doc(db, 'users', uid), data);

      if (data.email || newPasswordForUser) {
        await adminUpdateUserAuth(uid, data.email, newPasswordForUser || undefined);
        if (newPasswordForUser) {
          changes.password = { old: '***', new: 'Mật khẩu mới' };
        }
      }

      if (Object.keys(changes).length > 0) {
        await writeAuditLog('update_user', uid, 'user', changes);
      }
      setResetSuccess(uid);
      setTimeout(() => {
        setEditingUser(null);
        setNewPasswordForUser('');
        setResetSuccess(null);
      }, 1500);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Cập nhật thông tin người dùng thất bại. Vui lòng thử lại.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) return;
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'inactive' });
      await writeAuditLog('delete_user', uid, 'user', {
        status: { old: targetUser.status, new: 'inactive' }
      });
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Khóa người dùng thất bại. Vui lòng thử lại.');
    }
  };

  const userRequests = useMemo(() => {
    if (!editingUser) return [];
    return allRequests.filter(r => r.userId === editingUser.uid);
  }, [editingUser, allRequests]);

  return (
    <div className="w-full bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
      <div className="bg-[#06427D] py-2.5 px-3 md:px-4 flex items-center justify-between border-b border-[#0A73D1]">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-white md:w-5 md:h-5" />
          <h3 className="text-white font-bold text-[13px] md:text-[16px] uppercase font-sans tracking-wide">Người dùng</h3>
        </div>
        <button 
          onClick={() => setIsCreateUserModalOpen(true)}
          className="bg-[#FF8800] hover:bg-[#FF6600] text-white text-[11px] md:text-[12px] font-bold px-2 md:px-3 py-1.5 rounded shadow flex items-center gap-1 transition-colors uppercase"
        >
          <Plus size={13} /> <span className="hidden sm:inline">Tạo</span> TK
        </button>
      </div>

      <div className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 md:gap-3 bg-gray-50 p-2.5 border border-gray-200 rounded mb-3">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              placeholder="Tìm người dùng..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
              className="flex-1 md:flex-none px-2 py-1.5 text-[11px] md:text-[12px] font-bold border border-gray-300 rounded bg-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">VAI TRÒ: TẤT CẢ</option>
              <option value="admin">QUẢN TRỊ</option>
              <option value="user">NGƯỜI DÙNG</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
              className="flex-1 md:flex-none px-2 py-1.5 text-[11px] md:text-[12px] font-bold border border-gray-300 rounded bg-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">T.THÁI: TẤT CẢ</option>
              <option value="active">HOẠT ĐỘNG</option>
              <option value="inactive">ĐÃ KHÓA</option>
            </select>
          </div>
        </div>

        {/* Table View (Desktop) */}
        <div className="hidden md:block overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-[13px] text-gray-700 min-w-[700px]">
            <thead>
              <tr className="bg-[#f5f5f5] text-[#0A58A3] border-b border-gray-300">
                <th className="px-3 py-2.5 font-bold uppercase">Người dùng</th>
                <th className="px-3 py-2.5 font-bold uppercase w-32 text-center">Vai trò</th>
                <th className="px-3 py-2.5 font-bold uppercase w-32 text-center">Trạng thái</th>
                <th className="px-3 py-2.5 font-bold uppercase w-36 text-center">Ngày đăng ký</th>
                <th className="px-3 py-2.5 font-bold uppercase text-center w-56">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-3 py-3 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>)
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-red-500 font-bold italic border-t border-gray-200 bg-red-50">
                    KHÔNG TÌM THẤY NGƯỜI DÙNG
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 border-r border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600">
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-black">{u.displayName}</p>
                          <p className="text-[11px] text-gray-500">{u.email}</p>
                          {u.sdt && <p className="text-[11px] text-gray-500">{u.sdt}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center border-r border-gray-100"><Badge status={u.role} className="!text-[10px] !px-1.5 !py-0.5" /></td>
                    <td className="px-3 py-2.5 text-center border-r border-gray-100"><Badge status={u.status} className="!text-[10px] !px-1.5 !py-0.5" /></td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-gray-600 border-r border-gray-100">
                      {formatDate(u.createdAt, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-[11px] font-bold uppercase flex items-center gap-1" onClick={(e) => { e.stopPropagation(); onChatWithUser?.(u.uid); }}>
                          <MessageCircle size={12} /> Chat
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-orange-600 hover:text-orange-800 text-[11px] font-bold uppercase flex items-center gap-1" onClick={() => { setEditingUser(u); setNewPasswordForUser(''); setEditTab('info'); }}>
                          <UserCog size={12} /> Sửa
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="text-red-600 hover:text-red-800 text-[11px] font-bold uppercase flex items-center gap-1"
                          title="Khóa người dùng"
                        >
                          <Trash2 size={12} /> Khóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden border border-gray-200 rounded overflow-hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-10 text-center text-gray-400">Đang tải...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-red-500 font-bold bg-red-50">KHÔNG CÓ DỮ LIỆU</div>
          ) : (
            paginatedUsers.map(u => (
              <div key={u.uid} className="p-4 bg-white active:bg-blue-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600 shrink-0">
                      <UserIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-black truncate">{u.displayName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge status={u.role} className="!text-[9px] !px-1 !py-0.5" />
                    <Badge status={u.status} className="!text-[9px] !px-1 !py-0.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-gray-400">{formatDate(u.createdAt, 'dd/MM/yyyy')}</p>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200" 
                      onClick={(e) => { e.stopPropagation(); onChatWithUser?.(u.uid); }}
                    >
                      <MessageCircle size={12} />
                    </button>
                    <button 
                      className="p-1.5 bg-orange-50 text-orange-700 rounded border border-orange-200" 
                      onClick={() => { setEditingUser(u); setNewPasswordForUser(''); setEditTab('info'); }}
                    >
                      <UserCog size={12} />
                    </button>
                    <button 
                      className="p-1.5 bg-red-50 text-red-700 rounded border border-red-200" 
                      onClick={() => setUserToDelete(u)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!isLoading && filteredUsers.length > usersPerPage && (
          <div className="mt-3">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col rounded-md border border-gray-200">
            <div className="px-4 py-3 bg-[#06427D] flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-white">
                 <UserCog size={18} />
                 <div>
                   <h3 className="text-[14px] font-bold uppercase">Chỉnh sửa User</h3>
                   <p className="text-[11px] opacity-80">{editingUser.email}</p>
                 </div>
               </div>
               <button onClick={() => setEditingUser(null)} className="text-white hover:text-red-300 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-3 border-b border-gray-200 bg-gray-50 flex gap-2 shrink-0">
               <button
                 onClick={() => setEditTab('info')}
                 className={`px-3 py-1.5 text-[12px] font-bold uppercase rounded transition-colors ${editTab === 'info' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
               >
                 Thông tin
               </button>
               <button
                 onClick={() => setEditTab('requests')}
                 className={`px-3 py-1.5 text-[12px] font-bold uppercase rounded transition-colors ${editTab === 'requests' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
               >
                 Yêu cầu hoàn vé ({userRequests.length})
               </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white">
              {editTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase block">Họ và tên</label>
                      <input
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                        value={editingUser.displayName}
                        onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase block">Số điện thoại</label>
                      <input
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                        value={editingUser.sdt || ''}
                        onChange={e => setEditingUser({ ...editingUser, sdt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase block">Email</label>
                    <input
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                      value={editingUser.email || ''}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase block">Vai trò</label>
                      <select
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                        value={editingUser.role}
                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                      >
                        <option value="user">Người dùng</option>
                        <option value="admin">Quản trị</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase block">Trạng thái</label>
                      <select
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                        value={editingUser.status}
                        onChange={e => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                      >
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Tạm khóa</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase block">Ngày đăng ký</label>
                    <input
                      disabled
                      className="w-full px-2.5 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-500 text-[13px] cursor-not-allowed"
                      value={formatDate(editingUser.createdAt, 'dd/MM/yyyy HH:mm')}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase block">Mật khẩu mới (Tùy chọn)</label>
                    <input
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500"
                      placeholder="Để trống nếu không muốn thay đổi"
                      value={newPasswordForUser}
                      onChange={e => setNewPasswordForUser(e.target.value)}
                    />
                  </div>
                  {resetSuccess === editingUser.uid && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-[12px] font-bold flex items-center gap-1.5 mt-2">
                       <CheckCircle2 size={14} /> Đã cập nhật thông tin thành công!
                    </div>
                  )}
                </div>
              )}

              {editTab === 'requests' && (
                <div className="space-y-3">
                  {userRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">Người dùng này chưa có yêu cầu nào.</div>
                  ) : (
                    userRequests.map(req => (
                      <div key={req.id} className="p-3 bg-white border border-gray-200 rounded">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <Ticket size={14} className="text-gray-500" />
                              <span className="text-[13px] font-bold text-black">{req.orderCode}</span>
                           </div>
                           <Badge status={req.status} className="!text-[10px] !px-1.5 !py-0.5" />
                        </div>
                        <div className="flex justify-between items-end border-t border-gray-100 pt-2">
                           <div className="text-[11px] text-gray-600">
                              <div>Ngân hàng: <b>{req.bankName}</b></div>
                              <div>Số TK: <b>{req.accountNumber}</b></div>
                           </div>
                           <div className="text-right">
                              <div className="text-[13px] font-black text-orange-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {formatDate(req.createdAt, 'dd/MM/yyyy HH:mm')}
                              </div>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 shrink-0">
               <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-[12px] py-1.5 rounded uppercase transition-colors" onClick={() => setEditingUser(null)}>HỦY</button>
               <button
                 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] py-1.5 rounded uppercase transition-colors"
                 onClick={() => handleUpdateUser(editingUser.uid, {
                   role: editingUser.role,
                   status: editingUser.status,
                   displayName: editingUser.displayName,
                   sdt: editingUser.sdt,
                   email: editingUser.email
                 }, editingUser)}
               >
                 LƯU THAY ĐỔI
               </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white p-5 text-center rounded-md border border-gray-200 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-200">
              <Trash2 size={24} />
            </div>
            <h3 className="text-[16px] font-black text-gray-900 mb-2 uppercase">Xác nhận khóa tài khoản?</h3>
            <p className="text-[13px] text-gray-600 mb-5">
              Bạn có chắc muốn khóa tài khoản <span className="font-bold text-red-600">{userToDelete.displayName}</span>?
            </p>
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[13px] py-2 rounded transition-colors" onClick={() => setUserToDelete(null)}>HỦY</button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] py-2 rounded transition-colors" onClick={() => handleDeleteUser(userToDelete.uid)}>XÁC NHẬN KHÓA</button>
            </div>
          </div>
        </div>
      )}

      {isCreateUserModalOpen && (
        <CreateUserModal onClose={() => setIsCreateUserModalOpen(false)} adminProfile={profile} />
      )}
    </div>
  );
}
