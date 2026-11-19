import React, { useState } from 'react';
import { User, Mail, Shield, CheckCircle, Clock, Key, Save, X, Sparkles, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { updateOwnProfile } from '../services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenAdminUsers?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAdminUsers,
  onProfileUpdated,
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Tên người dùng không được để trống.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const updated = await updateOwnProfile(currentUser.uid, {
        username: username.trim(),
        email: email.trim(),
      });
      setSuccessMsg('✓ Đã cập nhật thông tin cá nhân thành công!');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cập nhật thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp!');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg('✓ Đã đổi mật khẩu thành công!');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00529C] via-[#003d75] to-[#002d59] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Trang Quản Lý Thông Tin Tài Khoản</h2>
              <p className="text-xs text-blue-100">
                {currentUser.role === 'admin' ? 'Hồ sơ Quản trị viên (Admin)' : 'Hồ sơ Thành viên hệ thống'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* User Badge Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base uppercase shrink-0 ${
                currentUser.role === 'admin'
                  ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                  : 'bg-blue-100 text-[#00529C] border-2 border-blue-200'
              }`}
            >
              {currentUser.username.slice(0, 2)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-800">{currentUser.username}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {currentUser.role === 'admin' ? '👑 QUẢN TRỊ VIÊN' : '👤 THÀNH VIÊN'}
                </span>
                {currentUser.status === 'approved' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Đã Duyệt
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Chờ Phê Duyệt
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {currentUser.email} • Đăng ký: {new Date(currentUser.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Admin Quick Jump */}
          {currentUser.role === 'admin' && onOpenAdminUsers && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  Quyền Quản trị viên: Quản lý danh sách &amp; Phê duyệt thành viên
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminUsers();
                }}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer shrink-0"
              >
                Mở Quản Lý Thành Viên
              </button>
            </div>
          )}

          {/* Notification Alerts */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {/* UPDATE PROFILE FORM */}
          <form onSubmit={handleUpdateInfo} className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-[#00529C] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Chỉnh sửa thông tin cơ bản</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên hiển thị / Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Địa chỉ Email liên hệ
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00529C] hover:bg-[#003d75] text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cập Nhật Thông Tin</span>
            </button>
          </form>

          {/* CHANGE PASSWORD FORM */}
          <form onSubmit={handlePasswordChange} className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-[#00529C] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Thay đổi Mật khẩu</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Cập Nhật Mật Khẩu</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
