import React from 'react';
import { Plane, RefreshCcw, LogIn, MonitorSmartphone, Calendar, Users, Home, MapPin, Search } from 'lucide-react';
import { format } from 'date-fns';

interface AbayHomePageProps {
  onLoginClick: () => void;
}

export const AbayHomePage: React.FC<AbayHomePageProps> = ({ onLoginClick }) => {
  return (
    <div className="bg-white min-h-[100dvh] font-sans text-gray-800 antialiased selection:bg-orange-200">
      
      {/* Top Header */}
      <div className="w-full max-w-[1020px] mx-auto px-4 py-3 flex justify-between items-center bg-white shadow-sm relative z-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-amber-500 italic tracking-tighter shadow-sm flex flex-col leading-none">
            <span className="text-blue-900 text-xl font-bold not-italic mb-1">TRUNG TÂM HỖ TRỢ</span>
            <span>HÀNG KHÔNG VIỆT NAM</span>
          </h1>
          <p className="text-xs text-orange-600 font-bold ml-1 mt-1 uppercase">Dịch vụ hỗ trợ & Hoàn vé chuyên nghiệp 24/7</p>
        </div>
        
      </div>

      {/* Main Navigation Menu */}
      <div className="w-full bg-[#113C85] shadow-md border-b-2 border-orange-500">
        <div className="w-full max-w-[1020px] mx-auto flex items-center">
          <button className="h-[42px] px-4 flex items-center justify-center bg-gradient-to-b from-blue-300 to-[#113C85] border-r border-[#1a4a9c]">
            <Home size={22} className="text-white" />
          </button>
          <nav className="flex-1 flex text-[13px] font-bold text-white uppercase overflow-hidden tracking-tight leading-none">
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Trang chủ</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Vé nội địa</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Vé quốc tế</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Hoàn Tiền Vé</a>
            <a href="#" onClick={e => e.preventDefault()} className="h-[42px] px-4 flex items-center hover:bg-[#0d2e66] transition-colors border-r border-[#1a4a9c] cursor-default">Tin khuyến mại</a>
            <button
               onClick={onLoginClick}
               className="h-[42px] px-5 flex items-center hover:bg-[#0d2e66] transition-colors border-x border-[#1a4a9c] ml-auto text-amber-300 group hover:text-amber-200 cursor-pointer"
            >
              <LogIn size={15} className="mr-1.5 group-hover:scale-110 transition-transform" /> ĐĂNG NHẬP HỆ THỐNG
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[900px] mx-auto mt-4 flex flex-col md:flex-row gap-5 px-4 md:px-0">
        
        {/* Left Column: Search Box */}
        <div className="w-full md:w-[420px] flex flex-col gap-4">
          <div className="rounded-t-md overflow-hidden bg-[#0A58A3] shadow-lg border border-[#06427D]">
            <div className="bg-[#06427D] py-2 px-4 flex items-center gap-2 border-b border-[#0A73D1]">
              <Plane className="text-white fill-white transform rotate-45" size={16} />
              <h2 className="text-white font-bold text-[13px] uppercase font-sans tracking-wide">TÌM VÉ MÁY BAY</h2>
            </div>
            
            <div className="p-3 flex flex-col gap-2">
              {/* Trip Type */}
              <div className="flex items-center gap-4 text-white text-[13px] font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="abayTrip" defaultChecked className="w-4 h-4 text-orange-500 bg-white" /> Khứ hồi
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="abayTrip" className="w-4 h-4 text-orange-500 bg-white" /> Một chiều
                </label>
              </div>

              {/* Locations */}
              <div className="flex items-end gap-1 relative">
                <div className="flex-1">
                  <label className="text-white text-[11px] block mb-0.5 font-semibold">Điểm đi</label>
                  <div className="relative">
                    <input type="text" defaultValue="Tp Hồ Chí Minh" className="w-full h-8 px-2 text-[14px] text-black border border-gray-300 rounded-sm bg-white font-bold" />
                    <Plane size={14} className="absolute right-2 top-2 text-gray-400 rotate-45" />
                  </div>
                </div>
                
                <button className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm mb-0">
                  <RefreshCcw size={14} className="text-gray-600" />
                </button>
                
                <div className="flex-1">
                  <label className="text-white text-[11px] block mb-0.5 font-semibold relative text-right">Điểm đến <Plane size={14} className="inline absolute left-0 bottom-0 rotate-135 text-white opacity-50" /></label>
                  <div className="relative">
                    <input type="text" defaultValue="Hà Nội" className="w-full h-8 px-2 text-[14px] text-black border border-gray-300 rounded-sm bg-white font-bold" />
                    <MapPin size={14} className="absolute right-2 top-2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-white text-[11px] block mb-0.5 font-semibold">Ngày đi</label>
                  <div className="relative">
                    <input type="text" defaultValue={format(new Date(), 'dd/MM/yyyy')} className="w-full h-8 px-2 pr-8 text-[13px] text-black border border-gray-300 rounded-sm bg-white font-semibold" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#f5f5f5] border-l border-gray-300 flex items-center justify-center pointer-events-none">
                      <Calendar size={14} className="text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-white text-[11px] block mb-0.5 font-semibold text-right">Ngày về</label>
                  <div className="relative">
                    <input type="text" placeholder="dd/mm/yyyy" className="w-full h-8 px-2 pr-8 text-[13px] text-black border border-gray-300 rounded-sm bg-white font-semibold" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#f5f5f5] border-l border-gray-300 flex items-center justify-center pointer-events-none">
                      <Calendar size={14} className="text-blue-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Passengers */}
              <div className="flex gap-4 mt-1">
                <div className="flex-1 flex items-center gap-1 bg-transparent">
                  <label className="text-white text-[11px] font-semibold whitespace-nowrap">Người lớn</label>
                  <select className="w-10 h-6 text-[11px] font-bold border border-gray-300 rounded-sm bg-white text-center">
                    <option>1</option><option>2</option><option>3</option>
                  </select>
                  <span className="text-[9px] text-white/50 whitespace-nowrap">≥12t</span>
                </div>
                <div className="flex-1 flex items-center gap-1 bg-transparent">
                  <label className="text-white text-[11px] font-semibold whitespace-nowrap">Trẻ em</label>
                  <select className="w-10 h-6 text-[11px] font-bold border border-gray-300 rounded-sm bg-white text-center">
                    <option>0</option><option>1</option><option>2</option>
                  </select>
                  <span className="text-[9px] text-white/50 whitespace-nowrap">2-12t</span>
                </div>
                <div className="flex-1 flex items-center gap-1 bg-transparent">
                  <label className="text-white text-[11px] font-semibold whitespace-nowrap">Em bé</label>
                  <select className="w-10 h-6 text-[11px] font-bold border border-gray-300 rounded-sm bg-white text-center">
                    <option>0</option><option>1</option>
                  </select>
                  <span className="text-[9px] text-white/50 whitespace-nowrap">&lt;2t</span>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex items-center justify-between">
                <a href="#" onClick={e=>e.preventDefault()} className="hidden text-[11px] text-white underline hover:text-orange-300 bg-red-600 px-2 py-0.5 rounded cursor-default">Xem video</a>
                <button type="button" onClick={e=>e.preventDefault()} className="flex-1 h-11 bg-gradient-to-b from-[#FF8800] to-[#E55A00] hover:from-[#FFAA00] hover:to-[#FF6600] text-white font-black text-[15px] rounded flex items-center justify-center gap-2 border border-[#C24D00] shadow-md uppercase tracking-wide cursor-pointer transition-colors w-full active:scale-[0.98]">
                  <Search size={16} strokeWidth={3} className="pt-0.5" />
                  <span>Tìm chuyến bay</span>
                </button>
              </div>
            </div>
          </div>
          
          <img src="/airline-bg.png" alt="Ads" className="w-full h-auto mt-2 cursor-pointer shadow-sm border border-gray-200" onClick={onLoginClick}/>
        </div>

        {/* Right Column: Banners & Promos */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Main Huge Banner */}
          <div className="w-full h-[220px] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-md relative overflow-hidden shadow-md flex items-center p-6 border border-blue-200">
            <div className="absolute inset-0 bg-[url('/airline-bg.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <div className="relative z-10 flex flex-col gap-2 w-1/2">
              <h3 className="text-white md:text-[28px] text-2xl font-black italic tracking-tight drop-shadow-md leading-[1.1]">TÌM VÉ MÁY BAY<br/>RẺ NHẤT MỖI NGÀY</h3>
              <p className="text-yellow-200 font-bold text-[13px] drop-shadow border-t border-white/20 pt-2 mt-1">Đặt vé máy bay rẻ, uy tín với sự hỗ trợ chuyên nghiệp nhất.</p>
              <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-[13px] uppercase tracking-wider px-6 py-2.5 rounded-full w-max shadow-xl shadow-orange-500/30 mt-3 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-orange-400" onClick={onLoginClick}>Quản lý hoàn vé <Plane size={15} className="mb-0.5" strokeWidth={2.5} /></button>
            </div>
            <div className="absolute right-4 bottom-0 w-[45%] h-[110%] bg-contain bg-no-repeat bg-bottom z-10">
               {/* Phone mockup */}
               <div className="w-full h-full relative">
                 <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-48 h-[280px] bg-white rounded-3xl border-4 border-gray-800 shadow-2xl flex flex-col overflow-hidden rotate-[-10deg]">
                    <div className="w-full h-10 bg-blue-600 flex items-center justify-center text-white text-xs font-bold">App Đặt Vé</div>
                    <div className="flex-1 bg-gray-50 p-2 text-center text-[10px] space-y-2">
                       <div className="w-full p-2 bg-white rounded shadow-sm text-left"><span className="font-bold">SGN ✈ HAN</span><br/><span className="text-orange-500 font-bold">790,000 đ</span></div>
                       <div className="w-full p-2 bg-white rounded shadow-sm text-left"><span className="font-bold">HAN ✈ DAD</span><br/><span className="text-orange-500 font-bold">390,000 đ</span></div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Recent Flights Table */}
          <div className="mt-2 border-t border-gray-200 pt-3 flex-1">
            <h3 className="text-blue-900 font-bold text-[15px] uppercase mb-3 flex items-center gap-2">
              Yêu cầu hoàn tiền mới nhất
            </h3>
            <table className="w-full text-[13px] text-gray-700">
              <tbody>
                {[
                  { code: '#HT-10042', route: 'Hà Nội ✈ Đà Nẵng', amount: '1,200,000 đ', status: 'Đang xử lý', airline: 'VNA', delay: '45 phút' },
                  { code: '#HT-10041', route: 'HCM ✈ Hà Nội', amount: '2,350,000 đ', status: 'Đã duyệt', airline: 'VNĐ', delay: '2 giờ' },
                  { code: '#HT-10040', route: 'Hà Nội ✈ Nha Trang', amount: '890,000 đ', status: 'Chờ bổ sung', airline: 'VJA', delay: '1 ngày' },
                  { code: '#HT-10039', route: 'Đà Nẵng ✈ HCM', amount: '3,100,000 đ', status: 'Đang xử lý', airline: 'VNA', delay: '3 giờ' },
                  { code: '#HT-10038', route: 'HCM ✈ Phú Quốc', amount: '560,000 đ', status: 'Đã hoàn tiền', airline: 'VJA', delay: '6 giờ' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 flex items-center gap-2 py-2.5">
                    <td className="w-14 text-[11px] text-gray-400 font-mono">{row.code}</td>
                    <td className="flex-1">
                      <div className="font-bold text-black">{row.route}</div>
                      <div className="text-[11px] text-gray-500">{row.delay} — {row.airline}</div>
                    </td>
                    <td className="text-right">
                      <span className="text-orange-600 font-bold text-[15px] tabular-nums">{row.amount}</span>
                      <div className={`text-[10px] font-semibold px-1 py-0.5 rounded ${row.status === 'Đã hoàn tiền' ? 'bg-green-100 text-green-700' : row.status === 'Đã duyệt' ? 'bg-blue-100 text-blue-700' : row.status === 'Chờ bổ sung' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] text-red-600 font-semibold mt-2 italic">* Số tiền hoàn = giá vé - phí hủy theo điều kiện hãng</div>
          </div>

        </div>
      </div>
      
      {/* Testimonials & FAQs Section */}
      <div className="w-full max-w-[1020px] mx-auto mt-2 flex flex-col md:flex-row gap-5 px-4 md:px-0 mb-8 border-t border-gray-100 pt-6">
        {/* Testimonials */}
        <div className="flex-1 bg-[#FFF9E6] p-5 rounded-sm border border-[#F2E5B5] relative shadow-sm">
          <h3 className="text-[#0B3882] text-[18px] font-black tracking-tight mb-4">Khách hàng nói về chúng tôi</h3>
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-serif text-2xl text-amber-500 bg-amber-100 mt-1 flex-shrink-0 shadow-sm border border-amber-200">"</div>
              <p className="text-[12px] text-gray-700 leading-relaxed italic border-b border-amber-200/50 pb-3">Mình đã đặt vé trên website này đi nước ngoài, rất hài lòng với cách làm việc của các bạn, chắc chắn mình sẽ sử dụng dịch vụ này vào các lần sau... <br/><span className="text-gray-400 mt-1 block font-semibold not-italic">- Phạm Thúy Quỳnh - 098581XXXX</span></p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-serif text-2xl text-amber-500 bg-amber-100 mt-1 flex-shrink-0 shadow-sm border border-amber-200">"</div>
              <p className="text-[12px] text-gray-700 leading-relaxed italic border-b border-amber-200/50 pb-3">Tôi thích trang web này cung cấp nhiều thông tin bổ ích trong việc lựa chọn chuyến bay giá tốt và thông báo vô cùng kịp thời... <br/><span className="text-gray-400 mt-1 block font-semibold not-italic">- Phạm Hoàng Anh - 093551XXXX</span></p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-serif text-2xl text-amber-500 bg-amber-100 mt-1 flex-shrink-0 shadow-sm border border-amber-200">"</div>
              <p className="text-[12px] text-gray-700 leading-relaxed italic border-b border-amber-200/50 pb-3">Đây là lần đầu tiên mình đặt vé máy bay trực tuyến. Đây là hình thức đặt vé thanh toán cực kì thuận tiện và nhanh chóng... <br/><span className="text-gray-400 mt-1 block font-semibold not-italic">- Phạm Văn Sắc - 097792XXXX</span></p>
            </div>
          </div>
          <div className="text-right mt-3">
             <button className="bg-orange-500 text-white font-bold text-[11px] px-3 py-1 rounded shadow-sm hover:bg-orange-600 outline-none cursor-default active:scale-95 transition-transform">Xem thêm</button>
          </div>
        </div>

        {/* FAQs */}
        <div className="flex-1 bg-white p-5 rounded-sm border border-gray-200 relative shadow-sm">
          <div className="absolute top-0 right-6 w-8 h-10 bg-red-600 before:content-[''] before:absolute before:bottom-[-24px] before:left-0 before:border-l-[16px] before:border-r-[16px] before:border-t-[24px] before:border-transparent before:border-t-red-600 after:content-['*'] after:absolute after:text-white after:font-black after:text-2xl after:top-1 after:left-1/2 after:-translate-x-1/2"></div>
          <h3 className="text-[#0B3882] text-[18px] font-black tracking-tight mb-4">Câu hỏi thường gặp</h3>
          <ul className="text-[12px] text-gray-700 space-y-2.5">
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Phụ nữ mang thai đi máy bay cần lưu ý những gì?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Khi đi máy bay tôi có được mang theo nước mắm không?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Đi máy bay cần mang theo những loại giấy tờ gì?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Làm thế nào để đổi ngày bay và giờ bay thì làm như thế nào?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Tại sao chúng tôi là đơn vị uy tín nhất?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Em bé bao nhiêu tuổi thì được đi máy bay? Và cần giấy tờ gì?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Bị mất căn cước công dân (CCCD) thì check-in được không?</li>
            <li className="flex gap-2 hover:text-blue-600 cursor-default"><span className="text-gray-400 font-bold">»</span> Tôi cần có mặt ở sân bay bao lâu để làm thủ tục bay?</li>
          </ul>
          <div className="text-right mt-4">
             <a href="#" onClick={e=>e.preventDefault()} className="text-blue-600 text-[11px] font-bold italic hover:underline cursor-default">Xem chi tiết »</a>
          </div>
        </div>
      </div>

      {/* Dark Blue Wide Footer */}
      <div className="w-full bg-[#113C85] border-t-4 border-[#FFAA00] py-6 mt-2 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/airline-bg.png')] bg-cover bg-center mix-blend-overlay opacity-10"></div>
        <div className="w-full max-w-[1020px] mx-auto px-4 md:px-0 relative z-10">
          {/* Footer Grid */}
          <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8 pb-6 border-b border-[#2151A1]/60">
            <div className="text-white text-[12px] space-y-2">
               <h4 className="text-[#FF8800] font-black text-[13px] uppercase mb-3 flex items-center gap-1.5 drop-shadow"><Plane size={14} className="rotate-45" /> BẠN CÒN THẮC MẮC</h4>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Liên hệ</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Hướng dẫn thanh toán</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Hướng dẫn đặt vé</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Câu hỏi thường gặp</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Chăm sóc khách hàng</p>
            </div>
            <div className="text-white text-[12px] space-y-2">
               <h4 className="text-[#FF8800] font-black text-[13px] uppercase mb-3 flex items-center gap-1.5 drop-shadow"><Plane size={14} className="rotate-45" /> VỀ CHÚNG TÔI</h4>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Giới thiệu</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Các đơn vị hợp tác</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Cấu trúc trang web</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Điều khoản sử dụng</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Chính sách bảo mật</p>
            </div>
            <div className="text-white text-[12px] space-y-2">
               <h4 className="text-[#FF8800] font-black text-[13px] uppercase mb-3 flex items-center gap-1.5 drop-shadow"><Plane size={14} className="rotate-45" /> QUẢN LÝ ĐẶT HÀNG</h4>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Xem đơn hàng</p>
               <p className="hover:text-amber-200 cursor-default flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"><span className="w-1 h-1 rounded-full bg-white opacity-50"></span> Thanh toán trực tuyến</p>
            </div>
          </div>
          {/* Copyright */}
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
