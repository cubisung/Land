import React, { useState, useMemo } from 'react';
import { SavedQR, UserProfile } from '../types';
import {
  X,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Award,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  calculateValuationSummary,
  aggregateUserValuationStats,
  aggregatePriceSegments,
  aggregateTimeSeriesStats,
  parseMarketValueToNumber,
  formatVndCompact,
} from '../utils/valuationUtils';

interface ValuationDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedList: SavedQR[];
  currentUser: UserProfile | null;
  onRefreshCloud?: () => void;
  isSyncingCloud?: boolean;
  onOpenItem?: (item: SavedQR) => void;
}

export const ValuationDashboardModal: React.FC<ValuationDashboardModalProps> = ({
  isOpen,
  onClose,
  savedList,
  currentUser,
  onRefreshCloud,
  isSyncingCloud = false,
  onOpenItem,
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | '7days' | '30days' | 'year'>('all');
  const [searchAsset, setSearchAsset] = useState<string>('');

  // Extract all distinct users from the dataset
  const distinctUsers = useMemo(() => {
    const set = new Set<string>();
    savedList.forEach((item) => {
      if (item.creatorName && item.creatorName.trim()) {
        set.add(item.creatorName.trim());
      }
    });
    return Array.from(set).sort();
  }, [savedList]);

  // Apply time and user filters
  const filteredList = useMemo(() => {
    const now = Date.now();
    return savedList.filter((item) => {
      // 1. User Filter
      if (selectedUser !== 'all') {
        const itemCreator = item.creatorName?.trim() || '';
        if (itemCreator.toLowerCase() !== selectedUser.toLowerCase()) {
          return false;
        }
      }

      let itemTs = typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : Date.now();
      if (typeof item.createdAt === 'object' && item.createdAt !== null) {
        const o = item.createdAt as any;
        if (typeof o.toMillis === 'function') itemTs = o.toMillis();
        else if (typeof o.seconds === 'number') itemTs = o.seconds * 1000;
      }

      // 2. Time Filter
      if (timeRange === '7days') {
        if (now - itemTs > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (timeRange === '30days') {
        if (now - itemTs > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (timeRange === 'year') {
        const itemYear = new Date(itemTs).getFullYear();
        const currentYear = new Date().getFullYear();
        if (itemYear !== currentYear) return false;
      }

      // 3. Search query
      if (searchAsset.trim()) {
        const q = searchAsset.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchRaw = item.rawString?.toLowerCase().includes(q);
        const matchUser = (item.creatorName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchRaw && !matchUser) return false;
      }

      return true;
    });
  }, [savedList, selectedUser, timeRange, searchAsset]);

  // Compute analytics
  const summary = useMemo(() => calculateValuationSummary(filteredList), [filteredList]);
  const userStats = useMemo(() => aggregateUserValuationStats(filteredList), [filteredList]);
  const priceSegments = useMemo(() => aggregatePriceSegments(filteredList), [filteredList]);
  const timeSeriesData = useMemo(() => aggregateTimeSeriesStats(filteredList), [filteredList]);

  // Top 5 highest valued assets
  const topValuedAssets = useMemo(() => {
    return [...filteredList]
      .filter((item) => parseMarketValueToNumber(item.marketValue) > 0)
      .sort((a, b) => parseMarketValueToNumber(b.marketValue) - parseMarketValueToNumber(a.marketValue))
      .slice(0, 5);
  }, [filteredList]);

  // QR Type distribution
  const typeDistribution = useMemo(() => {
    const map: { [key: string]: number } = { vietqr: 0, url: 0, text: 0, phone: 0 };
    filteredList.forEach((item) => {
      map[item.type] = (map[item.type] || 0) + 1;
    });
    return [
      { name: 'VietQR Ngân hàng', count: map.vietqr, color: '#00529C' },
      { name: 'Vị trí / Link Maps', count: map.url, color: '#10B981' },
      { name: 'Văn bản / Số điện thoại', count: map.text + map.phone, color: '#F59E0B' },
    ].filter((item) => item.count > 0);
  }, [filteredList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00529C] to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Dashboard Báo Cáo & Thống Kê Định Giá
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Real-time Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phân tích số lượng giao dịch, tổng giá trị tài sản và hiệu suất theo từng chuyên viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshCloud && (
              <button
                onClick={onRefreshCloud}
                disabled={isSyncingCloud}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Đồng bộ lại dữ liệu từ Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncingCloud ? 'Đang đồng bộ...' : 'Đồng bộ Cloud'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* User Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Chuyên viên:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent text-white font-bold outline-hidden cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900 text-white">
                  Tất cả chuyên viên ({savedList.length} hồ sơ)
                </option>
                {distinctUsers.map((u) => {
                  const count = savedList.filter((i) => i.creatorName?.trim() === u).length;
                  return (
                    <option key={u} value={u} className="bg-slate-900 text-white">
                      👤 {u} ({count} hồ sơ)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Time Range Filter Pills */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 p-1 rounded-xl text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: '7days', label: '7 ngày' },
                { id: '30days', label: '30 ngày' },
                { id: 'year', label: 'Năm nay' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    timeRange === tab.id
                      ? 'bg-[#00529C] text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchAsset}
              onChange={(e) => setSearchAsset(e.target.value)}
              placeholder="Tìm kiếm tài sản, vị trí..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Tổng Số Lượng Giao Dịch */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg hover:border-slate-600 transition flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Số Lượng Giao Dịch
                </span>
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {filteredList.length} <span className="text-sm font-semibold text-slate-400">hồ sơ</span>
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {summary.totalCount} hồ sơ có định giá tiền
                </p>
              </div>
            </div>

            {/* KPI 2: Tổng Giá Trị Định Giá */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg hover:border-slate-600 transition flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Tổng Giá Trị Định Giá
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight truncate" title={summary.formattedTotalVnd}>
                  {formatVndCompact(summary.totalValueVnd)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate" title={summary.formattedTotalVnd}>
                  {summary.totalValueVnd > 0 ? `Toàn bộ ${summary.totalCount} tài sản` : 'Chưa có dữ liệu giá'}
                </p>
              </div>
            </div>

            {/* KPI 3: Giá Trị Trung Bình */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg hover:border-slate-600 transition flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Giá Trung Bình / Hồ Sơ
                </span>
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <PieIcon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-purple-300 tracking-tight truncate" title={summary.formattedAvgVnd}>
                  {formatVndCompact(summary.avgValueVnd)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Mức bình quân mỗi bất động sản
                </p>
              </div>
            </div>

            {/* KPI 4: Giá Trị Cao Nhất */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg hover:border-slate-600 transition flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Giá Trị Cao Nhất
                </span>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight truncate" title={summary.formattedMaxVnd}>
                  {formatVndCompact(summary.maxValueVnd)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate" title={summary.highestValuationItem?.title}>
                  {summary.highestValuationItem ? `🏆 ${summary.highestValuationItem.title}` : 'Chưa có hồ sơ'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1: Thống Kê Theo Chuyên Viên / User (2 Columns on Desktop) */}
            <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Thống Kê Số Lượng & Tổng Giá Trị Theo Chuyên Viên
                  </h3>
                  <p className="text-xs text-slate-400">
                    So sánh khối lượng hồ sơ và tổng giá trị định giá giữa các thành viên
                  </p>
                </div>
                <span className="text-[11px] font-bold text-blue-300 bg-blue-950/80 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                  {userStats.length} Chuyên viên
                </span>
              </div>

              <div className="h-72 w-full min-h-[280px]">
                {userStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280} minWidth={100} minHeight={200}>
                    <BarChart data={userStats} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="username"
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'Tổng giá trị (Tỷ VNĐ)') return [`${value} Tỷ VNĐ`, name];
                          return [`${value} hồ sơ`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar
                        dataKey="count"
                        name="Số lượng hồ sơ"
                        fill="#3B82F6"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      />
                      <Bar
                        dataKey="totalValueBillion"
                        name="Tổng giá trị (Tỷ VNĐ)"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Chưa có đủ dữ liệu chuyên viên để hiển thị biểu đồ
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Phân Khúc Giá Trị Tài Sản (Pie Chart) */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-emerald-400" />
                    Phân Khúc Giá Trị Tài Sản
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cơ cấu mức giá các bất động sản
                  </p>
                </div>
              </div>

              <div className="h-56 w-full min-h-[220px] flex items-center justify-center relative">
                {priceSegments.some((s) => s.count > 0) ? (
                  <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={priceSegments.filter((s) => s.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="name"
                      >
                        {priceSegments.filter((s) => s.count > 0).map((entry, index) => (
                          <Cell key={`cell-${entry.name || index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string, item: any) => [
                          `${value} tài sản (${item?.payload?.percentage || 0}%)`,
                          item?.payload?.name || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-10">Chưa có dữ liệu phân khúc giá</div>
                )}
              </div>

              {/* Price segment Legend */}
              <div className="mt-2 space-y-1.5">
                {priceSegments.map((seg) => (
                  <div key={seg.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="font-semibold">{seg.name}</span>
                    </span>
                    <span className="text-slate-400 font-bold">
                      {seg.count} ({seg.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Visual Charts & Leaderboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 3: Xu Hướng Định Giá Theo Thời Gian (Area Chart) */}
            <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    Diễn Biến & Xu Hướng Định Giá Theo Ngày
                  </h3>
                  <p className="text-xs text-slate-400">
                    Số lượng hồ sơ và tổng giá trị tích lũy theo thời gian
                  </p>
                </div>
              </div>

              <div className="h-64 w-full min-h-[250px]">
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} minWidth={100} minHeight={200}>
                    <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="cntGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="displayDate" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'Tổng giá trị (Tỷ VNĐ)') return [`${value} Tỷ VNĐ`, name];
                          return [`${value} hồ sơ`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Số lượng hồ sơ"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cntGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="valueBillion"
                        name="Tổng giá trị (Tỷ VNĐ)"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#valGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Chưa có đủ mốc thời gian để vẽ đồ thị
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 Highest Valuation Assets */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Top Bất Động Sản Giá Trị Cao Nhất
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Các tài sản có mức giá định giá cao nhất trên hệ thống
              </p>

              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {topValuedAssets.length > 0 ? (
                  topValuedAssets.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenItem && onOpenItem(item)}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-blue-500/60 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <span>👤 {item.creatorName || 'Chuyên viên'}</span>
                            {item.coordinates && <span>• 📍 Vị trí GPS</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-400 block">
                          {formatVndCompact(parseMarketValueToNumber(item.marketValue))}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">
                    Chưa có tài sản nào được nhập giá trị
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Performance Table */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00529C]" />
                  Bảng Chi Tiết Định Giá Theo Từng Chuyên Viên / User
                </h3>
                <p className="text-xs text-slate-400">
                  Thống kê toàn bộ số lượng hồ sơ và tổng giá trị định giá đóng góp của từng tài khoản
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-bold">Chuyên Viên / User</th>
                    <th className="pb-3 font-bold text-center">Tổng Hồ Sơ</th>
                    <th className="pb-3 font-bold text-center">Hồ Sơ Có Giá</th>
                    <th className="pb-3 font-bold text-right">Tổng Giá Trị Định Giá</th>
                    <th className="pb-3 font-bold text-right">Giá Trung Bình</th>
                    <th className="pb-3 font-bold text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {userStats.map((stat, i) => (
                    <tr key={stat.username} className="hover:bg-slate-750 transition">
                      <td className="py-3 font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span>{stat.username}</span>
                        {stat.username === currentUser?.username && (
                          <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-500/30">
                            Bạn
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-300 font-bold">{stat.count}</td>
                      <td className="py-3 text-center text-emerald-400 font-bold">{stat.valuationCount}</td>
                      <td className="py-3 text-right font-black text-emerald-300">{stat.formattedTotal}</td>
                      <td className="py-3 text-right font-bold text-purple-300">{stat.formattedAvg}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => setSelectedUser(stat.username)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-[#00529C] text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          Lọc theo user này
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-white">{filteredList.length}</strong> hồ sơ định giá phù hợp điều kiện lọc.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer border border-slate-700"
            >
              Đóng Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
