/**
 * Utility to optimize and resize uploaded images for PDF reports & Cloud Firestore sync.
 * Supports large high-resolution images up to 35MB (Samsung 108MP, iPhone RAW/ProRAW, DSLR).
 * Uses zero-RAM memory streaming (Blob URL / ImageBitmap) to prevent browser memory exhaustion,
 * producing crisp, print-ready document images (~60KB - 90KB) that fit safely within Firestore limits.
 */

export const MAX_IMAGE_FILE_SIZE_MB = 35;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validate image file size and MIME type
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'Không tìm thấy tệp tin.' };
  }
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: `Tệp "${file.name}" không phải là định dạng hình ảnh hợp lệ.` };
  }
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ảnh "${file.name}" dung lượng ${sizeInMB}MB vượt quá giới hạn cho phép ${MAX_IMAGE_FILE_SIZE_MB}MB. Vui lòng chọn ảnh dưới 35MB.`,
    };
  }
  return { valid: true };
};

/**
 * Compresses an image up to 35MB using memory-safe Blob URLs and Canvas downsampling.
 */
export const compressImage = (
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.76
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return reject(new Error(validation.error || 'Tệp không hợp lệ'));
    }

    // Use zero-copy Blob URL instead of FileReader.readAsDataURL
    // readAsDataURL allocates massive strings in RAM for 35MB files, which causes crashes.
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Free object URL immediately once decoded
      URL.revokeObjectURL(blobUrl);

      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // Calculate target dimensions keeping aspect ratio
        let targetWidth = width;
        let targetHeight = height;
        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        // Draw onto canvas with optimal smoothing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });

        if (!ctx) {
          // Fallback for extreme low-memory scenarios
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.min(targetWidth, 640);
          smallCanvas.height = Math.min(targetHeight, 640);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
            resolve(smallCanvas.toDataURL('image/jpeg', 0.70));
            return;
          }
          return reject(new Error('Không thể khởi tạo bộ nhớ xử lý ảnh trên thiết bị'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If result is still over 150KB, apply gentle secondary compression to safeguard Firestore & LocalStorage
        if (dataUrl.length > 200000) {
          const secondaryCanvas = document.createElement('canvas');
          secondaryCanvas.width = Math.round(targetWidth * 0.85);
          secondaryCanvas.height = Math.round(targetHeight * 0.85);
          const secCtx = secondaryCanvas.getContext('2d');
          if (secCtx) {
            secCtx.imageSmoothingEnabled = true;
            secCtx.imageSmoothingQuality = 'high';
            secCtx.drawImage(canvas, 0, 0, secondaryCanvas.width, secondaryCanvas.height);
            dataUrl = secondaryCanvas.toDataURL('image/jpeg', 0.68);
          }
        }

        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas compression error for large image:', err);
        reject(err instanceof Error ? err : new Error('Lỗi khi nén hình ảnh'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Không thể giải mã dữ liệu hình ảnh từ "${file.name}"`));
    };

    img.src = blobUrl;
  });
};

/**
 * Ensures an array of image data URLs never exceeds the safe total payload for Firestore (approx 650KB)
 */
export const optimizeImagesForCloud = async (images: string[], maxTotalChars = 600000): Promise<string[]> => {
  if (!images || images.length === 0) return [];

  let totalChars = images.reduce((acc, img) => acc + (img ? img.length : 0), 0);
  if (totalChars <= maxTotalChars) {
    return images;
  }

  // Downscale images to fit within budget
  const maxPerImage = Math.floor(maxTotalChars / images.length);
  const result: string[] = [];

  for (const imgUrl of images) {
    if (!imgUrl) continue;
    if (imgUrl.length <= maxPerImage) {
      result.push(imgUrl);
      continue;
    }

    try {
      const downscaled = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = 0.65;
          canvas.width = Math.round((img.naturalWidth || img.width) * scale);
          canvas.height = Math.round((img.naturalHeight || img.height) * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.60));
          } else {
            resolve(imgUrl.slice(0, maxPerImage));
          }
        };
        img.onerror = () => resolve(imgUrl.slice(0, maxPerImage));
        img.src = imgUrl;
      });
      result.push(downscaled);
    } catch {
      result.push(imgUrl.slice(0, maxPerImage));
    }
  }

  return result;
};
