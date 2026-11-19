import React from 'react';
import { Globe, Layers, MapPin, ExternalLink, Maximize2, Copy, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { buildGoogleMapsUrlFromCoords, parseCoordinates } from '../utils/geoUtils';
import { SatelliteMapModal } from './SatelliteMapModal';

interface InlineSatelliteMapProps {
  coords: string;
  title?: string;
  heightClass?: string;
}

export const InlineSatelliteMap: React.FC<InlineSatelliteMapProps> = ({
  coords,
  title = 'Ảnh chụp Vệ tinh Google Maps',
  heightClass = 'h-56 sm:h-64',
}) => {
  const [mapType, setMapType] = React.useState<'hybrid' | 'satellite' | 'roadmap'>('hybrid');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 600, height: 256 });
  const [zoom, setZoom] = React.useState(17);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const parsed = React.useMemo(() => parseCoordinates(coords), [coords]);
  const directUrl = buildGoogleMapsUrlFromCoords(coords);

  // Measure container size
  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 600,
          height: containerRef.current.clientHeight || 256,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset offset when coordinates change
  React.useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [coords]);

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

  // Touch handlers for mobile
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

  if (!coords) return null;

  return (
    <div className="w-full bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm transition-all select-none">
      {/* Header Bar */}
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-white flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-100 truncate">
            Ảnh Vệ Tinh Google Maps
          </span>
          <span className="text-[9px] font-mono font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded shrink-0">
            {coords}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyCoords}
            title="Sao chép tọa độ"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <a
            href={directUrl}
            target="_blank"
            rel="noreferrer"
            title="Mở trên Google Maps"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Phóng to toàn màn hình"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Mode Switches & Controls */}
      <div className="bg-slate-950 px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between gap-1 text-[10px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
              mapType === 'hybrid'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Vệ Tinh (Nhãn)
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
              mapType === 'satellite'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Vệ Tinh Thuần
          </button>
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
              mapType === 'roadmap'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Bản Đồ Phố
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Xem HD Mở Rộng</span>
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Embedded Map Frame with Interactive Google Satellite Tiles */}
      <div
        ref={containerRef}
        className={`relative w-full ${heightClass} bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render Visible Map Tiles */}
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
          className="absolute pointer-events-none z-20 flex flex-col items-center justify-center transition-transform"
          style={{
            left: `${dimensions.width / 2 + offset.x}px`,
            top: `${dimensions.height / 2 + offset.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Pill with coordinates */}
            <span className="bg-slate-900/90 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md border border-slate-700 whitespace-nowrap mb-0.5">
              {parsed ? `${parsed.lat}, ${parsed.lng}` : coords}
            </span>
            {/* Red Pin */}
            <div className="relative">
              <MapPin className="w-7 h-7 text-red-600 fill-red-500 filter drop-shadow-md" />
              <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-[7px] left-[11px]" />
            </div>
            {/* Ground Pulsing Target Shadow */}
            <div className="w-3 h-1.5 bg-red-600/40 rounded-full animate-ping -mt-0.5" />
          </div>
        </div>

        {/* Floating Controls: Zoom In / Zoom Out / Recenter */}
        <div className="absolute right-2 bottom-2 z-30 flex flex-col gap-1 bg-slate-900/85 backdrop-blur-xs p-1 rounded-lg border border-slate-700 shadow-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(z + 1, 19));
            }}
            disabled={zoom >= 19}
            title="Phóng to (+)"
            className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer disabled:opacity-40"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(z - 1, 13));
            }}
            disabled={zoom <= 13}
            title="Thu nhỏ (-)"
            className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer disabled:opacity-40"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {(offset.x !== 0 || offset.y !== 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOffset({ x: 0, y: 0 });
              }}
              title="Về lại tâm điểm"
              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Attribution */}
        <div className="absolute left-2 bottom-1.5 z-20 pointer-events-none text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded font-medium">
          Dữ liệu Vệ tinh Google Maps HD | Kéo chuột để di chuyển
        </div>
      </div>

      {/* Fullscreen Satellite Modal */}
      <SatelliteMapModal
        isOpen={isModalOpen}
        coords={coords}
        title={title}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
