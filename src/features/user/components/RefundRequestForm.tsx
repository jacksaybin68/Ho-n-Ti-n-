/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { db, addDoc, collection, serverTimestamp } from '../../../mockFirebase';
import { UserProfile } from '../../../types';
import { Button } from '../../../components/Button';
import { VIETNAMESE_BANKS } from '../../../constants';

interface RefundRequestFormProps {
  onClose: () => void;
  profile: UserProfile;
}

export const RefundRequestForm: React.FC<RefundRequestFormProps> = ({ onClose, profile }) => {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    amount: '',
    orderCode: '',
    refundReason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await addDoc(collection(db, 'refundRequests'), {
        userId: profile.uid,
        userEmail: profile.email,
        userSdt: profile.sdt,
        displayName: profile.displayName,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountHolder: formData.accountHolder,
        amount: Number(formData.amount),
        orderCode: formData.orderCode,
        refundReason: formData.refundReason,
        status: 'pending',
        isVisible: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err: any) {
      console.error('Error creating request:', err);
      setError('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[calc(100%-2rem)] sm:w-full max-w-lg sm:max-w-xl lg:max-w-2xl glass-card shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]"
      >
        <div className="p-3 sm:p-5 border-b border-border-subtle flex items-start sm:items-center justify-between bg-page/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 text-primary-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <RotateCcw size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-2xl font-black bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent truncate">Hoàn vé máy bay</h3>
              <p className="text-[10px] sm:text-sm text-muted font-medium truncate">Điền thông tin yêu cầu hoàn vé</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg text-muted hover:text-main hover:bg-primary/5 transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} className="flex-shrink-0 p-0.5 rounded hover:bg-rose-100 transition-colors"><X size={14} /></button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">Yêu cầu hoàn vé đã được gửi thành công! Chúng tôi sẽ xử lý trong 1-3 ngày làm việc.</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-main uppercase tracking-wider">Mã đặt chỗ (PNR)</label>
              <input
                required
                className="input-field shadow-sm bg-page/50 focus:bg-card"
                placeholder="Ví dụ: ABCXYZ"
                value={formData.orderCode}
                onChange={e => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-main uppercase tracking-wider">Chủ tài khoản</label>
              <input
                required
                className="input-field shadow-sm bg-page/50 focus:bg-card"
                placeholder="Tên in trên thẻ"
                value={formData.accountHolder}
                onChange={e => setFormData({ ...formData, accountHolder: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-main uppercase tracking-wider">Tên Ngân Hàng</label>
              <select
                required
                className="input-field shadow-sm bg-page/50 focus:bg-card text-main"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              >
                <option value="">Chọn ngân hàng...</option>
                {VIETNAMESE_BANKS.map(bank => (
                  <option key={bank.code} value={bank.name}>{bank.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-main uppercase tracking-wider">Số tài khoản</label>
              <input
                required
                className="input-field shadow-sm bg-page/50 focus:bg-card"
                placeholder="Nhập số tài khoản"
                value={formData.accountNumber}
                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-main uppercase tracking-wider">Số tiền hoàn (VND)</label>
              <input
                required
                type="number"
                className="input-field shadow-sm bg-page/50 focus:bg-card"
                placeholder="0"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sticky bottom-0 bg-transparent pb-2 mt-4 backdrop-blur-md">
            <Button type="button" variant="secondary" className="order-2 sm:order-1 flex-1 py-3" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="order-1 sm:order-2 flex-1 py-3" loading={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn vé'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Removed default export
