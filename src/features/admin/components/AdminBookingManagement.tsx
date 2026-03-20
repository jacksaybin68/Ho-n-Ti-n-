import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Plane, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle,
  TicketCheck 
} from 'lucide-react';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { cn } from '../../../utils';
import { BookingCode } from '../../../types';
import { 
  db, 
  doc, 
  updateDoc, 
  deleteDoc,
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from '../../../mockFirebase';

interface AdminBookingManagementProps {
  codes: BookingCode[];
}

export function AdminBookingManagement({ codes }: AdminBookingManagementProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'refunded'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<BookingCode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BookingCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const codesPerPage = 15;

  const [formData, setFormData] = useState({
    orderCode: '',
    amount: '',
    passengerName: '',
    flightNumber: '',
    status: 'valid' as 'valid' | 'refunded'
  });

  const filteredCodes = useMemo(() => {
    return codes.filter(c => {
      const searchMatch = search === '' ||
        c.orderCode.toLowerCase().includes(search.toLowerCase()) ||
        c.passengerName.toLowerCase().includes(search.toLowerCase()) ||
        c.flightNumber.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === 'all' || c.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [codes, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCodes.length / codesPerPage));
  const paginatedCodes = filteredCodes.slice((currentPage - 1) * codesPerPage, currentPage * codesPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const resetForm = () => {
    setFormData({ orderCode: '', amount: '', passengerName: '', flightNumber: '', status: 'valid' });
    setEditingCode(null);
    setMessage(null);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (code: BookingCode) => {
    setFormData({
      orderCode: code.orderCode,
      amount: String(code.amount),
      passengerName: code.passengerName,
      flightNumber: code.flightNumber,
      status: code.status
    });
    setEditingCode(code);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.orderCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã đặt chỗ (PNR).' });
      return;
    }
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'Số tiền không hợp lệ.' });
      return;
    }
    if (!formData.passengerName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên hành khách.' });
      return;
    }
    if (!formData.flightNumber.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số hiệu chuyến bay.' });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        orderCode: formData.orderCode.trim().toUpperCase(),
        amount: Number(formData.amount),
        passengerName: formData.passengerName.trim().toUpperCase(),
        flightNumber: formData.flightNumber.trim().toUpperCase(),
        status: formData.status,
        updatedAt: serverTimestamp()
      };

      if (editingCode?.id) {
        await updateDoc(doc(db, 'basedata', editingCode.id), data);
        setMessage({ type: 'success', text: 'Cập nhật mã đặt chỗ thành công!' });
      } else {
        const q = query(collection(db, 'basedata'), where('orderCode', '==', data.orderCode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setMessage({ type: 'error', text: `Mã PNR "${data.orderCode}" đã tồn tại trong hệ hệ thống.` });
          setIsSaving(false);
          return;
        }
        await addDoc(collection(db, 'basedata'), { ...data, createdAt: serverTimestamp() });
        setMessage({ type: 'success', text: 'Thêm mã đặt chỗ thành công!' });
      }

      setTimeout(() => {
        setIsFormOpen(false);
        resetForm();
      }, 800);
    } catch (error) {
      console.error('Save booking code error:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code: BookingCode) => {
    if (!code.id) return;
    try {
      await deleteDoc(doc(db, 'basedata', code.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete booking code error:', error);
      alert('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  const stats = useMemo(() => ({
    total: codes.length,
    valid: codes.filter(c => c.status === 'valid').length,
    refunded: codes.filter(c => c.status === 'refunded').length,
    totalAmount: codes.reduce((sum, c) => sum + c.amount, 0)
  }), [codes]);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-[#0A73D1] shadow-sm rounded p-2.5 md:p-3">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-tight mb-0.5">Tổng PNR</p>
          <div className="text-xl md:text-2xl font-black text-blue-900 leading-none">{stats.total}</div>
        </div>
        <div className="bg-white border border-emerald-500 shadow-sm rounded p-2.5 md:p-3">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-tight mb-0.5">Hiệu lực</p>
          <p className="text-xl md:text-2xl font-black text-emerald-600 leading-none">{stats.valid}</p>
        </div>
        <div className="bg-white border border-red-500 shadow-sm rounded p-2.5 md:p-3">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-tight mb-0.5">Hoàn tiền</p>
          <p className="text-xl md:text-2xl font-black text-red-600 leading-none">{stats.refunded}</p>
        </div>
        <div className="bg-[#06427D] border border-[#0A73D1] shadow-sm rounded p-2.5 md:p-3 text-white">
          <p className="text-[10px] md:text-[11px] font-bold text-blue-200 uppercase tracking-tight mb-0.5">Tổng giá trị</p>
          <p className="text-lg md:text-xl font-black leading-none truncate mt-1">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(stats.totalAmount)}
          </p>
        </div>
      </div>

      <div className="w-full bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
        <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
          <div className="flex items-center gap-2">
            <TicketCheck size={20} className="text-white" />
            <h3 className="text-white font-bold text-[16px] uppercase font-sans tracking-wide">Quản lý mã đặt chỗ</h3>
          </div>
          <button 
            onClick={openAddForm}
            className="bg-[#FF8800] hover:bg-[#FF6600] text-white text-[12px] font-bold px-3 py-1.5 rounded shadow flex items-center gap-1 transition-colors uppercase"
          >
            <Plus size={14} /> Thêm mã PNR
          </button>
        </div>

        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-gray-50 p-2.5 border border-gray-200 rounded mb-3">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm mã PNR, hành khách, chuyến bay..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-[11px] font-bold text-gray-500 uppercase w-20 md:w-auto">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'valid' | 'refunded')}
                className="px-2.5 py-1.5 text-[12px] font-bold border border-gray-300 rounded bg-white outline-none focus:border-blue-500 cursor-pointer flex-1 md:flex-none"
              >
                <option value="all">TẤT CẢ</option>
                <option value="valid">CÒN HIỆU LỰC</option>
                <option value="refunded">ĐÃ HOÀN TIỀN</option>
              </select>
            </div>
          </div>

          {/* Table View (Desktop) */}
          <div className="hidden md:block overflow-x-auto border border-gray-200">
            <table className="w-full text-left text-[13px] text-gray-700 min-w-[800px]">
              <thead>
                <tr className="bg-[#f5f5f5] text-[#0A58A3] border-b border-gray-300">
                  <th className="px-3 py-2.5 font-bold uppercase w-28">Mã PNR</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Hành khách</th>
                  <th className="px-3 py-2.5 font-bold uppercase w-32">Chuyến bay</th>
                  <th className="px-3 py-2.5 font-bold uppercase w-36 text-right">Số tiền</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center w-36 text-center">Trạng thái</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-red-500 font-bold italic border-t border-gray-200 bg-red-50">
                      KHÔNG TÌM THẤY MÃ PHÙ HỢP
                    </td>
                  </tr>
                ) : (
                  paginatedCodes.map(code => (
                    <tr key={code.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2.5 font-black text-black tracking-widest border-r border-gray-100 font-mono">
                        {code.orderCode}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-black border-r border-gray-100 uppercase">
                        {code.passengerName}
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <Plane size={14} className="text-gray-400" />
                          <span className="font-bold text-gray-700 uppercase">{code.flightNumber}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-black text-orange-600 border-r border-gray-100 text-right">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(code.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-gray-100">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                          code.status === 'valid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {code.status === 'valid' ? 'CÒN HIỆU LỰC' : 'ĐÃ HOÀN'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditForm(code)}
                            className="text-orange-600 hover:text-orange-800 text-[11px] font-bold uppercase flex items-center gap-1"
                          >
                            <Edit2 size={12} /> Sửa
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => setDeleteConfirm(code)}
                            className="text-red-600 hover:text-red-800 text-[11px] font-bold uppercase flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Xóa
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
            {paginatedCodes.length === 0 ? (
              <div className="p-10 text-center text-red-500 font-bold bg-red-50">KHÔNG CÓ DỮ LIỆU</div>
            ) : (
              paginatedCodes.map(code => (
                <div key={code.id} className="p-4 bg-white active:bg-blue-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[14px] font-black text-[#0A58A3] tracking-wider font-mono leading-none">{code.orderCode}</p>
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <Plane size={11} className="text-gray-400" />
                        <span className="font-bold uppercase">{code.flightNumber}</span>
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded uppercase shadow-sm ${
                      code.status === 'valid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {code.status === 'valid' ? 'HIỆU LỰC' : 'ĐÃ HOÀN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-3">
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Hành khách</p>
                      <p className="text-[12px] font-bold text-gray-800 truncate uppercase">{code.passengerName}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Số tiền</p>
                      <p className="text-[13px] font-black text-orange-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(code.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEditForm(code)}
                      className="px-3 py-1.5 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 rounded uppercase flex items-center gap-1"
                    >
                      <Edit2 size={10} /> Sửa
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(code)}
                      className="px-3 py-1.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded uppercase flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {!isSaving && filteredCodes.length > codesPerPage && (
            <div className="mt-3">
               <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-md shadow-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-[16px] font-black tracking-tight text-[#06427D] uppercase">
                {editingCode ? 'Chỉnh sửa PNR' : 'Thêm mã PNR mới'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-2.5 rounded text-[13px] font-bold ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Mã đặt chỗ (PNR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.orderCode}
                  onChange={(e) => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })}
                  placeholder="VD: ABCXYZ"
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded outline-none focus:border-[#0A73D1] uppercase"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Số tiền (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="VD: 2500000"
                  min="0"
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded outline-none focus:border-[#0A73D1]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Tên hành khách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.passengerName}
                  onChange={(e) => setFormData({ ...formData, passengerName: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded outline-none focus:border-[#0A73D1] uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Số hiệu chuyến bay <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
                  placeholder="VD: VN123"
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded outline-none focus:border-[#0A73D1] uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'valid' | 'refunded' })}
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded outline-none focus:border-[#0A73D1]"
                >
                  <option value="valid">Còn hiệu lực</option>
                  <option value="refunded">Đã hoàn tiền</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-[12px] py-2 rounded uppercase transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] py-2 rounded uppercase transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'ĐANG LƯU...' : editingCode ? 'LƯU THAY ĐỔI' : 'THÊM MỚI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white rounded-md shadow-2xl p-6 border border-gray-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 border border-red-200">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-[16px] font-black text-gray-900 uppercase mb-2">Xác nhận xóa</h3>
            <p className="text-[13px] text-gray-600 mb-6">
              Bạn có chắc muốn xóa mã PNR <span className="font-bold text-red-600">{deleteConfirm.orderCode}</span>?
              <br/><span className="text-xs italic mt-1 block">Không thể hoàn tác hành động này.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[13px] py-2 rounded transition-colors uppercase"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] py-2 rounded transition-colors uppercase"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
