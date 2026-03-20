import React, { useState } from 'react';
import { 
  User as UserIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Bell 
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { UserProfile } from '../../../types';
import { translateRole, translateStatus, cn } from '../../../utils';
import { 
  db,
  doc, 
  updateDoc, 
  serverTimestamp,
  adminUpdateUserAuth
} from '../../../mockFirebase';

interface ProfileSettingsProps {
  profile: UserProfile;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email || '');
  const [sdt, setSdt] = useState(profile.sdt || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile.notificationsEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName,
        email,
        sdt,
        notificationsEnabled,
        updatedAt: serverTimestamp()
      });
      
      if (email !== profile.email) {
        await adminUpdateUserAuth(profile.uid, email);
      }
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật thông tin.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shadow-blue-200/50">
            <UserIcon size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-black">Cài đặt tài khoản</h3>
            <p className="text-sm text-black">Quản lý thông tin cá nhân của bạn</p>
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-lg mb-6 text-sm font-medium border flex items-center gap-2",
            message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
          )}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <p className="text-xs text-gray-600">Email dùng để đăng nhập.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Họ và tên</label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Số điện thoại</label>
              <input
                type="tel"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600"
                value={sdt}
                onChange={e => setSdt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Vai trò</label>
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black">
                  {translateRole(profile.role)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Trạng thái</label>
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black">
                  {translateStatus(profile.status)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                <Bell size={16} className="text-blue-600" />
                Thông báo
              </h4>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-black">Thông báo đẩy (FCM)</p>
                  <p className="text-xs text-black">Nhận thông báo về trạng thái hoàn vé và tin tức mới nhất.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-2xl transition-colors focus:outline-none",
                    notificationsEnabled ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-2xl bg-white transition-transform",
                      notificationsEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              loading={isSaving}
              disabled={isSaving || (displayName === profile.displayName && email === (profile.email || '') && sdt === (profile.sdt || '') && notificationsEnabled === (profile.notificationsEnabled ?? true))}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
