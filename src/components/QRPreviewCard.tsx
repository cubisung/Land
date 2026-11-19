import React from 'react';
import { QROptions, QRType, UserProfile, AttachedDocument } from '../types';
import {
  renderQRCodeToCanvas,
  generateQRSVG,
  downloadCanvas,
  downloadSVG,
  copyCanvasToClipboard,
} from '../utils/qrGenerator';
import {
  Download,
  Copy,
  Bookmark,
  Check,
  FileCode2,
  Sparkles,
  QrCode,
  Mail,
  Share2,
  X,
  Tag,
  DollarSign,
  Camera,
  Upload,
  MapPin,
  ExternalLink,
  Paperclip,
  Trash2,
  Printer,
} from 'lucide-react';
import { SendEmailModal } from './SendEmailModal';
import { compressImage, validateImageFile, MAX_IMAGE_FILE_SIZE_MB } from '../utils/imageUtils';
import { formatFileSize, getDocumentTypeInfo, uploadDocumentToServer, validateDocumentFile, MAX_DOCUMENT_SIZE_MB } from '../utils/documentUtils';
import { extractGoogleMapsCoordinates, buildGoogleMapsUrlFromCoords, extractLocationTitleFromInput } from '../utils/geoUtils';
import { InlineSatelliteMap } from './InlineSatelliteMap';

interface QRPreviewCardProps {
  rawContent: string;
  type: QRType;
  options: QROptions;
  onChangeOptions?: (opts: QROptions) => void;
  onSaveToHistory: (customTitle?: string) => void;
  onOpenPrintModal?: () => void;
  isSaved?: boolean;
  currentUser?: UserProfile | null;
  qrTitle?: string;
  setQrTitle?: (v: string) => void;
  marketValue?: string;
  setMarketValue?: (v: string) => void;
  attachedImages?: string[];
  setAttachedImages?: React.Dispatch<React.SetStateAction<string[]>>;
  attachedDocuments?: AttachedDocument[];
  setAttachedDocuments?: React.Dispatch<React.SetStateAction<AttachedDocument[]>>;
  coords?: string | null;
  setCoords?: (c: string | null) => void;
}

export const QRPreviewCard: React.FC<QRPreviewCardProps> = ({
  rawContent,
  type,
  options,
  onSaveToHistory,
  onOpenPrintModal,
  isSaved = false,
  currentUser,
  qrTitle = '',
  setQrTitle,
  marketValue = '',
  setMarketValue,
  attachedImages = [],
  setAttachedImages,
  attachedDocuments = [],
  setAttachedDocuments,
  coords,
  setCoords,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);
  const [qrName, setQrName] = React.useState(qrTitle);
  const [isRendering, setIsRendering] = React.useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [selectedLightboxImg, setSelectedLightboxImg] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = React.useState(false);
  const [docUploadError, setDocUploadError] = React.useState<string | null>(null);

  const detectedCoords = React.useMemo(() => {
    return coords || extractGoogleMapsCoordinates(rawContent);
  }, [coords, rawContent]);

  const [lastAutoExtractedUrl, setLastAutoExtractedUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (rawContent && rawContent.length > 5) {
      const directCoords = extractGoogleMapsCoordinates(rawContent);
      if (directCoords && setCoords) {
        setCoords(directCoords);
      }

      extractLocationTitleFromInput(rawContent).then((res) => {
        if (res?.coordinates && setCoords) {
          setCoords(res.coordinates);
        }
        if (res?.suggestedTitle && rawContent !== lastAutoExtractedUrl) {
          handleTitleChange(res.suggestedTitle);
          setLastAutoExtractedUrl(rawContent);
        }
      });
    }
  }, [rawContent, lastAutoExtractedUrl, setCoords]);

  React.useEffect(() => {
    setQrName(qrTitle);
  }, [qrTitle]);

  const handleTitleChange = (val: string) => {
    setQrName(val);
    if (setQrTitle) {
      setQrTitle(val);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const remainingSlots = 5 - attachedImages.length;
    if (remainingSlots <= 0) {
      setUploadError('Tối đa 5 ảnh.');
      return;
    }

    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || `Ảnh vượt quá ${MAX_IMAGE_FILE_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
    }

    setIsUploading(true);
    try {
      const compressedList = await Promise.all(
        filesToProcess.map((file) => compressImage(file, 1000, 1000, 0.76))
      );
      if (setAttachedImages) {
        setAttachedImages((prev) => [...prev, ...compressedList].slice(0, 5));
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi xử lý ảnh.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (setAttachedImages) {
      setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDocUploadError(null);

    const remainingSlots = 5 - (attachedDocuments?.length || 0);
    if (remainingSlots <= 0) {
      setDocUploadError('Tối đa 5 tệp.');
      return;
    }

    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        setDocUploadError(validation.error || `Tệp vượt quá ${MAX_DOCUMENT_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
    }

    setIsUploadingDoc(true);
    try {
      const uploadedList = await Promise.all(
        filesToProcess.map((file) => uploadDocumentToServer(file))
      );
      if (setAttachedDocuments) {
        setAttachedDocuments((prev) => [...prev, ...uploadedList].slice(0, 5));
      }
    } catch (err: any) {
      setDocUploadError(err?.message || 'Lỗi tải tệp.');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (idToRemove: string) => {
    if (setAttachedDocuments) {
      setAttachedDocuments((prev) => prev.filter((d) => d.id !== idToRemove));
    }
  };

  // Re-render canvas whenever content or options change
  React.useEffect(() => {
    let isCancelled = false;

    async function generate() {
      if (!canvasRef.current) return;
      setIsRendering(true);
      try {
        await renderQRCodeToCanvas(canvasRef.current, rawContent, options);
        if (!isCancelled && canvasRef.current) {
          setQrDataUrl(canvasRef.current.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Render error:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    if (rawContent && rawContent.trim() !== '') {
      generate();
    } else if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setQrDataUrl('');
    }

    return () => {
      isCancelled = true;
    };
  }, [rawContent, options]);

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const filename = qrName.trim()
      ? `QR_${qrName.trim().replace(/[^a-zA-Z0-9]/g, '_')}`
      : 'qr_code';
    downloadCanvas(canvasRef.current, `${filename}.png`);
  };

  const handleDownloadSVG = async () => {
    const filename = qrName.trim()
      ? `QR_${qrName.trim().replace(/[^a-zA-Z0-9]/g, '_')}`
      : 'qr_code';
    const svgString = await generateQRSVG(rawContent, options);
    downloadSVG(svgString, `${filename}.svg`);
  };

  const handleCopyClipboard = async () => {
    if (!canvasRef.current) return;
    const success = await copyCanvasToClipboard(canvasRef.current);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: qrName || 'Mã QR Code',
            text: rawContent,
          });
        } else {
          handleCopyClipboard();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const isEmpty = !rawContent || rawContent.trim() === '';

  return (
    <div
      id="qr-preview-section"
      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col space-y-4 lg:sticky lg:top-20 transition-all w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#00529C] flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-[#00529C]" />
          <span>Xem Trước QR Code</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">{options.size}px</span>
      </div>

      {/* QR Code Canvas */}
      <div className="relative group flex items-center justify-center p-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 aspect-square w-full max-w-[220px] sm:max-w-[260px] mx-auto overflow-hidden shrink-0">
        {isEmpty ? (
          <div className="text-center space-y-1.5 p-3">
            <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400">Nhập thông tin để tạo QR</p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full aspect-square object-contain rounded-xl shadow-2xs"
              style={{
                backgroundColor: options.transparentBg ? 'transparent' : '#ffffff',
              }}
            />
            {isRendering && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                <span className="text-xs text-[#00529C] font-semibold animate-pulse flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Tạo mã...
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details & Metadata Inputs */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs text-xs">
        {/* GPS Coordinates & Satellite Map Preview (Clean, unified in one spot) */}
        {detectedCoords && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-emerald-900 font-semibold">
              <span className="flex items-center gap-1 truncate font-mono text-[11px]">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                {detectedCoords}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(detectedCoords);
                  }}
                  className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
                  title="Sao chép tọa độ"
                >
                  Chép
                </button>
                <a
                  href={buildGoogleMapsUrlFromCoords(detectedCoords)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5"
                  title="Mở Google Maps"
                >
                  <span>Bản đồ</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            {/* Satellite Map */}
            <InlineSatelliteMap
              coords={detectedCoords}
              title={qrName ? `Vệ tinh: ${qrName}` : 'Vệ tinh Google Maps'}
              heightClass="h-40 sm:h-48"
            />
          </div>
        )}

        {/* Tên tài sản */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
            <Tag className="w-3 h-3 text-[#00529C]" />
            <span>Tên tài sản</span>
          </label>
          <input
            type="text"
            value={qrName}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isEmpty}
            placeholder="VD: Đất đường Trần Hưng Đạo..."
            className="w-full bg-white text-slate-800 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00529C] disabled:opacity-40 shadow-2xs placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Giá trị định giá */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-emerald-700">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>Giá định giá</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-1 rounded">VNĐ</span>
          </label>
          <input
            type="text"
            value={marketValue}
            onChange={(e) => {
              const rawVal = e.target.value;
              const cleanDigits = rawVal.replace(/\D/g, '');
              if (cleanDigits) {
                setMarketValue?.(parseInt(cleanDigits, 10).toLocaleString('vi-VN'));
              } else {
                setMarketValue?.(rawVal);
              }
            }}
            disabled={isEmpty}
            placeholder="VD: 1.500.000.000"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 shadow-2xs"
          />
        </div>

        {/* Ảnh đính kèm (Clean, minimal, zero repetition) */}
        <div className="pt-1.5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Camera className="w-3 h-3 text-amber-600" />
              <span>Ảnh tài sản ({attachedImages.length}/5)</span>
            </label>
            <span className="text-[10px] font-semibold text-slate-500">Tối đa 35MB</span>
          </div>

          {uploadError && (
            <div className="p-1.5 bg-red-50 text-red-700 rounded text-[11px] mb-1 flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button type="button" onClick={() => setUploadError(null)} className="font-bold">✕</button>
            </div>
          )}

          {attachedImages.length < 5 && (
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="preview-attached-images-upload"
                disabled={isEmpty || isUploading}
              />
              <label
                htmlFor="preview-attached-images-upload"
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-dashed border-amber-300 hover:border-amber-500 rounded-lg cursor-pointer transition text-slate-700 text-[11px] font-semibold shadow-2xs ${
                  isEmpty ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-3 h-3 text-amber-600" />
                <span>{isUploading ? 'Đang nén...' : '+ Thêm ảnh'}</span>
              </label>
            </div>
          )}

          {/* Thumbnails */}
          {attachedImages.length > 0 && (
            <div className="grid grid-cols-5 gap-1 mt-1.5">
              {attachedImages.map((imgSrc, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={imgSrc}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedLightboxImg(imgSrc)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full cursor-pointer"
                    title="Xóa"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tài liệu / PDF đính kèm (Clean, minimal, zero repetition) */}
        <div className="pt-1.5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Paperclip className="w-3 h-3 text-red-600" />
              <span>Hồ sơ / PDF ({attachedDocuments.length}/5)</span>
            </label>
            <span className="text-[10px] font-semibold text-slate-500">Tối đa 35MB</span>
          </div>

          {docUploadError && (
            <div className="p-1.5 bg-red-50 text-red-700 rounded text-[11px] mb-1 flex items-center justify-between">
              <span>⚠️ {docUploadError}</span>
              <button type="button" onClick={() => setDocUploadError(null)} className="font-bold">✕</button>
            </div>
          )}

          {attachedDocuments.length < 5 && (
            <div>
              <input
                type="file"
                accept=".pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
                id="preview-attached-docs-upload"
                disabled={isEmpty || isUploadingDoc}
              />
              <label
                htmlFor="preview-attached-docs-upload"
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-dashed border-red-300 hover:border-red-500 rounded-lg cursor-pointer transition text-slate-700 text-[11px] font-semibold shadow-2xs ${
                  isEmpty ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <Paperclip className="w-3 h-3 text-red-600" />
                <span>{isUploadingDoc ? 'Đang tải...' : '+ Thêm tệp PDF, Word, Excel'}</span>
              </label>
            </div>
          )}

          {/* Doc list */}
          {attachedDocuments.length > 0 && (
            <div className="space-y-1 mt-1.5">
              {attachedDocuments.map((doc) => {
                const info = getDocumentTypeInfo(doc.name, doc.type);
                return (
                  <div key={doc.id} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded-md text-[11px] gap-1.5">
                    <span className={`text-[8px] font-bold px-1 rounded uppercase ${info.badgeBg}`}>
                      {info.ext}
                    </span>
                    <span className="font-medium text-slate-800 truncate flex-1" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="text-[9px] text-slate-400 shrink-0">
                      ({formatFileSize(doc.size)})
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 p-0.5 hover:text-blue-800">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button type="button" onClick={() => handleRemoveDocument(doc.id)} className="text-red-500 p-0.5 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: Clear, uncluttered, icon-driven */}
      <div className="w-full space-y-2 pt-1">
        {/* Main 3 Actions */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleDownloadImage}
            disabled={isEmpty}
            className="py-2.5 px-2 rounded-xl bg-[#00529C] hover:bg-[#003d75] text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 shadow-xs"
            title="Tải ảnh PNG"
          >
            <Download className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Tải Ảnh</span>
          </button>

          {onOpenPrintModal ? (
            <button
              onClick={onOpenPrintModal}
              disabled={isEmpty}
              className="py-2.5 px-2 rounded-xl bg-[#8C1B20] hover:bg-[#721317] text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 shadow-xs"
              title="Xuất báo cáo định giá PDF"
            >
              <Printer className="w-4 h-4 text-amber-200 shrink-0" />
              <span>Báo Cáo PDF</span>
            </button>
          ) : (
            <button
              onClick={handleShareImage}
              disabled={isEmpty}
              className="py-2.5 px-2 rounded-xl bg-[#8C1B20] hover:bg-[#721317] text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 shadow-xs"
              title="Chia sẻ ảnh"
            >
              <Share2 className="w-4 h-4 text-amber-200 shrink-0" />
              <span>Chia Sẻ</span>
            </button>
          )}

          <button
            onClick={() => onSaveToHistory(qrName)}
            disabled={isEmpty}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 shadow-xs ${
              isSaved
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
            title={isSaved ? 'Cập nhật' : 'Lưu QR'}
          >
            <Bookmark className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
            <span>{isSaved ? 'Đã Lưu' : 'Lưu QR'}</span>
          </button>
        </div>

        {/* Secondary Actions: Compact Icon Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            disabled={isEmpty}
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
            title="Gửi Email"
          >
            <Mail className="w-3.5 h-3.5 text-red-600" />
            <span>Email</span>
          </button>

          <button
            onClick={handleShareImage}
            disabled={isEmpty}
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
            title="Chia sẻ ảnh"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Chia sẻ</span>
          </button>

          <button
            onClick={handleCopyClipboard}
            disabled={isEmpty}
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
            title="Sao chép ảnh"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Chép</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadSVG}
            disabled={isEmpty}
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
            title="Tải SVG vector"
          >
            <FileCode2 className="w-3.5 h-3.5 text-purple-600" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        qrDataUrl={qrDataUrl}
        qrTitle={qrName.trim() || 'Mã QR'}
        rawContent={rawContent}
        currentUser={currentUser}
        marketValue={marketValue}
        attachedImages={attachedImages}
        attachedDocuments={attachedDocuments}
        coordinates={detectedCoords}
      />

      {/* Lightbox Modal */}
      {selectedLightboxImg && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white p-2 rounded-2xl max-w-xl max-h-[85vh] overflow-hidden flex flex-col items-center shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedLightboxImg(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={selectedLightboxImg}
              alt="Phóng to"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
