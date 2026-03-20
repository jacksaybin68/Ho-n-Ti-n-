import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { formatDate, cn } from '../../../utils';
import { AuditLog } from '../../../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export function AuditLogView({ logs }: AuditLogViewProps) {
  const [filterAction, setFilterAction] = useState<AuditLog['action'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const filteredLogs = useMemo(() => {
    return logs.filter(l => filterAction === 'all' || l.action === filterAction);
  }, [logs, filterAction]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filterAction]);

  const actionLabels: Record<string, string> = {
    update_user: 'Cập nhật user',
    delete_user: 'Khóa user',
    update_request: 'Cập nhật yêu cầu',
    bulk_action: 'Hành động hàng loạt',
    create_user: 'Tạo user',
  };

  return (
    <div className="w-full bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
      <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-white" />
          <h3 className="text-white font-bold text-[16px] uppercase font-sans tracking-wide">Nhật ký Admin</h3>
        </div>
        <div className="text-white text-[12px] font-bold px-3 py-1 bg-white/10 rounded border border-white/20">
          {logs.length} hành động
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2.5 border border-gray-200 rounded mb-3">
          <span className="text-[12px] font-bold text-gray-700 uppercase mr-1">Lọc hành động:</span>
          {(['all', 'update_user', 'delete_user', 'update_request', 'bulk_action', 'create_user'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterAction(f)}
              className={cn(
                'px-3 py-1.5 text-[12px] font-bold rounded transition-colors',
                filterAction === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
              )}
            >
              {f === 'all' ? 'Tất cả' : actionLabels[f] || f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-[13px] text-gray-700 min-w-[700px]">
            <thead>
              <tr className="bg-[#f5f5f5] text-[#0A58A3] border-b border-gray-300">
                <th className="px-3 py-2.5 font-bold uppercase w-48">Thời gian</th>
                <th className="px-3 py-2.5 font-bold uppercase w-64">Admin</th>
                <th className="px-3 py-2.5 font-bold uppercase w-48 text-center">Hành động</th>
                <th className="px-3 py-2.5 font-bold uppercase">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-red-500 font-bold italic border-t border-gray-200 bg-red-50">
                    KHÔNG CÓ NHẬT KÝ NÀO PHÙ HỢP
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 border-r border-gray-100 text-[12px] text-gray-600">
                      {formatDate(log.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700">
                          {log.adminEmail?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <span className="text-[13px] font-bold text-black truncate max-w-[150px]">
                          {log.adminEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold border uppercase inline-flex items-center gap-1',
                        log.action === 'delete_user' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-700">
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(log.changes as Record<string, { old: unknown; new: unknown }>).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-black uppercase tracking-tight">
                                {key === 'status' ? 'Trạng thái' : key === 'adminNote' ? 'Ghi chú' : key}:
                              </span>
                              <span className="line-through text-gray-400">
                                {String(val.old)}
                              </span>
                              <span className="mx-1 text-gray-400">→</span>
                              <span className="font-bold text-emerald-600">
                                {String(val.new)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : log.action === 'bulk_action' && log.affectedIds ? (
                        <span className="font-bold text-blue-800">Áp dụng cho {log.affectedIds.length} yêu cầu</span>
                      ) : (
                        <span className="italic text-gray-400">Không có chi tiết</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length > logsPerPage && (
          <div className="mt-3">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </div>
  );
}
