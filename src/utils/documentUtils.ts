import { AttachedDocument } from '../types';

export const MAX_DOCUMENT_SIZE_MB = 35;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getDocumentTypeInfo = (fileName: string, mimeType?: string) => {
  const name = (fileName || '').toLowerCase();
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
    return {
      label: 'Tài liệu PDF thông thường',
      iconColor: 'text-red-600',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      ext: 'PDF',
    };
  }
  if (name.endsWith('.doc') || name.endsWith('.docx') || mimeType?.includes('word')) {
    return {
      label: 'Văn bản Word',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      ext: 'DOC',
    };
  }
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || mimeType?.includes('sheet') || mimeType?.includes('excel')) {
    return {
      label: 'Bảng tính Excel',
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ext: 'XLS',
    };
  }
  if (name.endsWith('.txt') || name.endsWith('.csv')) {
    return {
      label: 'Tài liệu Văn bản / Dữ liệu',
      iconColor: 'text-slate-600',
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
      ext: name.endsWith('.csv') ? 'CSV' : 'TXT',
    };
  }
  if (name.endsWith('.zip') || name.endsWith('.rar')) {
    return {
      label: 'Tệp nén hồ sơ',
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      ext: 'ZIP',
    };
  }
  return {
    label: 'Tài liệu hồ sơ đính kèm',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ext: 'HỒ SƠ',
  };
};

export const validateDocumentFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) return { valid: false, error: 'Không tìm thấy tệp tin.' };
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Tệp "${file.name}" dung lượng ${sizeMB}MB vượt quá giới hạn cho phép ${MAX_DOCUMENT_SIZE_MB}MB. Vui lòng chọn tệp dưới 35MB.`,
    };
  }
  return { valid: true };
};

/**
 * Uploads a document (PDF, DOCX, XLSX, TXT, CSV, etc.) up to 35MB to the backend server.
 * Uses direct stream upload (body: file) first to avoid RAM overhead from base64 encoding.
 * Falls back gracefully to JSON/base64 upload and finally to local memory Blob URL.
 */
export const uploadDocumentToServer = async (file: File): Promise<AttachedDocument> => {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const encodedName = encodeURIComponent(file.name);
  const encodedType = encodeURIComponent(file.type || 'application/pdf');

  // Strategy 1: Direct streaming upload (zero RAM overhead, handles full 35MB instantly)
  try {
    const streamRes = await fetch(
      `/api/upload-document-raw?fileName=${encodedName}&fileType=${encodedType}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodedName,
          'X-File-Type': encodedType,
        },
        body: file,
      }
    );

    if (streamRes.ok) {
      const data = await streamRes.json();
      return {
        id: docId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        url: data.fileUrl,
        uploadedAt: Date.now(),
      };
    }
  } catch (streamErr) {
    console.warn('Streaming document upload failed, attempting fallback:', streamErr);
  }

  // Strategy 2: Base64 JSON upload fallback
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Lỗi khi đọc dữ liệu tệp tin'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/upload-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        fileData: base64Data,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: docId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        url: data.fileUrl,
        uploadedAt: Date.now(),
      };
    }
  } catch (jsonErr) {
    console.warn('Base64 upload-document failed, using local Blob URL fallback:', jsonErr);
  }

  // Strategy 3: Offline / local Blob URL fallback
  const localBlobUrl = URL.createObjectURL(file);
  return {
    id: docId,
    name: file.name,
    size: file.size,
    type: file.type || 'application/pdf',
    url: localBlobUrl,
    uploadedAt: Date.now(),
  };
};
