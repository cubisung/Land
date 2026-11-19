import React from 'react';
import { QRType } from '../types';
import { MapPin, FileText } from 'lucide-react';

interface QRTypeTabsProps {
  activeType: QRType;
  onChangeType: (type: QRType) => void;
}

const TYPES: { type: QRType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'url',
    label: 'Link / Google Maps',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    type: 'text',
    label: 'Văn bản / Ghi chú',
    icon: <FileText className="w-4 h-4" />,
  },
];

export const QRTypeTabs: React.FC<QRTypeTabsProps> = ({ activeType, onChangeType }) => {
  return (
    <div className="bg-white p-1 rounded-xl border border-slate-200/90 shadow-2xs mb-4">
      <div className="grid grid-cols-2 gap-1.5">
        {TYPES.map((item) => {
          const isActive = activeType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => onChangeType(item.type)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#00529C] text-white border-[#003870] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
