import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, Shield, Trash2, Search, Plus, UserPlus, X, RefreshCw } from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '../types';
import {
  subscribeToAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUserDoc,
  registerUser,
} from '../services/authService';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Add new user form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = subscribeToAllUsers((users) => {
      setUsersList(users);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingCount = usersList.filter((u) => u.status === 'pending').length;
  const approvedCount = usersList.filter((u) => u.status === 'approved').length;

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (uid: string, newStatus: UserStatus) => {
    try {
      await updateUserStatus(uid, newStatus);
    } catch (err) {
      alert('Không thể cập nhật trạng thái người dùng!');
    }
  };

  const handleRoleToggle = async (uid: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateUserRole(uid, newRole);
    } catch (err) {
      alert('Không thể thay đổi quyền hạn!');
    }
  };

  const handleDeleteUser = async (uid: string, username: string) => {
    if (uid === currentUser.uid) {
      alert('Bạn không thể xóa chính tài khoản đang đăng nhập của mình!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" khỏi hệ thống?`)) {
      try {
        await deleteUserDoc(uid);
      } catch (err) {
        alert('Có lỗi khi xóa người dùng!');
      }
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setAddMsg('Vui lòng điền tên đăng nhập và mật khẩu!');
      return;
    }
    setAddMsg('Đang tạo người dùng...');
    try {
      await registerUser(newUsername, newEmail, newPassword);
      setAddMsg('✓ Tạo thành công!');
      setTimeout(() => {
        setIsAddFormOpen(false);
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setAddMsg(null);
      }, 1000);
    } catch (err: any) {
      setAddMsg('Lỗi: ' + (err.message || 'Không thể tạo người dùng.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00529C] via-[#003d75] to-[#002d59] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Quản Lý Thành Viên &amp; Phê Duyệt Truỵ Cập</h2>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {pendingCount} chờ duyệt
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">
                Phân quyền truy cập ứng dụng QR Cloud cho người dùng
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

        {/* Stats Summary */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-3 gap-2 shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00529C] flex items-center justify-center font-bold text-sm">
              {usersList.length}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng thành viên</span>
              <span className="text-xs font-bold text-slate-800">Tài khoản</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              {approvedCount}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Đã được duyệt</span>
              <span className="text-xs font-bold text-emerald-700">Được phép dùng</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              {pendingCount}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Yêu cầu cấp phép</span>
              <span className="text-xs font-bold text-amber-700">Chờ Admin duyệt</span>
            </div>
          </div>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên đăng nhập hoặc email..."
                className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00529C]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt ({pendingCount})</option>
              <option value="approved">Đã phê duyệt ({approvedCount})</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Thành Viên Mới</span>
          </button>
        </div>

        {/* Add User Form Drawer */}
        {isAddFormOpen && (
          <form onSubmit={handleAddUserSubmit} className="bg-emerald-50/70 p-3.5 border-b border-emerald-200 space-y-2 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo tài khoản mới trực tiếp
              </span>
              {addMsg && <span className="text-xs font-bold text-emerald-700">{addMsg}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Tên đăng nhập *"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-white border border-emerald-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <input
                type="email"
                placeholder="Email (Tùy chọn)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-white border border-emerald-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <input
                type="password"
                required
                placeholder="Mật khẩu *"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white border border-emerald-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1 bg-white border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-2xs"
              >
                Tạo Tài Khoản
              </button>
            </div>
          </form>
        )}

        {/* User Table List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00529C]" />
              <span className="text-xs font-semibold">Đang tải danh sách thành viên...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Không tìm thấy tài khoản nào khớp với yêu cầu.</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = user.uid === currentUser.uid;
              const isApproved = user.status === 'approved';
              const isPending = user.status === 'pending';
              const isAdminRole = user.role === 'admin';

              return (
                <div
                  key={user.uid}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                        isAdminRole
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-[#00529C] border border-blue-200'
                      }`}
                    >
                      {user.username.slice(0, 2)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{user.username}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                            Bạn
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAdminRole
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isAdminRole ? 'Quản trị (Admin)' : 'Thành viên'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Status Badge & Approve Toggle */}
                    {isPending ? (
                      <button
                        onClick={() => handleStatusChange(user.uid, 'approved')}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer animate-bounce"
                        title="Duyệt cho phép người dùng truy cập ứng dụng"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Duyệt Cấp Quyền</span>
                      </button>
                    ) : isApproved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã Phê Duyệt</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        <span>Đã Từ Chối</span>
                      </span>
                    )}

                    {/* Change Status Dropdown */}
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.uid, e.target.value as UserStatus)}
                      className="text-xs bg-white border border-slate-200 font-semibold text-slate-700 rounded-xl px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00529C]"
                    >
                      <option value="approved">Đã Phê Duyệt</option>
                      <option value="pending">Chờ Phê Duyệt</option>
                      <option value="rejected">Từ Chối Truy Cập</option>
                    </select>

                    {/* Role Toggle */}
                    {!isSelf && (
                      <button
                        onClick={() => handleRoleToggle(user.uid, user.role)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
                        title="Đổi quyền Admin / Thành viên"
                      >
                        <Shield className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                    )}

                    {/* Delete button */}
                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.username)}
                        className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
