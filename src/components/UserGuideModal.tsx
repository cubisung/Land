import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  QrCode,
  Link,
  CreditCard,
  Wifi,
  Phone,
  Mail,
  FileText,
  Contact,
  Palette,
  Maximize2,
  Download,
  Share2,
  Copy,
  Bookmark,
  Cloud,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Search,
  FileCode2,
  Lightbulb,
  Zap,
  Lock,
  FolderDown,
  Printer,
  Paperclip,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadOfflineHtml: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onDownloadOfflineHtml,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'customize' | 'export' | 'cloud'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const guideSteps = [
    {
      id: 'step-1',
      category: 'create',
      stepNumber: 1,
      title: 'Chọn Loại Mã QR Code',
      icon: QrCode,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Hỗ trợ đa dạng cấu hình mã QR đáp ứng mọi nhu cầu cá nhân & doanh nghiệp.',
      items: [
        { icon: Link, title: 'Đường dẫn Link Website (URL)', desc: 'Tạo mã QR truy cập trang web, link Google Maps, mạng xã hội.' },
        { icon: CreditCard, title: 'Thanh toán VietQR Ngân hàng', desc: 'Chuyển khoản chính xác VietinBank và các ngân hàng NAPAS.' },
        { icon: Wifi, title: 'Kết nối Wi-Fi tự động', desc: 'Quét để truy cập Wi-Fi không cần gõ mật khẩu thủ công.' },
        { icon: Phone, title: 'Số điện thoại & Gọi trực tiếp', desc: 'Tạo mã QR bấm gọi nhanh đến số điện thoại hotline.' },
        { icon: Mail, title: 'Gửi Email nhanh', desc: 'Mã hóa địa chỉ email, tiêu đề và nội dung soạn sẵn.' },
        { icon: FileText, title: 'Văn bản tùy chỉnh (Text)', desc: 'Mã hóa đoạn tin nhắn, ghi chú hoặc mã sản phẩm.' },
        { icon: Contact, title: 'Danh thiếp vCard điện tử', desc: 'Lưu thông tin liên hệ trực tiếp vào bạ điện thoại.' },
      ],
    },
    {
      id: 'step-2',
      category: 'create',
      stepNumber: 2,
      title: 'Nhập Nội Dung & Thông Tin',
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Nhập chi tiết dữ liệu, hệ thống tự động xem trước mã QR tức thì (Real-time).',
      items: [
        { icon: Zap, title: 'Cập nhật tự động', desc: 'Hình ảnh QR Code thay đổi ngay khi bạn gõ từng ký tự.' },
        { icon: ShieldCheck, title: 'Chuẩn EMVCo VietQR', desc: 'Tự động tính toán mã CRC16 bảo mật khi tạo mã chuyển khoản.' },
        { icon: Lightbulb, title: 'Mẫu nhập nhanh', desc: 'Gợi ý tiêu đề thông minh khi lưu hoặc gửi email.' },
      ],
    },
    {
      id: 'step-3',
      category: 'customize',
      stepNumber: 3,
      title: 'Tùy Chỉnh Giao Diện Mã QR',
      icon: Palette,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Cá nhân hóa màu sắc và chất lượng hình ảnh theo thương hiệu.',
      items: [
        { icon: Palette, title: 'Màu sắc thương hiệu', desc: 'Chọn màu xanh chuẩn VietinBank, màu đỏ hoặc bảng màu tùy chọn.' },
        { icon: Maximize2, title: 'Kích thước sắc nét HD', desc: 'Xuất file từ 256px đến 4096px (4K) đáp ứng nhu cầu in ấn khổ lớn.' },
        { icon: Sparkles, title: 'Nền trong suốt (Transparent)', desc: 'Tùy chọn nền trong suốt để ghép vào thiết kế poster, banner.' },
      ],
    },
    {
      id: 'step-4',
      category: 'export',
      stepNumber: 4,
      title: 'Tải Về, Chia Sẻ & Tải File HTML Offline',
      icon: Download,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      description: 'Xuất kết quả bằng nhiều hình thức linh hoạt và tiện lợi.',
      items: [
        { icon: Download, title: 'Tải Ảnh (PNG)', desc: 'Lưu tệp ảnh PNG chất lượng cao về điện thoại hoặc máy tính.' },
        { icon: FileCode2, title: 'File SVG Vector', desc: 'Tải định dạng Vector không bị vỡ nét khi in ấn chuyên nghiệp.' },
        { icon: Copy, title: 'Sao chép vào Bộ nhớ tạm', desc: 'Chép ảnh QR để dán nhanh (Ctrl+V) vào Zalo, Messenger, Word.' },
        { icon: Mail, title: 'Gửi Email', desc: 'Gửi mã QR kèm thông tin chi tiết trực tiếp qua hộp thư Email.' },
        { icon: Share2, title: 'Chia sẻ Ảnh', desc: 'Chia sẻ nhanh qua các ứng dụng di động đang cài trên thiết bị.' },
        { icon: Download, title: 'Nút Tải HTML (Chỉ biểu tượng)', desc: 'Tải 1 file HTML duy nhất chứa toàn bộ ứng dụng chạy 100% Offline không cần mạng.' },
        { icon: FolderDown, title: 'Tải Toàn Bộ Mã Nguồn (.ZIP)', desc: 'Tải trọn bộ code nguồn React, TypeScript, Express, Firebase và hướng dẫn chạy local.' },
      ],
    },
    {
      id: 'step-5',
      category: 'cloud',
      stepNumber: 5,
      title: 'Lưu Lịch Sử & Đồng Bộ Cloud',
      icon: Cloud,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      description: 'Quản lý lịch sử mã QR an toàn trên đám mây Firestore.',
      items: [
        { icon: Bookmark, title: 'Nút Lưu QR', desc: 'Lưu lại các mã QR thường dùng để tái sử dụng bất cứ lúc nào.' },
        { icon: Lock, title: 'Tài khoản & Phân quyền', desc: 'Đăng nhập để xem lịch sử riêng cá nhân hoặc quản lý thành viên.' },
        { icon: Cloud, title: 'Đồng bộ đa thiết bị', desc: 'Mã QR đã lưu sẽ tự động xuất hiện trên mọi máy tính và điện thoại.' },
      ],
    },
    {
      id: 'step-6',
      category: 'export',
      stepNumber: 6,
      title: 'Đính Kèm Ảnh & File PDF / Tài Liệu (Tối Đa 35MB)',
      icon: FileText,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Hỗ trợ đính kèm hình ảnh tài sản thực tế và tệp hồ sơ pháp lý vào báo cáo định giá.',
      items: [
        { icon: Sparkles, title: 'Ảnh chụp tài sản dung lượng lớn tới 35MB', desc: 'Hỗ trợ ảnh chụp gốc sắc nét từ Samsung (108MP, 200MP), iPhone ProRAW, máy ảnh chuyên dụng. Tự động nén chuẩn A4 nhẹ mượt.' },
        { icon: FileText, title: 'Đính kèm File PDF thông thường tới 35MB', desc: 'Tải và lưu trữ trích lục quy hoạch, chứng thư định giá, hồ sơ pháp lý định dạng PDF tiêu chuẩn lên tới 35MB/tệp.' },
        { icon: Paperclip, title: 'Đính kèm tài liệu Word, Excel, hợp đồng scan', desc: 'Chấp nhận tệp Word (.doc, .docx), bảng tính Excel (.xls, .xlsx, .csv), văn bản scan công chứng.' },
        { icon: Printer, title: 'Tích hợp đầy đủ trong Báo cáo in & Lịch sử', desc: 'Liệt kê danh mục hồ sơ trong báo cáo in PDF và cho phép mở xem/tải về trực tiếp từ danh sách lịch sử lưu trữ.' },
      ],
    },
  ];

  const filteredSteps = guideSteps.filter((step) => {
    const matchesTab = activeTab === 'all' || step.category === activeTab;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesTab;

    const matchesTitle = step.title.toLowerCase().includes(query);
    const matchesDesc = step.description.toLowerCase().includes(query);
    const matchesItems = step.items.some(
      (item) => item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)
    );

    return matchesTab && (matchesTitle || matchesDesc || matchesItems);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00529C] via-[#8C1B20] to-[#E31B23] p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-amber-300 shrink-0">
              <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
                Hướng Dẫn Sử Dụng Trực Quan
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Các bước tạo, tùy chỉnh và lưu mã QR Code nhanh chóng với biểu tượng trực quan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/20"
            title="Đóng cửa sổ hướng dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search & Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm hướng dẫn..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00529C] text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick HTML Offline Banner Action */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-900 w-full sm:w-auto justify-between sm:justify-start">
              <span className="font-semibold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Chạy 100% Offline:</span>
              </span>
              <button
                onClick={onDownloadOfflineHtml}
                className="p-1.5 bg-[#00529C] hover:bg-[#003d75] text-white rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1 border border-blue-900 cursor-pointer"
                title="Bấm nút biểu tượng Tải HTML để tải ứng dụng chạy Offline"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden xs:inline">Tải Offline</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#00529C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Tất Cả ({guideSteps.length} Bước)
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-[#00529C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Tạo Mã QR</span>
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'customize'
                  ? 'bg-[#00529C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tùy Chỉnh Giao Diện</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-[#00529C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Tải Về &amp; Chia Sẻ</span>
            </button>
            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cloud'
                  ? 'bg-[#00529C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Đồng Bộ Cloud</span>
            </button>
          </div>
        </div>

        {/* Source Code Download Highlight Banner */}
        <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span>Tải Toàn Bộ Tệp Mã Nguồn Dự Án (.ZIP)</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                  Full Code
                </span>
              </h4>
              <p className="text-[11px] text-emerald-700 font-medium">
                Bao gồm toàn bộ mã nguồn React, TypeScript, Express, cấu hình Firebase và file README hướng dẫn chạy máy tính cá nhân.
              </p>
            </div>
          </div>
          <a
            href="/api/download-source-zip"
            download="he-thong-dinh-gia-qr-code.zip"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải File ZIP (~190 KB)</span>
          </a>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {filteredSteps.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                Không tìm thấy nội dung hướng dẫn phù hợp với "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="text-xs text-[#00529C] font-bold underline hover:opacity-80"
              >
                Xóa bộ lọc để xem lại toàn bộ hướng dẫn
              </button>
            </div>
          ) : (
            filteredSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border ${step.borderColor} p-4 sm:p-5 transition hover:shadow-xs space-y-4 bg-white`}
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${step.color} text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0`}
                      >
                        {step.stepNumber}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                          <span>{step.title}</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{step.description}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl ${step.bgColor} ${step.textColor} shrink-0`}>
                      <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>

                  {/* Icon Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {step.items.map((item, idx) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition space-y-1.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#00529C] shadow-2xs shrink-0">
                              <ItemIcon className="w-4 h-4 text-[#00529C]" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 leading-tight">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed pl-1">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Icon Legend Summary Box */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 space-y-3 shadow-md">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
                Chú Thích Biểu Tượng Nhanh Trên Nút Chức Năng
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <Download className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="font-semibold text-slate-200">Nút Tải HTML / PNG</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <Mail className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-semibold text-slate-200">Gửi Email Mã QR</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <Share2 className="w-4 h-4 text-amber-200 shrink-0" />
                <span className="font-semibold text-slate-200">Chia Sẻ Ảnh Trực Tiếp</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <FileCode2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-200">Xuất Tệp Vector SVG</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <Copy className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Sao Chép Bộ Nhớ Tạm</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">Lưu Mã QR Vào Cloud</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <HelpCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="font-semibold text-slate-200">Hướng Dẫn Biểu Tượng</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Xác Thực Chuẩn EMVCo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            💡 Bạn có thể bấm vào biểu tượng <strong><HelpCircle className="w-3.5 h-3.5 inline text-[#00529C]" /> Hướng Dẫn</strong> trên thanh công cụ bất kỳ lúc nào.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#00529C] hover:bg-[#003d75] text-white font-bold text-xs transition cursor-pointer shadow-xs border border-blue-900"
          >
            Đã Hiểu &amp; Đóng Hướng Dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
