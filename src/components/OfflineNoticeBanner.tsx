import React from 'react';
import { ShieldCheck, Zap, Lock, Cpu } from 'lucide-react';

export const OfflineNoticeBanner: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Hoàn Toàn Offline 100%</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Tất cả mã QR được tính toán và vẽ trực tiếp trong trình duyệt bằng HTML5 Canvas.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Bảo Mật Tối Đa</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Dữ liệu liên kết, mật khẩu Wi-Fi không bao giờ gửi tới máy chủ bên ngoài.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Tải Ảnh Tốc Độ Cao</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Xuất tệp PNG, JPG, WebP và Vector SVG sắc nét độ phân giải lên đến 2048px.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
