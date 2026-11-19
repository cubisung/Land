import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import { logoutUser } from '../services/authService';

interface PendingApprovalBannerProps {
  currentUser: UserProfile;
  onRefresh?: () => void;
}

export const PendingApprovalBanner: React.FC<PendingApprovalBannerProps> = ({
  currentUser,
  onRefresh,
}) => {
  return (
    <div className="max-w-2xl mx-auto my-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto border border-amber-400/30 shadow-inner">
        <Clock className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-extrabold text-amber-900">
          Tài Khoản Đang Chờ Phê Duyệt Truỵ Cập
        </h2>
        <p className="text-xs sm:text-sm font-medium text-amber-800 max-w-lg mx-auto">
          Xin chào <strong className="text-amber-900 underline">{currentUser.username}</strong> ({currentUser.email}).
          Để đảm bảo an toàn &amp; phòng tránh rò rỉ dữ liệu, Quản trị viên (Admin) cần phê duyệt tài khoản của bạn trước khi được phép xem hoặc tạo mã QR trên Cloud.
        </p>
      </div>

      <div className="bg-white/80 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 max-w-md mx-auto space-y-1 text-left">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Hướng dẫn cấp quyền nhanh:</span>
        </div>
        <p className="text-amber-800">
          • Vui lòng thông báo cho Quản trị viên hệ thống để được phê duyệt ngay.
          <br />
          • Hoặc bạn có thể đăng xuất và sử dụng tài khoản <strong>Admin (admin / 1111)</strong> để truy cập bảng Quản trị thành viên và bấm &quot;Duyệt Cấp Quyền&quot;.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => onRefresh && onRefresh()}
          className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs transition shadow-2xs flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Kiểm Tra Trạng Thái Phê Duyệt</span>
        </button>

        <button
          onClick={() => logoutUser()}
          className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition shadow-2xs flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng Xuất Tài Khoản</span>
        </button>
      </div>
    </div>
  );
};
