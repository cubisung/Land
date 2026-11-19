import React from 'react';
import { QRType, WifiData, EmailData, SmsData, VCardData, VietQRData } from '../types';
import {
  Clipboard,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
  PhoneCall,
  MapPin,
  ExternalLink,
  Navigation,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Search,
  Compass,
  Edit2,
  Check,
} from 'lucide-react';
import {
  extractGoogleMapsCoordinates,
  buildGoogleMapsUrlFromCoords,
  resolveGoogleMapsLocation,
  ResolvedLocationData,
  parseCoordinates,
} from '../utils/geoUtils';

interface QRInputFormProps {
  type: QRType;
  vietqr?: VietQRData;
  setVietqr?: React.Dispatch<React.SetStateAction<VietQRData>>;
  url: string;
  setUrl: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  wifi?: WifiData;
  setWifi?: React.Dispatch<React.SetStateAction<WifiData>>;
  phone?: string;
  setPhone?: (v: string) => void;
  email?: EmailData;
  setEmail?: React.Dispatch<React.SetStateAction<EmailData>>;
  sms?: SmsData;
  setSms?: React.Dispatch<React.SetStateAction<SmsData>>;
  vcard?: VCardData;
  setVcard?: React.Dispatch<React.SetStateAction<VCardData>>;
  onGenerate: () => void;
  qrTitle?: string;
  setQrTitle?: (v: string) => void;
  coords?: string | null;
  setCoords?: (c: string | null) => void;
}

export const QRInputForm: React.FC<QRInputFormProps> = ({
  type,
  url,
  setUrl,
  text,
  setText,
  onGenerate,
  setQrTitle,
  coords,
  setCoords,
}) => {
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  // Address search & manual coordinates
  const [showAddressSearch, setShowAddressSearch] = React.useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = React.useState('');
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);

  const [showManualCoordsInput, setShowManualCoordsInput] = React.useState(false);
  const [manualLat, setManualLat] = React.useState('');
  const [manualLng, setManualLng] = React.useState('');

  const [resolvedLocation, setResolvedLocation] = React.useState<ResolvedLocationData | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = React.useState<boolean>(false);
  const [locationSuccessFeedback, setLocationSuccessFeedback] = React.useState<string | null>(null);
  const [lastResolvedInput, setLastResolvedInput] = React.useState<string>('');

  // Auto-resolve location coordinates + title
  const handleCalculateLocation = React.useCallback(
    async (rawInput: string, force = false) => {
      if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
        setResolvedLocation(null);
        return;
      }

      const inputStr = rawInput.trim();
      if (!force && inputStr === lastResolvedInput) return;

      const directCoords = extractGoogleMapsCoordinates(inputStr);
      if (directCoords && setCoords) {
        setCoords(directCoords);
      }

      setIsResolvingLocation(true);
      setLocationError(null);
      setLastResolvedInput(inputStr);

      try {
        const result = await resolveGoogleMapsLocation(inputStr);
        if (result && (result.coordinates || result.fullAddress || result.suggestedTitle)) {
          setResolvedLocation(result);
          if (result.coordinates && setCoords) {
            setCoords(result.coordinates);
          }
          if (result.suggestedTitle && setQrTitle) {
            setQrTitle(result.suggestedTitle);
          }

          if (result.coordinates && !inputStr.startsWith('http://') && !inputStr.startsWith('https://')) {
            const parsed = parseCoordinates(result.coordinates);
            if (parsed) {
              setUrl(`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`);
            }
          }

          const displayCoords = result.coordinates || directCoords;
          setLocationSuccessFeedback(
            displayCoords ? `Tọa độ: ${displayCoords.replace('@', '')}` : 'Đã định vị'
          );
          setTimeout(() => setLocationSuccessFeedback(null), 3000);
        } else if (force) {
          setLocationError('Chưa nhận diện được tọa độ.');
        }
      } catch (err) {
        console.warn('Auto resolve maps error:', err);
        if (force) {
          setLocationError('Lỗi kết nối tra cứu vị trí.');
        }
      } finally {
        setIsResolvingLocation(false);
      }
    },
    [lastResolvedInput, setQrTitle, setCoords, setUrl]
  );

  React.useEffect(() => {
    const activeInput = type === 'url' ? url : type === 'text' ? text : '';
    if (!activeInput || activeInput.trim().length < 4) return;

    const timer = setTimeout(() => {
      handleCalculateLocation(activeInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [type, url, text, handleCalculateLocation]);

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    const fallbackToIpLocation = async () => {
      try {
        const res = await fetch('/api/my-ip-location');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.lat && data.lng) {
            const mapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
            setUrl(mapsUrl);
            if (setCoords) setCoords(data.coordinates);
            if (setQrTitle && data.suggestedTitle) setQrTitle(data.suggestedTitle);
            setResolvedLocation(data);
            setIsLocating(false);
            setLocationError(null);
            setLocationSuccessFeedback(`Định vị: ${data.lat}, ${data.lng}`);
            setTimeout(() => setLocationSuccessFeedback(null), 3000);
            return;
          }
        }
      } catch (e) {
        console.warn('IP location error:', e);
      }
      setIsLocating(false);
      setLocationError('Không lấy được GPS tự động.');
      setShowAddressSearch(true);
    };

    if (!navigator.geolocation) {
      fallbackToIpLocation();
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      setUrl(mapsUrl);
      if (setCoords) {
        setCoords(`@${lat},${lng}`);
      }
      setIsLocating(false);
      setLocationError(null);
      setLocationSuccessFeedback(`GPS: ${lat}, ${lng}`);
      handleCalculateLocation(mapsUrl, true);
    };

    const onError = () => {
      fallbackToIpLocation();
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000,
    });
  };

  const detectedCoords = React.useMemo(() => {
    if (coords) return coords;
    if (resolvedLocation?.coordinates) return resolvedLocation.coordinates;
    if (type === 'url' && url) return extractGoogleMapsCoordinates(url);
    if (type === 'text' && text) return extractGoogleMapsCoordinates(text);
    return null;
  }, [coords, resolvedLocation, type, url, text]);

  React.useEffect(() => {
    if (detectedCoords) {
      const parsed = parseCoordinates(detectedCoords);
      if (parsed) {
        setManualLat(parsed.lat);
        setManualLng(parsed.lng);
      }
    }
  }, [detectedCoords]);

  const handleAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressSearchQuery.trim()) return;

    setIsSearchingAddress(true);
    setLocationError(null);
    try {
      const res = await resolveGoogleMapsLocation(addressSearchQuery.trim());
      if (res && res.coordinates) {
        const parsed = parseCoordinates(res.coordinates);
        const standardUrl = parsed
          ? `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`
          : buildGoogleMapsUrlFromCoords(res.coordinates);
        setUrl(standardUrl);
        if (setCoords) setCoords(res.coordinates);
        if (res.suggestedTitle && setQrTitle) setQrTitle(res.suggestedTitle);
        setResolvedLocation(res);
        setLocationSuccessFeedback(`Đã tìm: ${res.coordinates}`);
        setShowAddressSearch(false);
        setTimeout(() => setLocationSuccessFeedback(null), 3000);
      } else {
        setLocationError(`Không tìm thấy "${addressSearchQuery}"`);
      }
    } catch {
      setLocationError('Lỗi kết nối tra cứu');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleApplyManualCoords = () => {
    const lat = parseFloat(manualLat.replace(',', '.'));
    const lng = parseFloat(manualLng.replace(',', '.'));
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setLocationError('Tọa độ không hợp lệ');
      return;
    }
    const cleanCoords = `@${lat.toFixed(6)},${lng.toFixed(6)}`;
    const standardUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    setUrl(standardUrl);
    if (setCoords) setCoords(cleanCoords);
    setShowManualCoordsInput(false);
    handleCalculateLocation(standardUrl, true);
  };

  const handlePasteClipboard = async () => {
    try {
      const textFromClipboard = await navigator.clipboard.readText();
      if (textFromClipboard) {
        const cleaned = textFromClipboard.trim();
        const direct = extractGoogleMapsCoordinates(cleaned);
        const embeddedUrl = cleaned.match(/https?:\/\/[^\s"'<>]+/i);

        let finalUrl = cleaned;
        if (embeddedUrl) {
          finalUrl = embeddedUrl[0];
        } else if (direct && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
          const parsed = parseCoordinates(direct);
          if (parsed) {
            finalUrl = `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`;
          }
        }

        if (direct && setCoords) {
          setCoords(direct);
        }
        if (type === 'url') {
          setUrl(finalUrl);
          handleCalculateLocation(finalUrl, true);
        } else {
          setText(textFromClipboard);
          handleCalculateLocation(cleaned, true);
        }
      }
    } catch (err) {
      console.warn('Clipboard paste error:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
      {/* URL / Google Maps Input */}
      {type === 'url' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Link / Bản đồ</span>
            </label>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg transition font-bold shadow-2xs cursor-pointer disabled:opacity-50"
                title="Lấy vị trí GPS hiện tại"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>GPS</span>
              </button>

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition cursor-pointer font-medium"
                title="Dán từ bộ nhớ tạm"
              >
                <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                <span>Dán</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddressSearch(!showAddressSearch);
                  setShowManualCoordsInput(false);
                }}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer font-medium border ${
                  showAddressSearch
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                title="Tìm kiếm vị trí theo địa chỉ"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tìm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowManualCoordsInput(!showManualCoordsInput);
                  setShowAddressSearch(false);
                }}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer font-medium border ${
                  showManualCoordsInput
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                title="Nhập tọa độ"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Tọa độ</span>
              </button>
            </div>
          </div>

          {/* Quick Search Bar */}
          {showAddressSearch && (
            <form onSubmit={handleAddressSearch} className="bg-blue-50/90 border border-blue-200 rounded-xl p-2 space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  placeholder="Nhập địa chỉ, tên đường..."
                  className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearchingAddress || !addressSearchQuery.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50 transition shadow-2xs"
                >
                  {isSearchingAddress ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Tìm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressSearch(false)}
                  className="px-2 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Manual Coordinates Input */}
          {showManualCoordsInput && (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="Vĩ độ: 9.596250"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
                <input
                  type="text"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="Kinh độ: 105.970524"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowManualCoordsInput(false)}
                  className="px-2.5 py-1 text-slate-500 text-xs hover:text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyManualCoords}
                  disabled={!manualLat.trim() || !manualLng.trim()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng</span>
                </button>
              </div>
            </div>
          )}

          {locationError && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>⚠️ {locationError}</span>
              <button
                type="button"
                onClick={() => setLocationError(null)}
                className="text-amber-800 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                const val = e.target.value;
                setUrl(val);
                const direct = extractGoogleMapsCoordinates(val);
                if (direct && setCoords) {
                  setCoords(direct);
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  const cleaned = pasted.trim();
                  const direct = extractGoogleMapsCoordinates(cleaned);
                  const embeddedUrl = cleaned.match(/https?:\/\/[^\s"'<>]+/i);
                  let finalUrl = cleaned;
                  if (embeddedUrl) {
                    finalUrl = embeddedUrl[0];
                  } else if (direct && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
                    const parsed = parseCoordinates(direct);
                    if (parsed) {
                      finalUrl = `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`;
                    }
                  }
                  e.preventDefault();
                  setUrl(finalUrl);
                  if (direct && setCoords) {
                    setCoords(direct);
                  }
                  setTimeout(() => {
                    handleCalculateLocation(finalUrl, true);
                  }, 20);
                }
              }}
              placeholder="Dán link Google Maps hoặc tọa độ..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition pr-8"
              autoFocus
            />
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setResolvedLocation(null);
                  if (setCoords) setCoords(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick preset samples */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 pt-0.5">
            <button
              type="button"
              onClick={() => {
                const sample = 'https://maps.app.goo.gl/ZJoDMB4Cz3BP1zTw8';
                setUrl(sample);
                handleCalculateLocation(sample, true);
              }}
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition cursor-pointer font-medium"
            >
              📍 Mẫu: 24c Trần Hưng Đạo
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'https://www.google.com/maps?q=9.596250,105.970524';
                setUrl(sample);
                if (setCoords) setCoords('@9.596250,105.970524');
                handleCalculateLocation(sample, true);
              }}
              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition cursor-pointer font-medium"
            >
              🎯 9.596250, 105.970524
            </button>
          </div>

          {/* Success Feedback */}
          {locationSuccessFeedback && (
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate font-semibold">{locationSuccessFeedback}</span>
            </div>
          )}

          {/* Single clean coordinates pill - NO duplicate map here */}
          {detectedCoords && (
            <div className="flex items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs p-2 rounded-xl">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono font-bold text-emerald-800 text-[11px] shrink-0">
                  {detectedCoords.replace('@', '')}
                </span>
                {resolvedLocation?.fullAddress && (
                  <span className="text-slate-600 truncate border-l border-emerald-200 pl-1.5 text-[11px]">
                    {resolvedLocation.fullAddress}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualCoordsInput(true);
                    setShowAddressSearch(false);
                  }}
                  className="text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md transition flex items-center gap-0.5 cursor-pointer"
                  title="Chỉnh tọa độ"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCalculateLocation(url, true)}
                  disabled={isResolvingLocation}
                  className="text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 p-1 rounded-md transition cursor-pointer disabled:opacity-50"
                  title="Tính lại"
                >
                  <RefreshCw className={`w-3 h-3 ${isResolvingLocation ? 'animate-spin' : ''}`} />
                </button>
                <a
                  href={buildGoogleMapsUrlFromCoords(detectedCoords)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-300 p-1 rounded-md transition"
                  title="Mở Google Maps"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plain Text Input */}
      {type === 'text' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Văn bản / Ghi chú</label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{text.length} ký tự</span>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md transition font-medium cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>GPS</span>
              </button>
              <button
                onClick={handlePasteClipboard}
                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition cursor-pointer font-medium"
              >
                <Clipboard className="w-3 h-3" />
                <span>Dán</span>
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              const val = e.target.value;
              setText(val);
              const direct = extractGoogleMapsCoordinates(val);
              if (direct && setCoords) {
                setCoords(direct);
              }
            }}
            placeholder="Nhập nội dung văn bản, ghi chú hoặc địa chỉ..."
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition"
          />
        </div>
      )}

      {/* Main Generate Button */}
      <div className="pt-1">
        <button
          onClick={onGenerate}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition transform active:scale-[0.99] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Tạo Mã QR</span>
        </button>
      </div>
    </div>
  );
};
