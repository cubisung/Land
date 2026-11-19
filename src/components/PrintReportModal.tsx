import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Printer,
  X,
  MapPin,
  Globe,
  Calendar,
  User,
  Tag,
  DollarSign,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  Download,
  Loader2,
  ExternalLink,
  Share2,
  Info,
  CheckCircle2,
  Eye,
  Smartphone,
  Upload,
  Trash2,
  Plus,
  Paperclip,
} from 'lucide-react';
import { QROptions, QRType, UserProfile, AttachedDocument } from '../types';
import { renderQRCodeToCanvas } from '../utils/qrGenerator';
import {
  getGoogleMapsEmbedUrl,
  buildGoogleMapsUrlFromCoords,
  formatCoordinatesDisplay,
  generateSatelliteSnapshotUrl,
  resolveGoogleMapsLocation,
  extractGoogleMapsCoordinates,
} from '../utils/geoUtils';
import { recordExportPdfAction } from '../services/qrCloudService';
import { compressImage, validateImageFile, MAX_IMAGE_FILE_SIZE_MB } from '../utils/imageUtils';
import { formatFileSize, getDocumentTypeInfo, uploadDocumentToServer, validateDocumentFile, MAX_DOCUMENT_SIZE_MB } from '../utils/documentUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrTitle: string;
  marketValue: string;
  attachedImages: string[];
  setAttachedImages?: React.Dispatch<React.SetStateAction<string[]>>;
  attachedDocuments?: AttachedDocument[];
  setAttachedDocuments?: React.Dispatch<React.SetStateAction<AttachedDocument[]>>;
  rawContent: string;
  coords: string | null;
  options: QROptions;
  type: QRType;
  currentUser: UserProfile | null;
  onRecordExportSuccess?: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  qrTitle,
  marketValue,
  attachedImages,
  setAttachedImages,
  attachedDocuments = [],
  setAttachedDocuments,
  rawContent,
  coords: initialCoords,
  options,
  type,
  currentUser,
  onRecordExportSuccess,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [satelliteSnapshotUrl, setSatelliteSnapshotUrl] = useState<string>('');
  const [isLoadingSatellite, setIsLoadingSatellite] = useState(false);
  const [effectiveCoords, setEffectiveCoords] = useState<string | null>(initialCoords);
  const [isResolvingCoords, setIsResolvingCoords] = useState(false);
  const [exportLoggedToast, setExportLoggedToast] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !setAttachedImages) return;
    setImageUploadError(null);

    const remainingSlots = 5 - attachedImages.length;
    if (remainingSlots <= 0) {
      setImageUploadError('Bạn chỉ được đính kèm tối đa 5 tấm ảnh cho báo cáo.');
      return;
    }

    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    // Validate size limit (up to 35MB per image)
    for (const file of filesToProcess) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageUploadError(validation.error || `Ảnh vượt quá mức tối đa ${MAX_IMAGE_FILE_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
    }

    setIsUploadingImages(true);

    try {
      const compressedList = await Promise.all(
        filesToProcess.map((file) => compressImage(file, 1000, 1000, 0.76))
      );
      setAttachedImages((prev) => [...prev, ...compressedList].slice(0, 5));
    } catch (err: any) {
      console.error('Error uploading image in modal:', err);
      setImageUploadError(err?.message || 'Không thể xử lý hình ảnh. Vui lòng thử lại!');
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleModalRemoveImage = (indexToRemove: number) => {
    if (setAttachedImages) {
      setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const handleModalDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !setAttachedDocuments) return;
    setDocUploadError(null);

    const remainingSlots = 5 - attachedDocuments.length;
    if (remainingSlots <= 0) {
      setDocUploadError('Bạn chỉ được đính kèm tối đa 5 tệp tài liệu / PDF.');
      return;
    }

    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        setDocUploadError(validation.error || `Tệp vượt quá giới hạn ${MAX_DOCUMENT_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }
    }

    setIsUploadingDocs(true);

    try {
      const uploadedList = await Promise.all(
        filesToProcess.map((file) => uploadDocumentToServer(file))
      );
      setAttachedDocuments((prev) => [...prev, ...uploadedList].slice(0, 5));
    } catch (err: any) {
      console.error('Error uploading document in modal:', err);
      setDocUploadError(err?.message || 'Không thể xử lý tệp tài liệu. Vui lòng thử lại!');
    } finally {
      setIsUploadingDocs(false);
      e.target.value = '';
    }
  };

  const handleModalRemoveDocument = (idToRemove: string) => {
    if (setAttachedDocuments) {
      setAttachedDocuments((prev) => prev.filter((d) => d.id !== idToRemove));
    }
  };

  // Ready download info for Samsung / Mobile devices where auto-download might be blocked
  const [readyDownload, setReadyDownload] = useState<{
    blobUrl: string;
    fileName: string;
    type: 'pdf' | 'image';
  } | null>(null);

  // Synchronize and auto-resolve coordinates if not initially provided
  useEffect(() => {
    if (!isOpen) return;

    if (initialCoords) {
      setEffectiveCoords(initialCoords);
      return;
    }

    // Try extracting from rawContent directly first
    const directCoords = extractGoogleMapsCoordinates(rawContent);
    if (directCoords) {
      setEffectiveCoords(directCoords);
      return;
    }

    // If rawContent looks like a URL/link or address, try resolving via backend/client resolution
    if (rawContent && rawContent.trim().length > 3) {
      setIsResolvingCoords(true);
      resolveGoogleMapsLocation(rawContent)
        .then((resolved) => {
          if (resolved && resolved.coordinates) {
            setEffectiveCoords(resolved.coordinates);
          } else {
            setEffectiveCoords(null);
          }
        })
        .catch((e) => {
          console.warn('Could not auto-resolve coordinates in PrintReportModal:', e);
          setEffectiveCoords(null);
        })
        .finally(() => {
          setIsResolvingCoords(false);
        });
    } else {
      setEffectiveCoords(null);
    }
  }, [isOpen, initialCoords, rawContent]);

  // Generate QR Code on canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && rawContent) {
      renderQRCodeToCanvas(canvasRef.current, rawContent, {
        ...options,
        size: 512,
        margin: 2,
      }).catch(console.error);
    }
  }, [isOpen, rawContent, options]);

  // Generate Satellite Snapshot when effectiveCoords is available
  useEffect(() => {
    if (isOpen && effectiveCoords) {
      setIsLoadingSatellite(true);
      generateSatelliteSnapshotUrl(effectiveCoords, 900, 500)
        .then((url) => {
          setSatelliteSnapshotUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate satellite snapshot:', err);
        })
        .finally(() => {
          setIsLoadingSatellite(false);
        });
    } else {
      setSatelliteSnapshotUrl('');
      setIsLoadingSatellite(false);
    }
  }, [isOpen, effectiveCoords]);

  const displayPrice = useMemo(() => {
    if (!marketValue || !marketValue.trim()) return 'Chưa cập nhật giá';
    const trimmed = marketValue.trim();
    if (/đ|đồng|vnd/i.test(trimmed)) {
      return trimmed;
    }
    return `${trimmed} đồng`;
  }, [marketValue]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const reportCode = useMemo(() => {
    return `HDG-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  const displayTitle = qrTitle?.trim() || 'Tài sản định giá';
  const formattedCoords = formatCoordinatesDisplay(effectiveCoords);
  const embedMapUrl = effectiveCoords ? getGoogleMapsEmbedUrl(effectiveCoords, 'hybrid') : null;
  const directMapUrl = effectiveCoords
    ? buildGoogleMapsUrlFromCoords(effectiveCoords)
    : (rawContent && rawContent.startsWith('http') ? rawContent : null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  /**
   * Builds the PDF document using an in-document off-screen container.
   * This avoids iframe rasterization blocking and canvas memory allocation crashes on Samsung & Android devices.
   */
  const buildPdfDocument = async () => {
    // 0. Auto-resolve coordinates before building PDF if not yet set
    let resolvedCoords = effectiveCoords;
    if (!resolvedCoords && rawContent) {
      const direct = extractGoogleMapsCoordinates(rawContent);
      if (direct) {
        resolvedCoords = direct;
      } else if (rawContent.startsWith('http://') || rawContent.startsWith('https://') || rawContent.includes('maps')) {
        try {
          const res = await resolveGoogleMapsLocation(rawContent);
          if (res?.coordinates) {
            resolvedCoords = res.coordinates;
            setEffectiveCoords(resolvedCoords);
          }
        } catch (e) {
          console.warn('Auto resolve in buildPdfDocument warning:', e);
        }
      }
    }

    const currentFormattedCoords = formatCoordinatesDisplay(resolvedCoords);

    // 1. High-resolution QR code base64 image (512px - 768px for optimal balance of speed and clarity on mobile)
    let qrDataUrl = '';
    try {
      const offCanvas = document.createElement('canvas');
      await renderQRCodeToCanvas(offCanvas, rawContent || 'https://google.com', {
        ...options,
        size: 768,
        margin: 2,
      });
      qrDataUrl = offCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('QR render error:', e);
      if (canvasRef.current && canvasRef.current.width > 0) {
        qrDataUrl = canvasRef.current.toDataURL('image/png');
      }
    }

    // 2. Ensure satellite snapshot is ready if coordinates exist
    let satImg = satelliteSnapshotUrl;
    if (resolvedCoords && !satImg) {
      try {
        satImg = await generateSatelliteSnapshotUrl(resolvedCoords, 900, 480);
        setSatelliteSnapshotUrl(satImg);
      } catch (e) {
        console.warn('Satellite snapshot generation warning:', e);
      }
    }

    // 3. Divide attached images into pages (up to 2 images per page to prevent image slicing)
    const imagesPerPage = 2;
    const imagePages: string[][] = [];
    if (attachedImages && attachedImages.length > 0) {
      for (let i = 0; i < attachedImages.length; i += imagesPerPage) {
        imagePages.push(attachedImages.slice(i, i + imagesPerPage));
      }
    }
    const hasExtraImagePages = imagePages.length > 0;

    // Common Footer HTML component
    const renderSignFooter = (showFullNote: boolean) => `
      <div class="footer-sec">
        <div class="footer-info">
          ${
            showFullNote
              ? `<p class="info-title">Xác nhận báo cáo:</p>
                 <p class="info-item">• Báo cáo xuất từ Hệ thống hỗ trợ định giá tài sản.</p>
                 <p class="info-item">• Phát triển bởi quoinv • Sử dụng nghiệp vụ nội bộ.</p>`
              : `<p class="info-item">• Hệ thống hỗ trợ định giá tài sản • quoinv</p>`
          }
        </div>
        <div class="sign-box">
          <div class="sign-title">CHUYÊN VIÊN ĐỊNH GIÁ</div>
          <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
          <div class="sign-name">${currentUser ? currentUser.username : '.....................'}</div>
        </div>
      </div>
    `;

    // 4. Page 1 HTML
    const page1Html = `
      <div class="pdf-page">
        <div>
          <!-- Header Banner -->
          <div class="header">
            <div>
              <div class="title-sub">🛡️ HỆ THỐNG HỖ TRỢ ĐỊNH GIÁ</div>
              <div class="title-main">BÁO CÁO ĐỊNH GIÁ TÀI SẢN</div>
              <div class="title-code">Mã tài liệu: <strong>${reportCode}</strong></div>
            </div>
            <div class="info-box">
              <div><strong>Ngày lập:</strong> ${formattedDate}</div>
              <div><strong>Người lập:</strong> ${currentUser ? currentUser.username : 'Chuyên viên định giá'}</div>
            </div>
          </div>

          <!-- Main Info + QR Code Grid -->
          <div class="grid-2">
            <div class="asset-card">
              <div>
                <div class="asset-label">🏷️ Tên tài sản định giá</div>
                <div class="asset-name">${displayTitle}</div>
              </div>
              <div class="price-row">
                <div class="price-label">Mức giá định giá:</div>
                <div class="price-val">${displayPrice}</div>
              </div>
            </div>

            <!-- Enhanced High-Resolution QR Box -->
            <div class="qr-card">
              <div class="qr-label">MÃ QR TRA CỨU</div>
              <div class="qr-img-wrapper">
                ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-image" alt="QR Code" crossOrigin="anonymous" />` : ''}
              </div>
              <div class="qr-subtext">Quét QR để mở dữ liệu gốc</div>
            </div>
          </div>

          <!-- Location & GPS Coordinates Box -->
          <div class="location-sec">
            <div class="section-heading">
              ${resolvedCoords ? '📍 THÔNG TIN VỊ TRÍ & TỌA ĐỘ GPS' : '📍 THÔNG TIN ĐƯỜNG DẪN / NGUỒN DỮ LIỆU'}
            </div>
            ${
              resolvedCoords && currentFormattedCoords
                ? `<div class="gps-badge">📍 Tọa độ GPS: ${currentFormattedCoords}</div>`
                : `<div class="no-gps-badge">ℹ️ Liên kết trực tuyến / Mã QR tiêu chuẩn (Không kèm tọa độ định vị GPS)</div>`
            }
            <div class="link-label">
              ${resolvedCoords ? 'Link Google Maps / Nguồn vị trí:' : 'Đường dẫn liên kết / Dữ liệu mã QR:'}
            </div>
            <div class="link-box">${rawContent || 'Chưa cung cấp nội dung đường dẫn'}</div>
          </div>

          <!-- Satellite Map Section -->
          ${
            resolvedCoords
              ? `
            <div class="map-sec">
              <div class="section-heading">
                🌐 HÌNH CHỤP VỆ TINH GOOGLE MAPS (CÓ NHÃN ĐƯỜNG & VỊ TRÍ)
              </div>
              ${
                satImg
                  ? `<div class="map-frame">
                      <img src="${satImg}" class="map-image" alt="Satellite Map" crossOrigin="anonymous" />
                     </div>`
                  : `<div class="map-placeholder">
                      📍 Tọa độ GPS Vệ tinh: ${currentFormattedCoords || resolvedCoords}
                     </div>`
              }
            </div>
            `
              : ''
          }

          <!-- Attached Documents Legal Index Section in PDF -->
          ${
            attachedDocuments && attachedDocuments.length > 0
              ? `
            <div class="doc-sec">
              <div class="section-heading">
                📋 HỒ SƠ TÀI LIỆU & TỆP PDF ĐÍNH KÈM (${attachedDocuments.length} tệp)
              </div>
              <div class="doc-grid">
                ${attachedDocuments
                  .map((doc, dIdx) => {
                    const ext = doc.name.toLowerCase().endsWith('.pdf') ? 'PDF' : doc.name.slice(-4).toUpperCase().replace('.', '');
                    return `
                    <div class="doc-row">
                      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                        <span class="doc-badge">${ext}</span>
                        <span class="doc-title">${dIdx + 1}. ${doc.name}</span>
                      </div>
                      <span class="doc-meta">${formatFileSize(doc.size)}</span>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
            </div>
            `
              : ''
          }
        </div>

        ${!hasExtraImagePages ? renderSignFooter(true) : `
          <div class="page-footer-note">
            <span>Trang 1 / ${imagePages.length + 1} • Xem tiếp hình ảnh tài sản thực tế tại trang sau ➔</span>
          </div>
        `}
      </div>
    `;

    // 5. Pages 2, 3...
    let imagePagesHtml = '';
    imagePages.forEach((imgs, pageIdx) => {
      const pageNumber = pageIdx + 2;
      const isLastPage = pageIdx === imagePages.length - 1;
      const isSingleImage = imgs.length === 1;

      const imgBlocks = imgs
        .map((imgSrc, subIdx) => {
          const globalIdx = pageIdx * imagesPerPage + subIdx + 1;
          return `
            <div class="attached-img-card ${isSingleImage ? 'single-img' : 'dual-img'}">
              <div class="attached-img-header">📷 HÌNH ẢNH TÀI SẢN THỰC TẾ (${globalIdx}/${attachedImages.length})</div>
              <div class="attached-img-container">
                <img src="${imgSrc}" class="attached-img-tag" alt="Ảnh tài sản ${globalIdx}" crossOrigin="anonymous" />
              </div>
            </div>
          `;
        })
        .join('');

      imagePagesHtml += `
        <div class="pdf-page">
          <div>
            <div class="sub-header">
              <div class="sub-header-left">
                <span class="sub-badge">PHỤ LỤC HÌNH ẢNH</span>
                <span class="sub-title">${displayTitle}</span>
              </div>
              <div class="sub-header-right">
                <span>Mã: <strong>${reportCode}</strong></span>
                <span>• Trang ${pageNumber}/${imagePages.length + 1}</span>
              </div>
            </div>

            <div class="attached-imgs-wrapper">
              ${imgBlocks}
            </div>
          </div>

          ${isLastPage ? renderSignFooter(true) : `
            <div class="page-footer-note">
              <span>Trang ${pageNumber} / ${imagePages.length + 1} • Tiếp tục trang sau ➔</span>
            </div>
          `}
        </div>
      `;
    });

    // 6. Create offscreen container in the active DOM (NOT a detached invisible iframe)
    // Samsung Internet / Blink GPU compositor requires visibility: visible & valid dimension to paint elements.
    const container = document.createElement('div');
    container.id = 'samsung-safe-pdf-container';
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';
    container.style.backgroundColor = '#ffffff';

    container.innerHTML = `
      <style>
        .pdf-page {
          width: 800px;
          min-height: 1120px;
          height: 1120px;
          padding: 32px 36px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #0f172a;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 12px; }
        .title-sub { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.8px; }
        .title-main { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 2px 0; }
        .title-code { font-size: 11px; color: #64748b; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 10.5px; color: #334155; text-align: right; line-height: 1.4; }

        .sub-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 14px; font-size: 11px; }
        .sub-header-left { display: flex; align-items: center; gap: 8px; }
        .sub-badge { background: #1e3a8a; color: #ffffff; font-weight: 800; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
        .sub-title { font-weight: 800; color: #0f172a; max-width: 440px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub-header-right { color: #64748b; font-size: 10.5px; }

        .grid-2 { display: grid; grid-template-columns: 1fr 160px; gap: 12px; margin-bottom: 12px; }
        .asset-card { background: #f0f7ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; }
        .asset-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; margin-bottom: 3px; }
        .asset-name { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 10px; line-height: 1.35; }
        .price-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #bfdbfe; padding-top: 8px; }
        .price-label { font-size: 11.5px; font-weight: 800; color: #065f46; }
        .price-val { font-size: 15px; font-weight: 900; color: #047857; background: #d1fae5; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 6px; }

        .qr-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .qr-label { font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin-bottom: 4px; }
        .qr-img-wrapper { background: #ffffff; padding: 4px; border: 1px solid #cbd5e1; border-radius: 6px; }
        .qr-image { width: 120px; height: 120px; display: block; }
        .qr-subtext { font-size: 8px; font-weight: 600; color: #64748b; margin-top: 4px; }

        .section-heading { font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin-bottom: 5px; }
        .location-sec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
        .gps-badge { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 800; font-family: monospace; font-size: 11.5px; padding: 4px 8px; border-radius: 6px; margin-bottom: 5px; display: inline-block; }
        .no-gps-badge { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; font-weight: 600; font-size: 10px; padding: 3px 8px; border-radius: 6px; margin-bottom: 5px; display: inline-block; }
        .link-label { font-size: 9.5px; font-weight: bold; color: #475569; margin-bottom: 2px; }
        .link-box { font-family: monospace; font-size: 9.5px; color: #1e293b; background: #ffffff; border: 1px solid #cbd5e1; padding: 5px 7px; border-radius: 6px; word-break: break-all; line-height: 1.35; }

        .map-sec { margin-top: 6px; }
        .map-frame { border: 1.5px solid #334155; border-radius: 10px; overflow: hidden; background: #0f172a; }
        .map-image { width: 100%; height: 245px; object-fit: cover; display: block; }
        .map-placeholder { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 20px; text-align: center; color: #38bdf8; font-size: 11px; font-weight: bold; }

        .doc-sec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-top: 8px; }
        .doc-grid { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
        .doc-row { display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; background: #ffffff; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; }
        .doc-badge { font-weight: 900; font-size: 8px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 1px 4px; border-radius: 3px; flex-shrink: 0; }
        .doc-title { font-weight: bold; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .doc-meta { color: #64748b; font-size: 8.5px; margin-left: 8px; flex-shrink: 0; }

        .attached-imgs-wrapper { display: flex; flex-direction: column; gap: 14px; }
        .attached-img-card { border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #f8fafc; padding: 8px; }
        .attached-img-header { font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px; }
        .attached-img-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .single-img .attached-img-container { height: 700px; }
        .single-img .attached-img-tag { max-width: 100%; max-height: 700px; object-fit: contain; display: block; }
        .dual-img .attached-img-container { height: 340px; }
        .dual-img .attached-img-tag { max-width: 100%; max-height: 340px; object-fit: contain; display: block; }

        .footer-sec { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 12px; }
        .footer-info { font-size: 9.5px; color: #475569; line-height: 1.5; }
        .info-title { font-weight: bold; color: #1e293b; }
        .info-item { font-size: 9px; color: #64748b; }
        .sign-box { text-align: center; }
        .sign-title { font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #1e293b; }
        .sign-sub { font-size: 8.5px; color: #64748b; margin-bottom: 30px; }
        .sign-name { font-size: 10.5px; font-weight: bold; color: #0f172a; border-top: 1px dashed #cbd5e1; padding-top: 4px; width: 150px; margin: 0 auto; }
        .page-footer-note { font-size: 9.5px; color: #64748b; font-weight: 600; text-align: right; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
      </style>
      ${page1Html}
      ${imagePagesHtml}
    `;

    document.body.appendChild(container);

    // Wait for all images inside container to be fully ready
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve(true);
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
          setTimeout(() => resolve(true), 1200); // 1.2s timeout fallback
        });
      })
    );

    const pageElements = Array.from(container.querySelectorAll('.pdf-page'));
    if (pageElements.length === 0) {
      if (document.body.contains(container)) document.body.removeChild(container);
      throw new Error('Không tìm thấy nội dung trang để xuất PDF');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Detect mobile device (especially Samsung / Android)
    // Scale 1.6x is crystal sharp for 300DPI print on A4 while requiring 60% less memory than 2.2x,
    // which completely eliminates canvas memory limits on Samsung devices!
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Samsung/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    const renderScale = isMobile ? 1.6 : 2.0;

    // Render each discrete page to canvas independently
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const canvas = await html2canvas(pageEl, {
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800,
        imageTimeout: 10000,
      });

      const pageImgData = canvas.toDataURL('image/jpeg', 0.94);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(pageImgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    // Clean up container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const safeTitle = (displayTitle || 'TaiSan').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
    const fileName = `Bao_Cao_Dinh_Gia_${safeTitle}_${Date.now()}.pdf`;
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    return { pdf, fileName, pdfBlob, blobUrl };
  };

  const recordExportToCloud = async () => {
    try {
      await recordExportPdfAction({
        title: displayTitle,
        rawString: rawContent,
        type: type || 'url',
        options: options,
        marketValue: marketValue || undefined,
        attachedImages: attachedImages,
        attachedDocuments: attachedDocuments,
        coordinates: effectiveCoords || undefined,
        reportCode: reportCode,
        createdByUid: currentUser?.uid,
        creatorName: currentUser?.username || 'Chuyên viên',
      });
      setExportLoggedToast(`✓ Đã lưu lịch sử xuất báo cáo "${displayTitle}" vào Cloud!`);
      setTimeout(() => setExportLoggedToast(null), 4000);
      if (onRecordExportSuccess) {
        onRecordExportSuccess();
      }
    } catch (e) {
      console.warn('Lỗi ghi nhận lịch sử xuất PDF lên Cloud:', e);
    }
  };

  /**
   * Safe download handler that guarantees Samsung / Android download works
   */
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setReadyDownload(null);
    try {
      const { fileName, pdfBlob, blobUrl } = await buildPdfDocument();

      // Record history on Cloud
      await recordExportToCloud();

      // Store in readyDownload state so Samsung users can tap explicitly if auto-click is blocked
      setReadyDownload({ blobUrl, fileName, type: 'pdf' });

      // Attempt automatic download link trigger
      try {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 500);
      } catch (clickErr) {
        console.warn('Auto download click warning:', clickErr);
      }
    } catch (err) {
      console.error('Lỗi xuất PDF:', err);
      setExportLoggedToast('Đang chuyển hướng sang chế độ In & Lưu PDF của trình duyệt...');
      setTimeout(() => {
        window.print();
      }, 300);
      await recordExportToCloud();
    } finally {
      setIsExportingPdf(false);
    }
  };

  /**
   * Export Valuation Report as High-Quality Image (PNG/JPEG).
   * Universally supported on all Samsung devices, saving directly to Samsung Gallery (Bộ sưu tập).
   */
  const handleExportAsImage = async () => {
    if (!reportRef.current) return;
    setIsExportingImage(true);
    setReadyDownload(null);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const safeTitle = (displayTitle || 'TaiSan').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
      const fileName = `Bao_Cao_Dinh_Gia_${safeTitle}_${Date.now()}.jpg`;

      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.94);
      setReadyDownload({ blobUrl: imgDataUrl, fileName, type: 'image' });

      // Trigger download
      const a = document.createElement('a');
      a.href = imgDataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 500);

      await recordExportToCloud();
      setExportLoggedToast('✓ Đã tạo file Ảnh Báo cáo thành công!');
    } catch (err) {
      console.error('Lỗi xuất ảnh báo cáo:', err);
      setExportLoggedToast('Không thể tạo file ảnh. Vui lòng thử nút In hoặc Tải PDF.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharingPdf(true);
    try {
      const { fileName, pdfBlob, blobUrl } = await buildPdfDocument();
      setReadyDownload({ blobUrl, fileName, type: 'pdf' });
      await recordExportToCloud();

      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Báo Cáo Định Giá Tài Sản',
          text: `Báo cáo định giá tài sản: ${displayTitle}`,
          files: [file],
        });
      } else if (navigator.share) {
        // Fallback sharing without file attached
        await navigator.share({
          title: 'Báo Cáo Định Giá Tài Sản',
          text: `Báo cáo định giá tài sản: ${displayTitle}\nMã tài liệu: ${reportCode}`,
          url: directMapUrl || window.location.href,
        });
      } else {
        // Open PDF in new tab
        window.open(blobUrl, '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Lỗi chia sẻ PDF:', err);
      }
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Embedded Print Styles for clean A4 printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-valuation-report, #printable-valuation-report * {
            visibility: visible !important;
          }
          #printable-valuation-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Control Header Bar */}
        <div className="no-print bg-slate-800/90 border-b border-slate-700/80 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Báo Cáo Định Giá Tài Sản</span>
                <span className="hidden sm:inline-flex text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Tối ưu Samsung & Android
                </span>
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">
                {effectiveCoords
                  ? 'Bao gồm tọa độ GPS & ảnh chụp vệ tinh Google Maps'
                  : 'Báo cáo thông tin liên kết & dữ liệu định giá'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Direct PDF Share Button */}
            <button
              onClick={handleSharePdf}
              disabled={isSharingPdf || isExportingPdf}
              className="inline-flex items-center gap-1 px-3 py-2 bg-[#8C1B20] hover:bg-[#721317] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer border border-red-400/40 disabled:opacity-50"
              title="Chia sẻ trực tiếp file PDF báo cáo qua Zalo, Mail, Message"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>Chia Sẻ</span>
                </>
              )}
            </button>

            {/* Direct Export as Image Button (Super friendly for Samsung Gallery) */}
            <button
              onClick={handleExportAsImage}
              disabled={isExportingImage || isExportingPdf}
              className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer border border-indigo-400/40 disabled:opacity-50"
              title="Lưu báo cáo dạng ảnh HD trực tiếp vào Thư viện ảnh / Gallery máy Samsung"
            >
              {isExportingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-white" />
                  <span>Lưu Ảnh HD</span>
                </>
              )}
            </button>

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer border border-emerald-400/40 disabled:opacity-50"
              title="Tải trực tiếp file PDF về máy"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang tạo PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Lưu File PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer hidden md:flex"
              title="In trực tiếp"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ready Download Banner (Dedicated for Samsung Internet & Android devices) */}
        {readyDownload && (
          <div className="no-print bg-emerald-900/90 border-b border-emerald-500/60 p-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-start sm:items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-xs font-bold text-emerald-100">
                  {readyDownload.type === 'pdf'
                    ? '✓ Báo cáo PDF đã được khởi tạo thành công!'
                    : '✓ Ảnh báo cáo HD đã sẵn sàng!'}
                </p>
                <p className="text-[11px] text-emerald-300">
                  Dành cho máy Samsung: Nếu trình duyệt không tự động tải, bạn có thể bấm nút bên dưới:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={readyDownload.blobUrl}
                download={readyDownload.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-900 font-extrabold text-xs rounded-lg shadow-sm hover:bg-emerald-50 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bấm Tải Về Máy</span>
              </a>

              {readyDownload.type === 'pdf' && (
                <a
                  href={readyDownload.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg border border-emerald-400/40 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Mở Xem Tab Mới</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Export Logged Toast Confirmation */}
        {exportLoggedToast && (
          <div className="no-print bg-blue-950/90 border-b border-blue-500/50 px-4 py-2 text-xs font-bold text-blue-300 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              {exportLoggedToast}
            </span>
            <span className="text-[11px] text-blue-400 font-normal">Đã đồng bộ Cloud</span>
          </div>
        )}

        {/* Scrollable Printable Document Sheet Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950">
          <div
            ref={reportRef}
            id="printable-valuation-report"
            className="w-full bg-white text-slate-900 rounded-xl p-5 sm:p-8 border border-slate-200 shadow-xl space-y-5 max-w-3xl mx-auto"
          >
            {/* 1. Header Banner */}
            <div className="border-b-2 border-blue-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1 mb-0.5">
                  <ShieldCheck className="w-4 h-4 text-blue-800" />
                  <span>HỆ THỐNG HỖ TRỢ ĐỊNH GIÁ</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  BÁO CÁO ĐỊNH GIÁ TÀI SẢN
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Mã tài liệu: <span className="font-mono font-bold text-slate-800">{reportCode}</span>
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center sm:justify-end gap-1 text-slate-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  <span>Ngày lập: {formattedDate}</span>
                </div>
                <div className="flex items-center sm:justify-end gap-1 text-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    Người lập: <strong>{currentUser ? currentUser.username : 'Chuyên viên định giá'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Asset Name & Valuation Price Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch page-break-avoid">
              <div className="md:col-span-8 bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">
                      Tên tài sản định giá
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {displayTitle}
                  </div>
                </div>

                {/* Valuation Price */}
                <div className="pt-2.5 border-t border-blue-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-900">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Mức giá định giá:</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-lg">
                    {displayPrice}
                  </div>
                </div>
              </div>

              {/* QR Code Canvas Box */}
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider mb-1.5">
                  MÃ QR TRA CỨU
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <canvas ref={canvasRef} className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
                </div>
                <div className="text-[9.5px] text-slate-500 font-semibold mt-1.5 leading-tight">
                  Quét QR để mở dữ liệu gốc
                </div>
              </div>
            </div>

            {/* 3. Detailed Coordinates & Link Section (Adapts gracefully if coords missing) */}
            <div className="space-y-2 border-t border-slate-200 pt-3.5 page-break-avoid">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>
                  {effectiveCoords ? 'Thông tin vị trí & Tọa độ GPS' : 'Thông tin đường dẫn / Nguồn dữ liệu'}
                </span>
              </h3>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5">
                {/* Lat/Long Coordinates Box (If coordinates available) */}
                {effectiveCoords && formattedCoords ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="text-xs font-mono font-bold text-emerald-900">
                      Tọa độ GPS: {formattedCoords}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-slate-600">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-medium">
                      {isResolvingCoords
                        ? 'Đang kiểm tra tọa độ vị trí...'
                        : 'Liên kết trực tuyến / Mã QR tiêu chuẩn (Không chứa dữ liệu tọa độ định vị GPS)'}
                    </span>
                  </div>
                )}

                {/* Full Link Box */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-slate-700 font-bold">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {effectiveCoords ? 'Đường dẫn Google Maps / Nguồn vị trí:' : 'Đường dẫn liên kết / Dữ liệu mã QR:'}
                    </span>
                  </div>
                  <div className="text-slate-800 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                    {rawContent || 'Chưa cung cấp đường dẫn'}
                  </div>
                </div>

                {directMapUrl && (
                  <div className="pt-1 flex items-center justify-between no-print">
                    <a
                      href={directMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      <span>
                        {effectiveCoords ? 'Mở vị trí trực tiếp trên Google Maps' : 'Mở đường dẫn liên kết trong trình duyệt'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Satellite Map Frame Section (Rendered only when coordinates are present) */}
            {effectiveCoords && (
              <div className="space-y-2 page-break-avoid border-t border-slate-200 pt-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Hình chụp Vệ tinh Google Maps</span>
                  </h3>
                  {directMapUrl && (
                    <a
                      href={directMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-700 hover:underline font-bold no-print inline-flex items-center gap-1"
                    >
                      <span>Xem chi tiết trên Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Large high-definition Satellite Map Frame */}
                <div className="w-full rounded-xl border-2 border-slate-700 overflow-hidden bg-slate-900 shadow-md relative group">
                  {satelliteSnapshotUrl ? (
                    <img
                      src={satelliteSnapshotUrl}
                      alt="Ảnh Vệ Tinh Google Maps"
                      className="w-full h-auto block"
                      crossOrigin="anonymous"
                    />
                  ) : embedMapUrl ? (
                    <iframe
                      title="Print Satellite Google Map"
                      src={embedMapUrl}
                      className="w-full h-72 sm:h-80 border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center text-slate-400 text-xs">
                      {isLoadingSatellite ? 'Đang tải dữ liệu vệ tinh...' : 'Chưa có dữ liệu vệ tinh'}
                    </div>
                  )}
                  {isLoadingSatellite && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Đang tạo ảnh chụp vệ tinh chất lượng cao...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Attached Photos Section (Enlarged Photo Frames with 35MB Upload Support) */}
            <div className="space-y-3 page-break-avoid border-t border-slate-200 pt-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Hình ảnh tài sản thực tế ({attachedImages.length}/5 ảnh đính kèm)</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Hỗ trợ ảnh dung lượng tới 35MB/ảnh
                </span>
              </div>

              {/* Upload Error Banner */}
              {imageUploadError && (
                <div className="no-print p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between animate-fadeIn">
                  <span>⚠️ {imageUploadError}</span>
                  <button
                    type="button"
                    onClick={() => setImageUploadError(null)}
                    className="font-bold text-red-700 hover:text-red-900 px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload Button in Modal */}
              {setAttachedImages && attachedImages.length < 5 && (
                <div className="no-print">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleModalImageUpload}
                    className="hidden"
                    id="modal-attached-images-upload"
                    disabled={isUploadingImages}
                  />
                  <label
                    htmlFor="modal-attached-images-upload"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-50/70 border border-dashed border-amber-400 hover:bg-amber-100/80 rounded-xl cursor-pointer transition text-amber-900 text-xs font-bold shadow-2xs"
                  >
                    <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {isUploadingImages
                        ? 'Đang nén & tối ưu ảnh HD (Hỗ trợ ảnh tới 35MB)...'
                        : `+ Đính kèm thêm ảnh tài sản vào báo cáo (Hỗ trợ dung lượng tới 35MB/ảnh - Còn ${5 - attachedImages.length} ảnh)`}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Hỗ trợ tệp ảnh gốc độ phân giải cao lên đến 35MB/ảnh (Samsung, iPhone, DSLR...). Tự động tối ưu nét căng chuẩn in A4.
                  </p>
                </div>
              )}

              {/* Photos List */}
              {attachedImages && attachedImages.length > 0 ? (
                <div className="space-y-4">
                  {attachedImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-100 p-2 text-center shadow-xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`Hình ảnh tài sản ${idx + 1}`}
                        className="max-w-full max-h-[480px] mx-auto h-auto object-contain rounded-lg"
                        crossOrigin="anonymous"
                      />
                      <div className="text-xs font-bold text-slate-700 mt-2 uppercase flex items-center justify-center gap-2">
                        <span>Ảnh {idx + 1}</span>
                        {setAttachedImages && (
                          <button
                            type="button"
                            onClick={() => handleModalRemoveImage(idx)}
                            className="no-print inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 bg-white border border-red-200 px-2 py-0.5 rounded cursor-pointer transition"
                            title="Xóa ảnh này khỏi báo cáo"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                  Chưa có hình ảnh tài sản thực tế đính kèm. Bấm nút trên để tải ảnh (hỗ trợ tới 35MB/ảnh).
                </div>
              )}
            </div>

            {/* 6. Attached PDF & Documents Section (Up to 35MB per file) */}
            <div className="space-y-3 page-break-avoid border-t border-slate-200 pt-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Hồ sơ tài liệu & File PDF đính kèm ({attachedDocuments.length}/5 tệp)</span>
                </h3>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  Hỗ trợ tệp tới 35MB/tệp
                </span>
              </div>

              {/* Upload Error Banner */}
              {docUploadError && (
                <div className="no-print p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between animate-fadeIn">
                  <span>⚠️ {docUploadError}</span>
                  <button
                    type="button"
                    onClick={() => setDocUploadError(null)}
                    className="font-bold text-red-700 hover:text-red-900 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Document Upload Button in Modal */}
              {setAttachedDocuments && attachedDocuments.length < 5 && (
                <div className="no-print">
                  <input
                    type="file"
                    accept=".pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    multiple
                    onChange={handleModalDocumentUpload}
                    className="hidden"
                    id="modal-attached-docs-upload"
                    disabled={isUploadingDocs}
                  />
                  <label
                    htmlFor="modal-attached-docs-upload"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50/70 border border-dashed border-red-400 hover:bg-red-100/80 rounded-xl cursor-pointer transition text-red-900 text-xs font-bold shadow-2xs"
                  >
                    <Paperclip className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      {isUploadingDocs
                        ? 'Đang tải & xử lý tệp tài liệu / PDF (tới 35MB)...'
                        : `+ Đính kèm File PDF thông thường & Tài Liệu Hồ Sơ (Hỗ trợ tới 35MB/tệp - Còn ${5 - attachedDocuments.length} tệp)`}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Chấp nhận file PDF thông thường, văn bản Word, bảng tính Excel, bản scan trích lục, sổ đỏ, hợp đồng... (tối đa 35MB/tệp).
                  </p>
                </div>
              )}

              {/* Documents List */}
              {attachedDocuments && attachedDocuments.length > 0 ? (
                <div className="space-y-2">
                  {attachedDocuments.map((doc, dIdx) => {
                    const info = getDocumentTypeInfo(doc.name, doc.type);
                    return (
                      <div
                        key={doc.id || dIdx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-2 hover:bg-slate-100 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${info.badgeBg}`}>
                            {info.ext}
                          </span>
                          <span className="font-bold text-slate-800 truncate" title={doc.name}>
                            {dIdx + 1}. {doc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({formatFileSize(doc.size)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              download={doc.name}
                              className="no-print inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:border-red-400 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold transition shadow-2xs"
                              title="Mở hoặc tải về tệp tin này"
                            >
                              <ExternalLink className="w-3 h-3 text-red-600" />
                              <span>Mở / Tải</span>
                            </a>
                          )}
                          {setAttachedDocuments && (
                            <button
                              type="button"
                              onClick={() => handleModalRemoveDocument(doc.id)}
                              className="no-print inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 bg-white border border-red-200 px-2 py-1 rounded-lg cursor-pointer transition hover:bg-red-50"
                              title="Xóa tệp này khỏi báo cáo"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                  Chưa có file PDF hoặc tài liệu hồ sơ đính kèm. Bấm nút trên để tải (chấp nhận file PDF thông thường, Word, Excel... tới 35MB/tệp).
                </div>
              )}
            </div>

            {/* 7. Footer & Signatures */}
            <div className="border-t-2 border-slate-200 pt-5 mt-6 grid grid-cols-2 gap-6 text-center page-break-avoid">
              <div className="text-left space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-800">Xác nhận báo cáo:</p>
                <p className="text-[11px] text-slate-500">• Báo cáo xuất từ Hệ thống hỗ trợ định giá.</p>
                <p className="text-[11px] text-slate-700 font-semibold">• Phát triển bởi quoinv</p>
                <p className="text-[11px] text-slate-700 font-semibold">• Hệ thống sử dụng nội bộ</p>
              </div>

              <div className="space-y-10">
                <div>
                  <p className="font-extrabold text-xs uppercase text-slate-800">
                    Chuyên viên định giá
                  </p>
                  <p className="text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                </div>
                <div className="font-bold text-xs text-slate-800 pt-1.5 border-t border-dashed border-slate-300 max-w-44 mx-auto">
                  {currentUser ? currentUser.username : '.....................'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
