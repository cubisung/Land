import QRCode from 'qrcode';
import { QROptions, QRType, WifiData, EmailData, SmsData, VCardData, VietQRData } from '../types';

/**
 * Removes Vietnamese diacritics and converts to uppercase clean ASCII string.
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s.-]/g, '')
    .trim();
}

/**
 * Calculates CRC16-CCITT (False / Kermit) checksum for EMVCo specifications.
 */
export function calcCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    let c = data.charCodeAt(i);
    crc ^= (c << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates an EMVCo compliant VietQR string for Vietnamese banking apps (NAPAS 247).
 */
export function generateVietQREMVCo(data: VietQRData): string {
  const bankBin = (data.bankBin || '970415').trim(); // Default VietinBank
  const accountNo = (data.accountNo || '').replace(/\s+/g, '').trim();
  const accountName = removeVietnameseAccents(data.accountName || '').toUpperCase();
  const amountStr = data.amount ? String(data.amount).replace(/[^0-9]/g, '') : '';
  const noteStr = data.addInfo ? removeVietnameseAccents(data.addInfo).toUpperCase() : '';

  if (!accountNo) return '';

  const formatLen = (len: number) => String(len).padStart(2, '0');

  // Sub-tag 00 (Acquirer BIN)
  const sub00 = '0006' + bankBin;
  // Sub-tag 01 (Merchant Account No)
  const sub01 = '01' + formatLen(accountNo.length) + accountNo;
  const sub01Content = sub00 + sub01;
  const tag01 = '01' + formatLen(sub01Content.length) + sub01Content;

  // Tag 38 (Merchant Account Info - GUID A000000727)
  const tag38Content = '0010A000000727' + tag01 + '0208QRIBFTTA';
  const tag38 = '38' + formatLen(tag38Content.length) + tag38Content;

  // Point of initiation method (11: static, 12: dynamic with amount)
  const poi = amountStr && parseInt(amountStr, 10) > 0 ? '010212' : '010211';

  let raw = '000201' + poi + tag38 + '5303704';

  // Amount (Tag 54)
  if (amountStr && parseInt(amountStr, 10) > 0) {
    raw += '54' + formatLen(amountStr.length) + amountStr;
  }

  // Country Code (Tag 58)
  raw += '5802VN';

  // Beneficiary Name (Tag 59)
  if (accountName) {
    raw += '59' + formatLen(accountName.length) + accountName;
  }

  // Additional Data Field / Note (Tag 62)
  if (noteStr) {
    const sub08 = '08' + formatLen(noteStr.length) + noteStr;
    raw += '62' + formatLen(sub08.length) + sub08;
  }

  // CRC16 Checksum (Tag 63)
  raw += '6304';
  const crc = calcCRC16(raw);
  return raw + crc;
}

/**
 * Formats structured input data into a standard QR code string.
 */
export function formatQRString(
  type: QRType,
  data: {
    url?: string;
    text?: string;
    wifi?: WifiData;
    phone?: string;
    email?: EmailData;
    sms?: SmsData;
    vcard?: VCardData;
    vietqr?: VietQRData;
  }
): string {
  switch (type) {
    case 'vietqr': {
      if (!data.vietqr) return '';
      return generateVietQREMVCo(data.vietqr);
    }

    case 'url': {
      let raw = (data.url || '').trim();
      if (raw && !/^https?:\/\//i.test(raw) && !/^ftp:\/\//i.test(raw)) {
        raw = 'https://' + raw;
      }
      return raw;
    }
    case 'text':
      return data.text || '';

    case 'wifi': {
      if (!data.wifi) return '';
      const { ssid, password, encryption, hidden } = data.wifi;
      // WIFI:S:SSID;T:WPA;P:PASSWORD;H:true;;
      const enc = encryption || 'WPA';
      const escapeWifi = (str: string) => str.replace(/([\\;:,"])/g, '\\$1');
      let wifiStr = `WIFI:S:${escapeWifi(ssid)};T:${enc};`;
      if (enc !== 'nopass' && password) {
        wifiStr += `P:${escapeWifi(password)};`;
      }
      if (hidden) {
        wifiStr += `H:true;`;
      }
      wifiStr += `;`;
      return wifiStr;
    }

    case 'phone':
      return data.phone ? `tel:${data.phone.trim()}` : '';

    case 'email': {
      if (!data.email || !data.email.address) return '';
      const { address, subject, body } = data.email;
      let url = `mailto:${address.trim()}`;
      const params: string[] = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      return url;
    }

    case 'sms': {
      if (!data.sms || !data.sms.phone) return '';
      const { phone, message } = data.sms;
      let url = `sms:${phone.trim()}`;
      if (message) url += `?body=${encodeURIComponent(message)}`;
      return url;
    }

    case 'vcard': {
      if (!data.vcard) return '';
      const { firstName, lastName, org, title, phone, email, url, address } = data.vcard;
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      const fn = `${lastName} ${firstName}`.trim();
      if (fn) lines.push(`N:${lastName};${firstName};;;`);
      if (fn) lines.push(`FN:${fn}`);
      if (org) lines.push(`ORG:${org}`);
      if (title) lines.push(`TITLE:${title}`);
      if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      if (url) lines.push(`URL:${url}`);
      if (address) lines.push(`ADR:;;${address};;;;`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    default:
      return '';
  }
}

/**
 * Renders a QR code onto a HTMLCanvasElement with custom options, logo, colors, and margins.
 */
export async function renderQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QROptions
): Promise<void> {
  if (!text || text.trim() === '') {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }

  const {
    darkColor,
    lightColor,
    transparentBg,
    errorCorrectionLevel,
    margin,
    size,
    logoUrl,
    logoScale = 0.2,
    logoShape = 'circle',
  } = options;

  const charCount = text.length;

  // 1. Determine optimal Error Correction Level based on content length
  // When a logo is present, error correction MUST be 'H' (High - 30% recovery capacity)
  // For long links, boost error correction so missing bits can be recovered easily by cameras
  let ecl = logoUrl ? 'H' : errorCorrectionLevel;
  if (charCount > 150 && !logoUrl && (ecl === 'L' || ecl === 'M')) {
    ecl = 'Q';
  }

  // 2. High Resolution Canvas Scaling for High Module Density
  // Canvas Resolution Scaling based on user selected option size (e.g. 256, 512, 1024, 2048, 4096)
  const renderSize = size || 512;

  canvas.width = renderSize;
  canvas.height = renderSize;

  // Render base QR Code to canvas using qrcode library
  await QRCode.toCanvas(canvas, text, {
    width: renderSize,
    margin: margin,
    errorCorrectionLevel: ecl as 'L' | 'M' | 'Q' | 'H',
    color: {
      dark: darkColor || '#000000',
      light: transparentBg ? '#00000000' : lightColor || '#ffffff',
    },
  });

  // 3. Logo Overlay Safety Guardrail for Long Text
  // If a center logo is provided, dynamically scale down logo size for long content
  // so the logo does NOT destroy too many central modules or alignment patterns.
  if (logoUrl) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const logoImg = await loadImage(logoUrl);

      // Safe logo scaling based on data density
      let safeLogoScale = logoScale;
      if (charCount > 300) {
        safeLogoScale = Math.min(logoScale, 0.10); // max 10% width for ultra-long links
      } else if (charCount > 150) {
        safeLogoScale = Math.min(logoScale, 0.13); // max 13% width for long links
      } else if (charCount > 80) {
        safeLogoScale = Math.min(logoScale, 0.16); // max 16% width
      }

      const logoSize = renderSize * safeLogoScale;
      const logoX = (renderSize - logoSize) / 2;
      const logoY = (renderSize - logoSize) / 2;

      // Draw background padding for the logo so QR code blocks don't clash with logo details
      const padding = logoSize * 0.12;
      const bgX = logoX - padding;
      const bgY = logoY - padding;
      const bgSize = logoSize + padding * 2;

      ctx.save();
      ctx.fillStyle = transparentBg ? '#ffffff' : lightColor || '#ffffff';

      if (logoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(renderSize / 2, renderSize / 2, bgSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (logoShape === 'rounded') {
        drawRoundedRect(ctx, bgX, bgY, bgSize, bgSize, bgSize * 0.2);
        ctx.fill();
      } else {
        ctx.fillRect(bgX, bgY, bgSize, bgSize);
      }

      // Clip logo if shape is circle or rounded
      ctx.beginPath();
      if (logoShape === 'circle') {
        ctx.arc(renderSize / 2, renderSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      } else if (logoShape === 'rounded') {
        drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, logoSize * 0.2);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      } else {
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      ctx.restore();
    } catch (err) {
      console.warn('Could not render logo on QR code:', err);
    }
  }
}

/**
 * Generates SVG string for the QR code.
 */
export async function generateQRSVG(text: string, options: QROptions): Promise<string> {
  const { darkColor, lightColor, transparentBg, errorCorrectionLevel, margin, size } = options;
  const charCount = text.length;
  let ecl = options.logoUrl ? 'H' : errorCorrectionLevel;
  if (charCount > 150 && !options.logoUrl && (ecl === 'L' || ecl === 'M')) {
    ecl = 'Q';
  }
  return QRCode.toString(text, {
    type: 'svg',
    width: size,
    margin: margin,
    errorCorrectionLevel: ecl as 'L' | 'M' | 'Q' | 'H',
    color: {
      dark: darkColor || '#000000',
      light: transparentBg ? '#00000000' : lightColor || '#ffffff',
    },
  });
}

/**
 * Downloads canvas content as an image file.
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename = 'qr-code.png',
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
) {
  const dataUrl = canvas.toDataURL(format, 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads SVG content as file.
 */
export function downloadSVG(svgString: string, filename = 'qr-code.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies canvas image to clipboard if supported by browser.
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob,
            }),
          ]);
          resolve(true);
        } catch (e) {
          console.error('Clipboard write failed:', e);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Clipboard error:', err);
    return false;
  }
}

// Helper: load image safely
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Helper: draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
