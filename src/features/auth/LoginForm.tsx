/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (phoneNumber: string, pass: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isLoading, error, success, onSwitchToRegister }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(phoneNumber, password);
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 text-[13px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-sm">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-sm">
          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[12px] font-bold text-gray-700 uppercase">Số điện thoại <span className="text-red-500">*</span></label>
          <input
            type="tel"
            required
            className="w-full h-[34px] px-3 text-[13px] text-black border border-gray-300 rounded-sm bg-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-shadow"
            placeholder="Nhập số điện thoại"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
          />
        </div>
        
        <div className="space-y-1 relative">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[12px] font-bold text-gray-700 uppercase">Mật khẩu <span className="text-red-500">*</span></label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full h-[34px] px-3 pr-10 text-[13px] text-black border border-gray-300 rounded-sm bg-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-shadow"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 bottom-0 w-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-r-sm transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="w-full h-[38px] bg-gradient-to-b from-[#FF8800] to-[#E55A00] hover:from-[#FFAA00] hover:to-[#FF6600] text-white font-black text-[14px] rounded flex items-center justify-center gap-2 border border-[#C24D00] shadow-md uppercase tracking-wide cursor-pointer transition-colors active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? <><Loader2 size={15} className="animate-spin" /> VUI LÒNG ĐỢI...</> : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Removed default export
