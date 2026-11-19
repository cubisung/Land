import React from 'react';
import { QROptions, QRType, SavedQR } from '../types';
import { renderQRCodeToCanvas } from '../utils/qrGenerator';
import { Bookmark, X, Check, Sparkles, Tag } from 'lucide-react';

interface SaveQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  defaultTitle: string;
  rawContent: string;
  type: QRType;
  options: QROptions;
}

export const SaveQRModal: React.FC<SaveQRModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultTitle,
  rawContent,
  type,
  options,
}) => {
  const [title, setTitle] = React.useState(defaultTitle);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
    }
  }, [isOpen, defaultTitle]);

  React.useEffect(() => {
    if (isOpen && canvasRef.current && rawContent) {
      renderQRCodeToCanvas(canvasRef.current, rawContent, {
        ...options,
        size: 100,
        margin: 1,
      });
    }
  }, [isOpen, rawContent, options]);

  if (!isOpen) return null;

  // Generate quick suggested titles based on type
  const suggestions: string[] = [];
  if (type === 'vietqr') {
    suggestions.push('VietQR Chuyển Khoản Ngân Hàng', 'Thanh Toán Cửa Hàng', 'Mã QR Tài Khoản VietinBank');
  } else if (type === 'url') {
    suggestions.push('Link Đặt Hàng / Website', 'Bản Đồ Google Maps', 'Link Trang Cá Nhân / Fanpage');
  } else {
    suggestions.push('Mã QR Cá Nhân', 'Mã Lưu Trữ Nhanh');
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || defaultTitle || 'Mã QR Đã Lưu';
    onSave(finalTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header with VietinBank style */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#00529C] to-[#8C1B20] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white border border-white/20">
              <Bookmark className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lưu Mã QR Vào Bộ Nhớ</h2>
              <p className="text-xs text-blue-100">Đặt tên/nhãn gợi nhớ để dễ dàng truy vấn lại</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-50/50">
          {/* QR Preview Box */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs overflow-hidden">
            <div className="w-12 h-12 bg-white rounded-lg p-0.5 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00529C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mb-0.5">
                Loại: {type.toUpperCase()}
              </span>
              <p className="text-xs font-mono text-slate-600 truncate" title={rawContent}>
                {rawContent}
              </p>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Tên / Ghi chú gợi nhớ cho Mã QR <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Mã QR Chuyển Khoản Cửa Hàng..."
              autoFocus
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00529C] shadow-2xs"
            />
          </div>

          {/* Quick Suggestions Chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1.5">
              <Tag className="w-3 h-3 text-[#00529C]" />
              Gợi ý đặt tên nhanh:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTitle(s)}
                  className="text-[11px] bg-white hover:bg-blue-50 text-slate-700 hover:text-[#00529C] px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-200 transition cursor-pointer font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#00529C] hover:bg-[#003d75] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>Xác Nhận Lưu QR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
