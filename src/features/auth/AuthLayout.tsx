/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Plane } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="bg-white min-h-[100dvh] font-sans text-gray-800 antialiased flex flex-col">
      
      {/* Top Header */}
      <div className="w-full max-w-[1020px] mx-auto px-4 py-3 flex justify-between items-center bg-white shadow-sm relative z-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-amber-500 italic tracking-tighter shadow-sm flex flex-col leading-none">
            <span className="text-blue-900 text-xl font-bold not-italic mb-1">TRUNG TÂM HỖ TRỢ</span>
            <span>HÀNG KHÔNG VIỆT NAM</span>
          </h1>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="w-full bg-[#113C85] shadow-md border-b-2 border-orange-500">
        <div className="w-full max-w-[1020px] mx-auto flex items-center">
          <button className="h-[42px] px-4 flex items-center justify-center bg-gradient-to-b from-blue-300 to-[#113C85] border-r border-[#1a4a9c]" onClick={() => window.location.reload()}>
            <Home size={22} className="text-white" />
          </button>
          <nav className="flex-1 flex text-[13px] font-bold text-white uppercase overflow-hidden tracking-tight leading-none">
            <a href="#" onClick={e => {e.preventDefault(); window.location.reload();}} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c]">Trang chủ</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Vé nội địa</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Vé quốc tế</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Hoàn Tiền Vé</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Tin khuyến mại</a>
          </nav>
        </div>
      </div>

      {/* Main Content Form Area */}
      <div className="flex-1 w-full max-w-[1020px] mx-auto py-10 px-4 flex justify-center items-center pt-16 relative">
        <div className="w-full max-w-[380px]">
          <div className="rounded-t-md overflow-hidden bg-[#0A58A3] shadow-lg border border-[#06427D]">
            <div className="bg-[#0A58A3] py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 border-[#FF8800]">
               <h2 className="text-white font-black text-xl uppercase tracking-wider font-sans m-0 text-center leading-tight">
                 {title}
               </h2>
            </div>
            <div className="p-5 bg-white">
              <p className="text-[12px] text-orange-600 font-bold mb-4 pb-3 border-b border-gray-100 text-center uppercase tracking-wide">
                {subtitle}
              </p>
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full bg-[#113C85] border-t-4 border-[#FFAA00] py-6 mt-auto relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/airline-bg.png')] bg-cover bg-center mix-blend-overlay opacity-10"></div>
        <div className="w-full max-w-[1020px] mx-auto px-4 md:px-0 relative z-10">
          {/* Footer Grid */}
          <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8 pb-6 border-b border-[#2151A1]/60">
            <div className="text-white text-[12px] space-y-2">
              <h4 className="text-[#FF8800] font-black text-[13px] uppercase mb-3 flex items-center gap-1.5"><Plane size={14} className="rotate-45" /> BẠN CÒN THẮC MẮC</h4>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Liên hệ</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Hướng dẫn thanh toán</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Hướng dẫn đặt vé</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Câu hỏi thường gặp</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Chăm sóc khách hàng</p>
            </div>
            <div className="text-white text-[12px] space-y-2">
              <h4 className="text-[#FF8800] font-black text-[13px] uppercase mb-3 flex items-center gap-1.5"><Plane size={14} className="rotate-45" /> VỀ CHÚNG TÔI</h4>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Giới thiệu</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Các đơn vị hợp tác</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Điều khoản sử dụng</p>
              <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80"><span className="w-1 h-1 rounded-full bg-white opacity-50" />Chính sách bảo mật</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-blue-200 mt-4 leading-relaxed max-w-sm ml-auto opacity-70">
            TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM<br/>
            Số ĐKKD 01xxxxxxx - Mã số thuế: 0105xxxxxx<br/>
            © 2026 TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
};
