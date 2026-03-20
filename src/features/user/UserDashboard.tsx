/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Ticket, Clock, RefreshCw, CheckCircle2, Search, Download,
  ArrowUp, ArrowDown, ArrowUpDown, CreditCard, Eye, EyeOff, ChevronRight, Loader2,
  TicketCheck, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { RefundRequest, UserProfile, RefundStatus } from '../../types';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Pagination } from '../../components/Pagination';
import { SkeletonRow } from '../../components/SkeletonRow';
import { EmptyState } from '../../components/EmptyState';
import { RefundRequestForm } from './components/RefundRequestForm';
import { UserRequestDetailModal } from './components/UserRequestDetailModal';

// --- Helper Functions ---
function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Chờ duyệt';
    case 'approved': return 'Đã duyệt';
    case 'processing': return 'Đang xử lý';
    case 'completed': return 'Hoàn tất';
    case 'rejected': return 'Từ chối';
    default: return 'Tất cả';
  }
}

interface UserDashboardProps {
  requests: RefundRequest[];
  profile: UserProfile;
  isLoading?: boolean;
  isDashboard: boolean;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ requests, profile, isLoading, isDashboard }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pnrSearch, setPnrSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof RefundRequest | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [exportLoading, setExportLoading] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const itemsPerPage = 10;

  // Filter requests based on search and status
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (pnrSearch) {
      const searchLower = pnrSearch.toLowerCase();
      filtered = filtered.filter(r => 
        r.orderCode.toLowerCase().includes(searchLower) ||
        r.bankName.toLowerCase().includes(searchLower) ||
        r.accountNumber.includes(pnrSearch)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  }, [requests, pnrSearch, statusFilter]);

  // Sorting handler
  const handleSort = useCallback((key: keyof RefundRequest) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    setExportLoading(true);
    try {
      const headers = ['Mã PNR', 'Ngân hàng', 'Số TK', 'Số tiền', 'Mã phiếu', 'Ngày tạo', 'Trạng thái'];
      const visibleRequests = filteredRequests.filter(r => r.isVisible !== false);
      const csvData = visibleRequests.map(r => [
        r.orderCode,
        r.bankName,
        r.accountNumber,
        r.amount.toString(),
        r.refundSlipCode || '-',
        r.createdAt ? format(r.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-',
        r.status
      ]);

      const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `refund_requests_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Export error:', error);
    }
    setExportLoading(false);
  }, [filteredRequests]);

  const sortedRequests = useMemo(() => {
    if (!sortConfig.key) return filteredRequests;
    return [...filteredRequests].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof RefundRequest];
      const bVal = b[sortConfig.key as keyof RefundRequest];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortConfig]);

  const paginatedRequests = useMemo(() => {
    return sortedRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedRequests, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedRequests.length / itemsPerPage)), [sortedRequests.length, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [pnrSearch, statusFilter, sortConfig]);

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* Abay-style Status Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-white border border-[#0A73D1] shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 flex items-center justify-center rounded-full text-blue-700 shrink-0">
            <Ticket size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Tổng yêu cầu</div>
            <div className="text-base md:text-xl font-black text-blue-900 leading-none">{requests.length}</div>
          </div>
        </div>
        <div className="bg-white border border-[#FF8800] shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 flex items-center justify-center rounded-full text-[#FF8800] shrink-0">
            <Clock size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Đang chờ</div>
            <div className="text-base md:text-xl font-black text-orange-600 leading-none">{requests.filter(r => r.status === 'pending' || r.status === 'approved').length}</div>
          </div>
        </div>
        <div className="bg-white border border-purple-400 shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 flex items-center justify-center rounded-full text-purple-600 shrink-0">
            <RefreshCw size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Chuyển tiền</div>
            <div className="text-base md:text-xl font-black text-purple-700 leading-none">{requests.filter(r => r.status === 'processing').length}</div>
          </div>
        </div>
        <div className="bg-white border border-emerald-500 shadow-sm rounded flex items-center p-2 md:p-3 gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 flex items-center justify-center rounded-full text-emerald-600 shrink-0">
            <CheckCircle2 size={16} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Hoàn tất</div>
            <div className="text-base md:text-xl font-black text-emerald-700 leading-none">{requests.filter(r => r.status === 'completed').length}</div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="mt-2 bg-white rounded border border-gray-200 p-1 shadow-sm">
          <RefundRequestForm onClose={() => setIsFormOpen(false)} profile={profile} />
        </div>
      )}

      {/* Main Panel */}
      {!isFormOpen && (
        <div className="w-full bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
          
          {/* Abay Blue Header */}
          <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
            <div className="flex items-center gap-2">
              <TicketCheck className="text-white" size={20} />
              <h2 className="text-white font-bold text-[16px] uppercase font-sans tracking-wide">
                DANH SÁCH YÊU CẦU HOÀN TIỀN
              </h2>
            </div>
            
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-[#FF8800] hover:bg-[#FF6600] text-white text-[12px] font-bold px-3 py-1.5 rounded shadow flex items-center gap-1 transition-colors uppercase"
            >
              <Plus size={14} /> TẠO YÊU CẦU MỚI
            </button>
          </div>

          <div className="p-4">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 bg-gray-50 p-2 border border-gray-200 rounded mb-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Tìm PNR, ngân hàng..."
                    value={pnrSearch}
                    onChange={e => setPnrSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500 bg-white shadow-sm"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                </div>
                
                <button
                  onClick={exportToCSV}
                  disabled={exportLoading || filteredRequests.length === 0}
                  className="w-full sm:w-auto whitespace-nowrap px-4 py-1.5 text-[12px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase tracking-tight"
                >
                  {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  XUẤT CSV
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                {(['all', 'pending', 'approved', 'processing', 'completed', 'rejected'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`whitespace-nowrap px-3 py-1.5 text-[11px] md:text-[12px] font-bold rounded transition-all ${
                      statusFilter === f
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {getStatusLabel(f)}
                  </button>
                ))}
              </div>
            </div>

            {/* View for Desktop (Table) */}
            <div className="hidden md:block overflow-x-auto w-full border border-gray-200">
              <table className="w-full text-left text-[13px] text-gray-700 min-w-[700px]">
                <thead>
                  <tr className="bg-[#f5f5f5] text-[#0A58A3] border-b border-gray-300">
                    <th className="px-3 py-2.5 font-bold uppercase cursor-pointer hover:bg-gray-200 w-28" onClick={() => handleSort('orderCode')}>
                      Mã PNR {sortConfig.key === 'orderCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('amount')}>
                      Số tiền hoàn {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase text-center w-24">Mã Phiếu</th>
                    <th className="px-3 py-2.5 font-bold uppercase min-w-[160px] flex items-center gap-1">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => setShowBankInfo(v => !v)} title={showBankInfo ? 'Ẩn thông tin ngân hàng' : 'Hiện thông tin ngân hàng'}>
                        Ngân hàng / Số TK
                        {showBankInfo ? <EyeOff size={12} className="text-gray-400 shrink-0" /> : <Eye size={12} className="text-gray-400 shrink-0" />}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase cursor-pointer hover:bg-gray-200 w-36 text-center" onClick={() => handleSort('createdAt')}>
                      Ngày gửi {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase text-center w-32 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('status')}>
                      Trạng thái {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-3 py-3 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
                    ))
                  ) : paginatedRequests.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-red-500 font-bold italic border-t border-gray-200 bg-red-50">KHÔNG CÓ YÊU CẦU NÀO PHÙ HỢP</td></tr>
                  ) : (
                    paginatedRequests.map((req) => (
                      <tr 
                        key={req.id} 
                        className="hover:bg-blue-50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <td className="px-3 py-2.5 font-bold text-black border-r border-gray-100">
                          {req.orderCode}
                        </td>
                        <td className="px-3 py-2.5 text-[#FF6600] font-black tracking-tight border-r border-gray-100">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-gray-100">
                           {req.refundSlipCode ? (
                             <span className="text-[11px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded shadow-sm">{req.refundSlipCode}</span>
                           ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          {showBankInfo ? (
                            <>
                              <div className="font-bold text-black text-[12px]">{req.bankName}</div>
                              <div className="text-[11px] text-gray-500">{req.accountNumber} - {req.accountHolder}</div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-gray-400 italic">
                              <EyeOff size={13} />
                              <span className="text-[11px]">Đang ẩn</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-600 text-center border-r border-gray-100">
                           {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-gray-100">
                          <Badge status={req.status} className="!text-[10px] !px-1.5 !py-0.5 shadow-sm uppercase font-black" />
                          {req.isVisible !== false && req.adminNote && (
                            <div className="text-[10px] text-red-600 italic mt-1 leading-tight w-24 mx-auto truncate" title={req.adminNote}>{req.adminNote}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                           <button 
                              className="text-blue-600 hover:text-orange-500 font-bold text-[11px] underline underline-offset-2"
                              onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                           >
                             Chi tiết
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* View for Mobile (Cards) */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="text-center py-6 text-gray-400">Đang tải...</div>
              ) : paginatedRequests.length === 0 ? (
                <div className="text-center py-10 bg-red-50 text-red-500 font-bold rounded border border-red-100">KHÔNG CÓ DỮ LIỆU</div>
              ) : (
                paginatedRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="bg-white border-2 border-gray-100 rounded-lg p-3 shadow-sm active:bg-blue-50 transition-colors"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Mã PNR</div>
                        <div className="text-lg font-black text-blue-900">{req.orderCode}</div>
                      </div>
                      <Badge status={req.status} className="!text-[9px] shadow-sm uppercase font-black" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-dashed border-gray-200 my-2">
                       <div>
                         <div className="text-[10px] text-gray-400 uppercase font-bold">Số tiền hoàn</div>
                         <div className="text-[14px] font-black text-[#FF6600]">
                           {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)}
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-[10px] text-gray-400 uppercase font-bold">Mã Phiếu</div>
                         <div className="text-[13px] font-bold text-gray-700">{req.refundSlipCode || '-'}</div>
                       </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Ngày gửi</div>
                        <div className="text-[11px] text-gray-600 font-medium">
                          {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                        </div>
                      </div>
                      <button className="text-[11px] font-bold text-white bg-[#06427D] px-3 py-1 rounded flex items-center gap-1 uppercase">
                        Xem chi tiết <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && filteredRequests.length > itemsPerPage && (
              <div className="mt-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
            
            <div className="text-[11px] text-red-600 font-semibold mt-3 italic">* Nhấn vào 'Chi tiết' để xem hóa đơn và tin nhắn trao đổi.</div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <UserRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}

    </div>
  );
};

// Removed default export
