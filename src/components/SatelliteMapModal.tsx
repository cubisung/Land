import React from 'react';
import { X, ExternalLink, Globe, Layers, Copy, Check, MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { buildGoogleMapsUrlFromCoords, parseCoordinates } from '../utils/geoUtils';

interface SatelliteMapModalProps {
  isOpen: boolean;
  coords: string;
  title?: string;
  onClose: () => void;
}

export const SatelliteMapModal: React.FC<SatelliteMapModalProps> = ({
  isOpen,
  coords,
  title = 'Ảnh chụp Vệ tinh Google Maps',
  onClose,
}) => {
  const [mapType, setMapType] = React.useState<'hybrid' | 'satellite' | 'roadmap'>('hybrid');
  const [copied, setCopied] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 480 });
  const [zoom, setZoom] = React.useState(17);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const parsed = React.useMemo(() => parseCoordinates(coords), [coords]);
  const directUrl = buildGoogleMapsUrlFromCoords(coords);

  // Measure container size
  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 480,
        });
      }
    };
    updateSize();
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);

  React.useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [coords, isOpen]);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Compute visible Google tiles
  const tiles = React.useMemo(() => {
    if (!parsed) return [];
    const latNum = parseFloat(parsed.lat);
    const lngNum = parseFloat(parsed.lng);
    if (isNaN(latNum) || isNaN(lngNum)) return [];

    const n = Math.pow(2, zoom);
    const worldX = ((lngNum + 180) / 360) * n;
    const latRad = (latNum * Math.PI) / 180;
    const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const centerPixelX = worldX * 256 - offset.x;
    const centerPixelY = worldY * 256 - offset.y;

    const startPixelX = centerPixelX - dimensions.width / 2;
    const startPixelY = centerPixelY - dimensions.height / 2;

    const startTileX = Math.floor(startPixelX / 256);
    const endTileX = Math.floor((startPixelX + dimensions.width) / 256);
    const startTileY = Math.floor(startPixelY / 256);
    const endTileY = Math.floor((startPixelY + dimensions.height) / 256);

    const lyrsCode = mapType === 'satellite' ? 's' : mapType === 'roadmap' ? 'm' : 'y';
    const result = [];

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const left = Math.round(tx * 256 - startPixelX);
        const top = Math.round(ty * 256 - startPixelY);
        const sub = (Math.abs(tx + ty) % 3) + 1;
        const url = `https://mt${sub}.google.com/vt/lyrs=${lyrsCode}&x=${tx}&y=${ty}&z=${zoom}`;
        result.push({ key: `${tx}-${ty}-${zoom}`, left, top, url });
      }
    }
    return result;
  }, [parsed, zoom, offset, dimensions, mapType]);

  if (!isOpen || !coords) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none">
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  HD Vệ Tinh Google
                </span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{coords}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          {/* Map View Mode Switches */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Vệ Tinh (Có Nhãn)</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vệ Tinh Thuần</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                mapType === 'roadmap'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Bản Đồ Phố</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCoords}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Đã Chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chép Tọa Độ</span>
                </>
              )}
            </button>

            <a
              href={directUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 text-xs font-bold bg-[#00529C] hover:bg-[#003d75] text-white rounded-xl transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>Mở Trên Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Embedded Interactive Satellite Map View */}
        <div
          ref={containerRef}
          className="relative w-full flex-1 min-h-[380px] sm:min-h-[480px] bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Tiles */}
          {tiles.map((t) => (
            <img
              key={t.key}
              src={t.url}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute pointer-events-none select-none transition-opacity duration-150"
              style={{
                left: `${t.left}px`,
                top: `${t.top}px`,
                width: '256px',
                height: '256px',
              }}
            />
          ))}

          {/* Center Target Pin Marker */}
          <div
            className="absolute pointer-events-none z-20 flex flex-col items-center justify-center"
            style={{
              left: `${dimensions.width / 2 + offset.x}px`,
              top: `${dimensions.height / 2 + offset.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="relative flex flex-col items-center">
              <span className="bg-slate-900/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg border border-slate-700 whitespace-nowrap mb-0.5">
                {parsed ? `${parsed.lat}, ${parsed.lng}` : coords}
              </span>
              <div className="relative">
                <MapPin className="w-8 h-8 text-red-600 fill-red-500 filter drop-shadow-lg" />
                <div className="w-2 h-2 bg-white rounded-full absolute top-[8px] left-[12px]" />
              </div>
              <div className="w-4 h-2 bg-red-600/40 rounded-full animate-ping -mt-0.5" />
            </div>
          </div>

          {/* Floating Controls */}
          <div className="absolute right-3 bottom-3 z-30 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-xs p-1.5 rounded-xl border border-slate-700 shadow-xl">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(z + 1, 19));
              }}
              disabled={zoom >= 19}
              title="Phóng to (+)"
              className="p-2 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(z - 1, 13));
              }}
              disabled={zoom <= 13}
              title="Thu nhỏ (-)"
              className="p-2 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {(offset.x !== 0 || offset.y !== 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOffset({ x: 0, y: 0 });
                }}
                title="Về lại tâm điểm"
                className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-slate-900 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tọa độ nhận diện:</span>
            <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {parsed ? `Vĩ độ: ${parsed.lat} | Kinh độ: ${parsed.lng} (Zoom: ${zoom})` : coords}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Dữ liệu vệ tinh Google Maps HD | Giữ chuột để kéo bản đồ
          </p>
        </div>
      </div>
    </div>
  );
};
