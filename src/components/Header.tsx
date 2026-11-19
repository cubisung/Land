import React, { useState } from 'react';
import {
  QrCode,
  History,
  Users,
  LogOut,
  Lock,
  ShieldCheck,
  Clock,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  HelpCircle,
  BarChart3,
  FolderDown,
  Cloud,
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenDashboard: () => void;
  onOpenUserGuide: () => void;
  onDownloadOfflineHtml?: () => void;
  savedCount: number;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenAdminModal: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  pendingUsersCount?: number;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenDashboard,
  onOpenUserGuide,
  savedCount,
  currentUser,
  onOpenAuth,
  onOpenAdminModal,
  onOpenProfileModal,
  onLogout,
  pendingUsersCount = 0,
  isCloudConnected = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-[#00529C] via-[#8C1B20] to-[#E31B23] text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-xs text-white shadow-xs flex items-center justify-center font-bold text-lg border border-white/20 shrink-0">
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight leading-tight">
                Hệ thống hỗ trợ định giá
              </h1>
            </div>
          </div>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* User Guide Page Button - Icon Only */}
          <button
            onClick={onOpenUserGuide}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white shadow-xs transition cursor-pointer border border-white/30 backdrop-blur-xs flex items-center justify-center shrink-0"
            title="Hướng dẫn sử dụng web app"
            aria-label="Hướng dẫn sử dụng"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
          </button>

          {/* Statistics / Dashboard Button - Icon Only */}
          <button
            onClick={onOpenDashboard}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white shadow-xs transition cursor-pointer border border-white/30 backdrop-blur-xs flex items-center justify-center shrink-0"
            title="Thống kê định giá"
            aria-label="Thống kê định giá"
          >
            <BarChart3 className="w-4 h-4 text-white" />
          </button>

          {/* Download Source Code ZIP */}
          <a
            href="/api/download-source-zip"
            download="he-thong-dinh-gia-qr-code.zip"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white shadow-xs transition cursor-pointer border border-white/30 backdrop-blur-xs flex items-center justify-center shrink-0"
            title="Tải toàn bộ mã nguồn dự án (.ZIP)"
            aria-label="Tải mã nguồn ZIP"
          >
            <FolderDown className="w-4 h-4 text-emerald-300" />
          </a>

          <button
            onClick={onOpenHistory}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/30 shadow-xs transition cursor-pointer backdrop-blur-xs"
            title="Xem lịch sử mã QR đã lưu (Đồng bộ Cloud)"
          >
            <History className="w-4 h-4 text-white" />
            <span>Lịch sử</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E31B23] text-white">
                {savedCount}
              </span>
            )}
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isCloudConnected ? 'Cloud đã đồng bộ' : 'Đang đồng bộ qua Server Cloud'}
            />
          </button>

          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              {currentUser.role === 'admin' && (
                <button
                  onClick={onOpenAdminModal}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-xs shadow-xs hover:bg-amber-300 transition cursor-pointer border border-amber-300"
                  title="Mở bảng Quản lý thành viên"
                >
                  <Users className="w-4 h-4 text-slate-900" />
                  <span>Quản Lý Thành Viên</span>
                  {pendingUsersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-extrabold text-[10px] animate-pulse">
                      {pendingUsersCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Profile Button */}
              <button
                onClick={onOpenProfileModal}
                className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 px-2.5 py-1 rounded-xl border border-white/20 text-xs transition cursor-pointer"
                title="Mở trang quản lý thông tin tài khoản"
              >
                <div className="w-6 h-6 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center font-bold text-[11px] uppercase">
                  {currentUser.username.slice(0, 1)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white leading-none flex items-center gap-1">
                    {currentUser.username}
                    {currentUser.role === 'admin' ? (
                      <ShieldCheck className="w-3 h-3 text-amber-300" />
                    ) : (
                      <UserCheck className="w-3 h-3 text-emerald-300" />
                    )}
                  </span>
                  <span className="text-[9px] text-blue-200 uppercase tracking-wider mt-0.5">
                    Quản Lý Hồ Sơ
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition border border-white/20 cursor-pointer"
                title="Đăng xuất tài khoản"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-900 font-bold text-xs shadow-xs hover:bg-amber-300 transition cursor-pointer border border-amber-300"
            >
              <Lock className="w-3.5 h-3.5 text-slate-900" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>

        {/* Mobile Header Buttons */}
        <div className="flex items-center gap-1.5 md:hidden">
          {/* Dashboard Icon */}
          <button
            onClick={onOpenDashboard}
            className="p-2 rounded-xl bg-white/15 text-white border border-white/20 flex items-center justify-center cursor-pointer"
            title="Thống kê định giá"
            aria-label="Thống kê định giá"
          >
            <BarChart3 className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={onOpenUserGuide}
            className="p-2 rounded-xl bg-white/15 text-white border border-white/20 flex items-center justify-center cursor-pointer"
            title="Xem Hướng Dẫn Sử Dụng"
            aria-label="Xem Hướng Dẫn"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
          </button>

          {savedCount > 0 && (
            <button
              onClick={onOpenHistory}
              className="relative p-2 rounded-xl bg-white/15 text-white border border-white/20 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[9px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 border border-white/30 cursor-pointer transition flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-white/10 px-4 py-4 space-y-3 animate-fadeIn">
          {/* User Status Card on Mobile */}
          {currentUser ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm uppercase">
                  {currentUser.username.slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1">
                    {currentUser.username}
                    {currentUser.role === 'admin' && (
                      <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-1.5 py-0.2 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="py-1.5 px-3 bg-[#00529C] hover:bg-[#003d75] text-white font-bold text-xs rounded-xl flex items-center gap-1 border border-blue-400/30"
              >
                <span>Hồ Sơ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200">
                Chưa đăng nhập. Đăng nhập để đồng bộ mã QR Cloud.
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="py-1.5 px-3 bg-amber-400 text-slate-900 font-bold text-xs rounded-xl shadow-xs"
              >
                Đăng Nhập
              </button>
            </div>
          )}

          {/* Mobile Navigation Links */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUserGuide();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-between border border-slate-700/50"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Hướng Dẫn Sử Dụng (Biểu Tượng)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDashboard();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center justify-between border border-emerald-400/40 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-white" />
                <span>Dashboard Thống Kê Định Giá</span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-200" />
            </button>

            <a
              href="/api/download-source-zip"
              download="he-thong-dinh-gia-qr-code.zip"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-between border border-slate-700/50"
            >
              <div className="flex items-center gap-2">
                <FolderDown className="w-4 h-4 text-emerald-400" />
                <span>Tải Toàn Bộ Mã Nguồn (.ZIP)</span>
              </div>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                ZIP
              </span>
            </a>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenHistory();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-between border border-slate-700/50"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>Xem Lịch Sử Mã QR</span>
              </div>
              <span className="bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {savedCount} mã
              </span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-between border border-slate-700/50"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Quản Lý Thông Tin Cá Nhân</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-between border border-amber-500/30"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Quản Lý Thành Viên (Admin)</span>
                </div>
                {pendingUsersCount > 0 && (
                  <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                    {pendingUsersCount} chờ
                  </span>
                )}
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold flex items-center gap-2 border border-red-500/30 mt-2"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};



