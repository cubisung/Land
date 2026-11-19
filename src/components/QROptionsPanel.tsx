import React from 'react';
import { QROptions } from '../types';
import { Palette, Check } from 'lucide-react';

interface QROptionsPanelProps {
  options: QROptions;
  onChangeOptions: (opts: QROptions) => void;
}

const PRESET_DARK_COLORS = [
  { label: 'VietinBank', color: '#00529C' },
  { label: 'Đen', color: '#000000' },
  { label: 'Navy', color: '#0f172a' },
  { label: 'Indigo', color: '#4338ca' },
  { label: 'Lục bảo', color: '#047857' },
  { label: 'Đỏ', color: '#E31B23' },
  { label: 'Tím', color: '#6b21a8' },
];

export const QROptionsPanel: React.FC<QROptionsPanelProps> = ({ options, onChangeOptions }) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-[#00529C]" />
          <span>Màu sắc & Kích thước QR</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Color picker */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Màu mã QR</span>
            <input
              type="color"
              value={options.darkColor}
              onChange={(e) => onChangeOptions({ ...options, darkColor: e.target.value })}
              className="w-6 h-6 rounded-md bg-transparent border-0 cursor-pointer"
              title="Chọn màu tự do"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {PRESET_DARK_COLORS.map((item) => (
              <button
                key={item.color}
                type="button"
                onClick={() => onChangeOptions({ ...options, darkColor: item.color })}
                className="w-5 h-5 rounded-md border border-slate-300 transition relative flex items-center justify-center cursor-pointer shadow-2xs"
                style={{ backgroundColor: item.color }}
                title={item.label}
              >
                {options.darkColor.toLowerCase() === item.color.toLowerCase() && (
                  <Check className="w-3 h-3 text-white drop-shadow-xs" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution selector */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Độ phân giải
          </label>
          <select
            value={options.size}
            onChange={(e) => onChangeOptions({ ...options, size: parseInt(e.target.value, 10) })}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            <option value={256}>256px (Web)</option>
            <option value={512}>512px (Chuẩn)</option>
            <option value={1024}>1024px (HD)</option>
            <option value={2048}>2048px (In ấn)</option>
            <option value={4096}>4096px (4K)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
