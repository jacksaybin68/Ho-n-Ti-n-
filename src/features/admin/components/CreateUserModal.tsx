import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, XCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { UserProfile } from '../../../types';
import { db, doc, setDoc, collection, addDoc, serverTimestamp } from '../../../mockFirebase';

interface CreateUserModalProps {
  onClose: () => void;
  adminProfile: UserProfile;
}

export function CreateUserModal({ onClose, adminProfile }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    sdt: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.sdt.trim() || !formData.password.trim() || !formData.email.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      // Use a valid UUID to match the Postgres UUID type
      const uid = crypto.randomUUID();
      const email = formData.email.trim();

      const userData: UserProfile = {
        uid,
        displayName: formData.displayName.trim(),
        sdt: formData.sdt.replace(/\D/g, ''),
        email,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), userData);

      // We skip localstorage mock as we are now fully on Supabase.
      // Note: Admin cannot create Auth users directly from frontend without Service Role Key.
      // For now, this only creates the User Profile. The actual password won't be set in Supabase Auth.

      await addDoc(collection(db, 'adminAuditLog'), {
        adminId: adminProfile.uid,
        adminEmail: adminProfile.email,
        action: 'create_user',
        targetId: uid,
        targetType: 'user',
        changes: {
          displayName: { old: '', new: formData.displayName.trim() },
          sdt: { old: '', new: formData.sdt.replace(/\D/g, '') },
          email: { old: '', new: email },
        },
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md glass-card shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Tạo tài khoản người dùng</h3>
              <p className="text-[10px] text-black">Tạo tài khoản mới cho khách hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button 
                type="button"
                onClick={() => setError(null)} 
                className="flex-shrink-0 p-0.5 rounded hover:bg-rose-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">Tài khoản đã được tạo thành công!</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Họ và tên <span className="text-rose-500">*</span></label>
            <input
              required
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Nhập họ tên đầy đủ"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Số điện thoại <span className="text-rose-500">*</span></label>
            <input
              required
              type="tel"
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Ví dụ: 0912345678"
              value={formData.sdt}
              onChange={e => setFormData({ ...formData, sdt: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Email <span className="text-rose-500">*</span></label>
            <input
              required
              type="email"
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Địa chỉ email đăng nhập"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Mật khẩu <span className="text-rose-500">*</span></label>
            <input
              required
              type="password"
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Ít nhất 6 ký tự"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1 py-2.5" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1 py-2.5" loading={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
