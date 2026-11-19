import React from 'react';
import { Mail, X, Copy, Check, Send, ExternalLink, Share2, Download, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { UserProfile, AttachedDocument } from '../types';
import { formatFileSize } from '../utils/documentUtils';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl: string;
  qrTitle: string;
  rawContent: string;
  currentUser?: UserProfile | null;
  marketValue?: string;
  attachedImages?: string[];
  attachedDocuments?: AttachedDocument[];
  coordinates?: string | null;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  qrDataUrl,
  qrTitle,
  rawContent,
  currentUser,
  marketValue,
  attachedImages,
  attachedDocuments,
  coordinates,
}) => {
  const displayTitle = qrTitle?.trim() || 'Thông tin Tài sản';
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [senderEmail, setSenderEmail] = React.useState(currentUser?.email || '');
  const [subject, setSubject] = React.useState(displayTitle);
  const [message, setMessage] = React.useState('');
  const [copiedImage, setCopiedImage] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser?.email) {
      setSenderEmail(currentUser.email);
    }
  }, [currentUser]);

  React.useEffect(() => {
    const assetName = qrTitle?.trim() || 'Thông tin Tài sản';
    setSubject(assetName);

    let body = `THÔNG TIN TÀI SẢN & MÃ QR\n`;
    body += `========================================\n`;
    body += `📌 Tên tài sản: ${assetName}\n`;
    if (rawContent) {
      body += `🔗 Link / Nội dung QR: ${rawContent}\n`;
    }
    if (coordinates) {
      body += `📍 Tọa độ GPS: ${coordinates}\n`;
    }
    if (marketValue) {
      body += `💰 Giá ước tính: ${marketValue}\n`;
    }
    if (attachedImages && attachedImages.length > 0) {
      body += `\n📷 Hình ảnh thực tế đính kèm (${attachedImages.length} ảnh):\n`;
      attachedImages.forEach((img, idx) => {
        body += `- Ảnh ${idx + 1}: ${img}\n`;
      });
    }
    if (attachedDocuments && attachedDocuments.length > 0) {
      body += `\n📋 Hồ sơ tài liệu & File PDF đính kèm (${attachedDocuments.length} tệp):\n`;
      attachedDocuments.forEach((doc, idx) => {
        body += `- [${idx + 1}] ${doc.name} (${formatFileSize(doc.size)})${doc.url ? `: ${window.location.origin}${doc.url}` : ''}\n`;
      });
    }
    body += `========================================\n\nTrân trọng.`;

    setMessage(body);
  }, [qrTitle, rawContent, marketValue, attachedImages, attachedDocuments, coordinates]);

  if (!isOpen) return null;

  // Direct 1-Click Automatic Send
  const handleDirectAutoSend = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      setStatusNotice('⚠️ Vui lòng nhập địa chỉ Email người nhận trước khi bấm tự động gửi.');
      return;
    }

    setIsSending(true);
    setStatusNotice(null);
    setPreviewUrl(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail.trim(),
          senderEmail: senderEmail.trim(),
          subject,
          message,
          rawContent,
          coordinates,
          marketValue,
          attachedImages,
          attachedDocuments,
          qrDataUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusNotice(`✓ GỬI MAIL THÀNH CÔNG! Đã tự động chuyển thư chứa mã QR, tọa độ GPS, giá ước tính, tài liệu PDF & hình ảnh đính kèm tới: ${recipientEmail.trim()}`);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
      } else {
        throw new Error(data.error || 'Gửi email không thành công.');
      }
    } catch (err: any) {
      console.error('Direct send error', err);
      setStatusNotice(`⚠️ Lỗi khi tự động gửi email: ${err.message || 'Không thể kết nối máy chủ gửi mail'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Copy QR Image Blob to Clipboard
  const handleCopyImageToClipboard = async () => {
    try {
      if (!qrDataUrl) return;
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopiedImage(true);
      setStatusNotice('✓ Đã sao chép ảnh QR vào bộ nhớ tạm!');
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) {
      console.error('Clipboard copy image failed', err);
      handleDownloadImage();
    }
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${(subject || 'Code').replace(/[/\\?%*:|"<>]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatusNotice('✓ Đã tải ảnh QR về máy.');
  };

  // Open Mail Client via mailto
  const handleOpenMailto = () => {
    const fullBody = `${message}`;
    const to = recipientEmail.trim();
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(fullBody)}`;
    window.location.href = mailtoUrl;
  };

  // Open Gmail Compose directly with auto-clipboard copy of QR Image & auto-download
  const handleOpenGmail = async () => {
    try {
      if (qrDataUrl) {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        setCopiedImage(true);
      }
    } catch (e) {
      console.log('Auto copy image to clipboard skipped', e);
    }

    handleDownloadImage();

    const toParam = recipientEmail.trim() ? `&to=${encodeURIComponent(recipientEmail.trim())}` : '';
    const bodyText = `${message}\n\n[Mẹo]: Nhấn Ctrl+V để dán ảnh mã QR hoặc đính kèm tệp PNG vừa tải về!`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${toParam}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyText)}`;

    window.open(gmailUrl, '_blank');
    setStatusNotice(`✓ Đã tự động kết nối và mở Gmail với Tiêu đề: "${subject}"!`);
  };

  // Native Web Share with File
  const handleNativeShare = async () => {
    if (!navigator.share) {
      alert('Trình duyệt hiện tại không hỗ trợ tính năng Chia sẻ trực tiếp.');
      return;
    }
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${subject}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: subject,
          text: message,
          files: [file],
        });
      } else {
        await navigator.share({
          title: subject,
          text: `${message}\n\n${rawContent}`,
        });
      }
    } catch (err) {
      console.log('Share cancelled or failed', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with VietinBank branding */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00529C] text-white flex items-center justify-center font-bold shadow-2xs">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#00529C]">Gửi Tự Động Mã QR & Thông Tin Tài Sản</h2>
              <p className="text-xs text-slate-500">Chuyển tiếp đầy đủ hình ảnh, tọa độ &amp; giá tài sản chỉ trong 1 cú nhấp</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {/* QR Code Preview Banner */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xs">
            <div className="w-20 h-20 bg-slate-50 rounded-lg p-1 border border-slate-200 shrink-0 flex items-center justify-center">
              <img src={qrDataUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00529C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {qrTitle || 'Tài sản'}
                </span>
                {coordinates && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                    📍 {coordinates}
                  </span>
                )}
                {marketValue && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    💰 {marketValue}
                  </span>
                )}
                {attachedImages && attachedImages.length > 0 && (
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    📷 {attachedImages.length} ảnh
                  </span>
                )}
                {attachedDocuments && attachedDocuments.length > 0 && (
                  <span className="text-[10px] font-bold text-red-800 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    📋 {attachedDocuments.length} tệp hồ sơ
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-800 truncate" title={rawContent}>
                {rawContent}
              </p>

              <button
                type="button"
                onClick={handleCopyImageToClipboard}
                className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
              >
                {copiedImage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã chép ảnh QR!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sao chép ảnh QR vào bộ nhớ tạm</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Email người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Ví dụ: nguoinhan@gmail.com hoặc khachhang@vietinbank.vn"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề thư (Mặc định: Tên tài sản)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email người gửi (Tùy chọn)</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="emailcuaban@domain.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nội dung ghi chú kèm thư</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529C] resize-none"
              />
            </div>
          </div>

          {/* Status Notice Feedback */}
          {statusNotice && (
            <div className={`p-3.5 rounded-xl text-xs font-bold flex flex-col gap-1 shadow-2xs ${
              statusNotice.startsWith('✓')
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {statusNotice.startsWith('✓') ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                  <span>{statusNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStatusNotice(null)}
                  className="text-slate-500 hover:text-slate-800 ml-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-emerald-700 underline mt-1 hover:text-emerald-900 flex items-center gap-1"
                >
                  <span>🔗 Bấm vào đây để xem mẫu thư HTML trực quan vừa gửi (Preview Email)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenGmail}
              title="Mở tab soạn thảo Gmail trực tiếp"
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5 text-red-500" />
              <span>Mở Web Gmail</span>
            </button>

            <button
              onClick={handleDirectAutoSend}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-extrabold flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang tự động gửi mail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>🚀 TỰ ĐỘNG GỬI MAIL NGAY (1 CLICK)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

