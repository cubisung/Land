import React from 'react';
import { SavedQR, UserProfile } from '../types';
import { renderQRCodeToCanvas, downloadCanvas } from '../utils/qrGenerator';
import {
  X,
  Trash2,
  Download,
  Search,
  History,
  Calendar,
  Edit2,
  Check,
  Mail,
  Copy,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Globe,
  Lock,
  User,
  ShieldCheck,
  Shield,
  MapPin,
  ExternalLink,
  Layers,
  Printer,
  RefreshCw,
  Cloud,
  FileText,
  Paperclip,
} from 'lucide-react';
import { SendEmailModal } from './SendEmailModal';
import { extractGoogleMapsCoordinates, buildGoogleMapsUrlFromCoords } from '../utils/geoUtils';
import { calculateValuationSummary } from '../utils/valuationUtils';
import { formatFileSize, getDocumentTypeInfo } from '../utils/documentUtils';
import { SatelliteMapModal } from './SatelliteMapModal';
import { InlineSatelliteMap } from './InlineSatelliteMap';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedList: SavedQR[];
  currentUser?: UserProfile | null;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onSelectSaved: (item: SavedQR) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onTogglePublic?: (id: string, isPublic: boolean) => void;
  onImportList?: (newList: SavedQR[]) => void;
  onOpenPrintModal?: (item: SavedQR) => void;
  onRefreshCloud?: () => void;
  isSyncingCloud?: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  savedList,
  currentUser,
  onDelete,
  onClearAll,
  onSelectSaved,
  onUpdateTitle,
  onTogglePublic,
  onImportList,
  onOpenPrintModal,
  onRefreshCloud,
  isSyncingCloud = false,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterAction, setFilterAction] = React.useState<'all' | 'save' | 'export_pdf'>('all');
  const [selectedUserFilter, setSelectedUserFilter] = React.useState<string>('all');
  const [emailItem, setEmailItem] = React.useState<SavedQR | null>(null);
  const [emailQrDataUrl, setEmailQrDataUrl] = React.useState<string>('');
  const [selectedLightboxImg, setSelectedLightboxImg] = React.useState<string | null>(null);
  const [selectedSatelliteData, setSelectedSatelliteData] = React.useState<{ coords: string; title: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Extract unique creators for Admin filter
  const uniqueCreators = React.useMemo(() => {
    const creators = new Set<string>();
    savedList.forEach((item) => {
      if (item.creatorName) {
        creators.add(item.creatorName);
      } else if (item.createdByUid) {
        creators.add(item.createdByUid);
      }
    });
    return Array.from(creators);
  }, [savedList]);

  // Sort by createdAt descending (newest first)
  const sortedList = React.useMemo(() => {
    return [...savedList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [savedList]);

  // Filter list by tab, action type, admin user filter & search query
  const filtered = React.useMemo(() => {
    return sortedList.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rawString.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reportCode && item.reportCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.creatorName && item.creatorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'all' || item.type === filterType;

      const matchesAction =
        filterAction === 'all' ||
        (filterAction === 'export_pdf' && (item.actionType === 'export_pdf' || !!item.lastExportedAt || !!item.reportCode)) ||
        (filterAction === 'save' && item.actionType !== 'export_pdf');

      const matchesUser =
        selectedUserFilter === 'all' ||
        item.creatorName === selectedUserFilter ||
        item.createdByUid === selectedUserFilter;

      return matchesSearch && matchesType && matchesAction && matchesUser;
    });
  }, [sortedList, searchTerm, filterType, filterAction, selectedUserFilter]);

  // Group filtered items by date (DD/MM/YYYY)
  const groupedByDate = React.useMemo(() => {
    const groups: { [key: string]: SavedQR[] } = {};
    filtered.forEach((item) => {
      const d = new Date(item.createdAt || Date.now());
      const dateKey = d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return Object.entries(groups).map(([dateStr, items]) => ({
      dateStr,
      items,
    }));
  }, [filtered]);

  if (!isOpen) return null;

  // Export saved list to JSON backup file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `danh_sach_ma_qr_saved_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import saved list from JSON backup file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportList) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            onImportList(imported);
            alert(`Đã khôi phục thành công ${imported.length} mã QR từ tệp lưu trữ!`);
          } else {
            alert('Tệp dữ liệu không đúng định dạng!');
          }
        } catch (err) {
          console.error(err);
          alert('Không thể đọc tệp dữ liệu!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#00529C] via-[#003d75] to-[#8C1B20] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white border border-white/20">
              <History className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Mục Đã Lưu trên Cloud Database</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Máy chủ Cloud
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Đã đồng bộ thời gian thực với cơ sở dữ liệu Cloud
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Permission Badge Banner */}
        {currentUser && (
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00529C]" />
              {currentUser.role === 'admin' || currentUser.username === 'admin'
                ? 'Quyền Quản trị viên (Admin): Toàn quyền xem & quản lý tất cả bản ghi lưu QR & xuất PDF của toàn hệ thống'
                : 'Quyền Chuyên viên: Xem lịch sử các bản mã QR đã lưu và báo cáo PDF do bạn tạo'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                Tài khoản: <strong className="text-[#00529C]">{currentUser.username}</strong> ({currentUser.role === 'admin' ? 'Admin' : 'Chuyên viên'})
              </span>
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          {/* Row 1: Action Filter (All, Saved QR, Exported PDF) & Cloud Sync */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Phân loại:</span>
              {[
                { id: 'all', label: 'Tất cả hồ sơ', count: savedList.length },
                {
                  id: 'save',
                  label: '💾 Mã QR đã lưu',
                  count: savedList.filter((x) => x.actionType !== 'export_pdf').length,
                },
                {
                  id: 'export_pdf',
                  label: '📄 Báo cáo PDF đã xuất',
                  count: savedList.filter((x) => x.actionType === 'export_pdf' || !!x.lastExportedAt || !!x.reportCode).length,
                },
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => setFilterAction(act.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filterAction === act.id
                      ? 'bg-[#00529C] text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{act.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      filterAction === act.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {act.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Export / Import & Cloud Sync Controls */}
            <div className="flex items-center gap-2">
              {onRefreshCloud && (
                <button
                  onClick={onRefreshCloud}
                  disabled={isSyncingCloud}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Tải lại và đồng bộ ngay dữ liệu mới nhất từ Cloud Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'Đang đồng bộ...' : 'Đồng bộ Cloud'}</span>
                </button>
              )}

              <button
                onClick={handleExportJSON}
                disabled={savedList.length === 0}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                title="Xuất bản sao lưu danh sách mã QR ra tệp JSON"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#00529C]" />
                <span className="hidden sm:inline">Sao lưu tệp</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportJSON}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                title="Khôi phục danh sách mã QR từ tệp sao lưu JSON"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Nhập tệp</span>
              </button>
            </div>
          </div>

          {/* Row 2: Category Tabs & Admin User Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Loại mã:</span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'vietqr', label: 'VietQR' },
                { id: 'url', label: 'Đường Link' },
                { id: 'text', label: 'Văn bản' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Admin User Filter Dropdown */}
            {currentUser?.role === 'admin' && uniqueCreators.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#00529C]" />
                  <span>Lọc người tạo:</span>
                </span>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#00529C] focus:outline-none shadow-2xs"
                >
                  <option value="all">👥 Tất cả người dùng ({savedList.length} bản ghi)</option>
                  {uniqueCreators.map((creator) => {
                    const count = savedList.filter(
                      (item) => item.creatorName === creator || item.createdByUid === creator
                    ).length;
                    return (
                      <option key={creator} value={creator}>
                        👤 {creator} ({count} bản ghi)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm tên mã QR, tài khoản, link website..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
            />
          </div>

          {savedList.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử mã QR đã lưu?')) {
                  onClearAll();
                }
              }}
              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* Saved List Cards Container Grouped By Date */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {groupedByDate.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-white rounded-2xl border border-slate-200 p-6">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                {searchTerm
                  ? 'Không tìm thấy mã QR nào phù hợp với từ khóa'
                  : 'Chưa có mã QR nào được lưu trong danh sách'}
              </p>
              <p className="text-xs text-slate-400">
                Hãy tạo mã QR mới và bấm nút &quot;Lưu QR&quot; để lưu lại vào đây!
              </p>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.dateStr} className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-200/60 rounded-lg text-xs font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-[#00529C]" />
                  <span>Ngày {group.dateStr}</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-slate-500 font-semibold border border-slate-200 ml-auto">
                    {group.items.length} mã QR
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      currentUser={currentUser}
                      onDelete={() => onDelete(item.id)}
                      onSelect={() => {
                        onSelectSaved(item);
                        onClose();
                      }}
                      onUpdateTitle={(newTitle) => onUpdateTitle(item.id, newTitle)}
                      onTogglePublic={(isPublic) => onTogglePublic && onTogglePublic(item.id, isPublic)}
                      onOpenEmailModal={(qrDataUrl) => {
                        setEmailItem(item);
                        setEmailQrDataUrl(qrDataUrl);
                      }}
                      onOpenPrintModal={() => onOpenPrintModal?.(item)}
                      onViewImage={(imgUrl) => setSelectedLightboxImg(imgUrl)}
                      onViewSatelliteMap={(coords, title) => setSelectedSatelliteData({ coords, title })}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Embedded Send Email Modal from Saved Item */}
      {emailItem && (
        <SendEmailModal
          isOpen={!!emailItem}
          onClose={() => setEmailItem(null)}
          qrDataUrl={emailQrDataUrl}
          qrTitle={emailItem.title}
          rawContent={emailItem.rawString}
          currentUser={currentUser}
          marketValue={emailItem.marketValue}
          attachedImages={emailItem.attachedImages}
          attachedDocuments={emailItem.attachedDocuments}
          coordinates={emailItem.coordinates || extractGoogleMapsCoordinates(emailItem.rawString)}
        />
      )}

      {/* Lightbox Modal for Enlarged Photo Preview from History */}
      {selectedLightboxImg && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white p-3 rounded-2xl max-w-xl max-h-[85vh] overflow-hidden flex flex-col items-center shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedLightboxImg(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedLightboxImg}
              alt="Hình đính kèm xem lại"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Satellite Map Modal */}
      {selectedSatelliteData && (
        <SatelliteMapModal
          isOpen={!!selectedSatelliteData}
          coords={selectedSatelliteData.coords}
          title={`Ảnh Vệ Tinh - ${selectedSatelliteData.title}`}
          onClose={() => setSelectedSatelliteData(null)}
        />
      )}
    </div>
  );
};

interface HistoryItemCardProps {
  item: SavedQR;
  currentUser?: UserProfile | null;
  onDelete: () => void;
  onSelect: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onTogglePublic?: (isPublic: boolean) => void;
  onOpenEmailModal: (qrDataUrl: string) => void;
  onOpenPrintModal?: () => void;
  onViewImage?: (imgUrl: string) => void;
  onViewSatelliteMap?: (coords: string, title: string) => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  item,
  currentUser,
  onDelete,
  onSelect,
  onUpdateTitle,
  onTogglePublic,
  onOpenEmailModal,
  onOpenPrintModal,
  onViewImage,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(item.title);
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, item.rawString, {
        ...item.options,
        size: 100,
        margin: 1,
      });
    }
  }, [item]);

  const handleDownload = () => {
    if (canvasRef.current) {
      downloadCanvas(canvasRef.current, `qr-${item.title.replace(/\s+/g, '_')}.png`);
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(item.rawString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Không thể sao chép');
    }
  };

  const formattedTime = new Date(item.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const canModify =
    currentUser?.role === 'admin' || (!!item.createdByUid && item.createdByUid === currentUser?.uid);

  const itemCoords = item.coordinates || extractGoogleMapsCoordinates(item.rawString);

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 transition group shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Group */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* QR Thumbnail */}
          <button
            onClick={onSelect}
            className="w-12 h-12 bg-white rounded-lg p-0.5 shrink-0 flex items-center justify-center border border-slate-200 shadow-2xs hover:border-[#00529C] transition cursor-pointer overflow-hidden relative group/thumb"
            title="Bấm để tải lại mã QR này"
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-[#00529C]/10 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
              <RotateCcw className="w-4 h-4 text-[#00529C]" />
            </div>
          </button>

          {/* Core Info */}
          <div className="min-w-0 flex-1">
            {/* Title & Badges */}
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  autoFocus
                  className="bg-blue-50 border border-blue-300 text-xs font-bold text-slate-900 rounded px-2 py-0.5 focus:outline-none w-full"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 rounded bg-[#00529C] text-white hover:bg-[#003d75]"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <button
                  onClick={onSelect}
                  className="text-xs sm:text-sm font-bold text-slate-900 hover:text-[#00529C] truncate text-left cursor-pointer max-w-[240px] sm:max-w-xs"
                  title={item.title}
                >
                  {item.title}
                </button>
                {canModify && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-[#00529C] transition cursor-pointer"
                    title="Đổi tên"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}

                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-[#00529C] border border-blue-200">
                  {item.type}
                </span>

                {/* Action Type Badge (Export PDF vs Save QR) */}
                {item.actionType === 'export_pdf' || !!item.lastExportedAt || !!item.reportCode ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 shadow-2xs">
                    <span>📄 Báo cáo PDF</span>
                    {item.reportCode && <span className="font-mono text-[8px] bg-red-100 px-1 rounded">{item.reportCode}</span>}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                    <span>💾 Mã QR</span>
                  </span>
                )}

                {/* Public / Private Badge */}
                {currentUser?.role === 'admin' ? (
                  <button
                    onClick={() => onTogglePublic?.(!item.isPublic)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                      item.isPublic
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Bấm để bật/tắt chia sẻ cho toàn bộ thành viên"
                  >
                    {item.isPublic ? <Globe className="w-2.5 h-2.5 text-emerald-600" /> : <Lock className="w-2.5 h-2.5 text-slate-500" />}
                    <span>{item.isPublic ? 'Chia sẻ' : 'Riêng tư'}</span>
                  </button>
                ) : item.isPublic ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                    <Globe className="w-2.5 h-2.5 text-emerald-600" />
                    Chia sẻ
                  </span>
                ) : null}
              </div>
            )}

            {/* Quick Metrics (Valuation Price, GPS, Photos, Creator) in a neat row */}
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              {item.marketValue && (
                <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                  Giá: {/đ|đồng|vnd/i.test(item.marketValue) ? item.marketValue : `${item.marketValue} đồng`}
                </span>
              )}

              {itemCoords && (
                <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-sky-600" />
                  <span>{itemCoords}</span>
                </span>
              )}

              {item.attachedImages && item.attachedImages.length > 0 && (
                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  📷 {item.attachedImages.length} ảnh
                </span>
              )}

              {item.attachedDocuments && item.attachedDocuments.length > 0 && (
                <span className="font-bold text-red-800 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5 text-red-600" />
                  <span>{item.attachedDocuments.length} tệp hồ sơ</span>
                </span>
              )}

              <span className="text-slate-600 font-semibold flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.2 rounded">
                <User className="w-2.5 h-2.5 text-slate-500" />
                <span>{item.creatorName || 'Khách'}</span>
              </span>

              <span className="text-slate-400">
                {formattedTime}
              </span>
            </div>

            {/* Single-line Preview & Toggle Details */}
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs sm:max-w-md">
                {item.rawString}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 cursor-pointer"
              >
                {isExpanded ? 'Thu gọn ▲' : 'Chi tiết / Vệ tinh ▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap">
          {onOpenPrintModal && (
            <button
              onClick={onOpenPrintModal}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-emerald-300 shadow-2xs"
              title="Xuất Báo Cáo Định Giá PDF"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Xuất PDF</span>
            </button>
          )}

          <button
            onClick={onSelect}
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#00529C] text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-blue-200 shadow-2xs"
            title="Tải lại mã QR để chỉnh sửa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#00529C]" />
            <span>Tải lại</span>
          </button>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <button
              onClick={() => {
                if (canvasRef.current) {
                  onOpenEmailModal(canvasRef.current.toDataURL('image/png'));
                }
              }}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition cursor-pointer"
              title="Gửi Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyText}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
              title="Sao chép nội dung"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
              title="Tải ảnh QR"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {canModify && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition cursor-pointer"
                title="Xóa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
          {/* Full Link / Data Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-800 break-all select-all">
            <span className="font-bold text-slate-500 block text-[10px] uppercase font-sans mb-0.5">
              Nội dung đầy đủ:
            </span>
            {item.rawString}
          </div>

          {/* Attached Images Gallery if any */}
          {item.attachedImages && item.attachedImages.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                Hình ảnh đính kèm ({item.attachedImages.length}):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {item.attachedImages.map((img, imgIdx) => (
                  <img
                    key={imgIdx}
                    src={img}
                    alt={`Ảnh đính kèm ${imgIdx + 1}`}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer hover:border-blue-500 hover:shadow-xs transition shrink-0"
                    title="Bấm để phóng to"
                    onClick={() => onViewImage?.(img)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Attached Documents & PDFs List if any */}
          {item.attachedDocuments && item.attachedDocuments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3 text-red-600" />
                <span>Hồ sơ tài liệu & File PDF đính kèm ({item.attachedDocuments.length} tệp):</span>
              </span>
              <div className="space-y-1.5">
                {item.attachedDocuments.map((doc, dIdx) => {
                  const info = getDocumentTypeInfo(doc.name, doc.type);
                  return (
                    <div
                      key={doc.id || dIdx}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${info.badgeBg}`}>
                          {info.ext}
                        </span>
                        <span className="font-semibold text-slate-800 truncate" title={doc.name}>
                          {dIdx + 1}. {doc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({formatFileSize(doc.size)})
                        </span>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:border-red-400 text-slate-700 hover:text-red-700 rounded-lg text-[11px] font-bold shrink-0 transition shadow-2xs"
                          title="Mở hoặc tải về tệp tin này"
                        >
                          <ExternalLink className="w-3 h-3 text-red-600" />
                          <span>Mở / Tải</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline Satellite Map if GPS available */}
          {itemCoords && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Vị trí Vệ tinh Google Maps:</span>
                </span>
                <a
                  href={buildGoogleMapsUrlFromCoords(itemCoords)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <span>Mở Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <InlineSatelliteMap
                coords={itemCoords}
                title={`Ảnh Vệ Tinh - ${item.title}`}
                heightClass="h-44 sm:h-52"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
