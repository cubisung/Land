import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  senderEmail?: string;
  replyTo?: string;
  subject: string;
  message: string;
  htmlContent?: string;
  attachedImages?: { name: string; url: string }[];
  attachedDocuments?: { name: string; url: string; size: number; type: string }[];
  qrCid?: string;
  qrDataUrl?: string;
}

function buildHtml({
  subject,
  message,
  attachedImages,
  attachedDocuments,
  qrCid,
}: EmailOptions) {
  const assetTitle = subject || 'Thông tin Bất động sản & Mã QR';

  const imagesHtml =
    attachedImages && attachedImages.length > 0
      ? `
      <div style="margin-top:20px;">
        <p style="font-weight:bold;color:#1e293b;margin-bottom:10px;">📷 Hình ảnh thực tế đính kèm (${attachedImages.length} ảnh):</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${attachedImages
            .map(
              (img) => `
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:4px;background:#ffffff;">
              <img src="${img.url}" alt="Ảnh tài sản" style="max-width:180px;max-height:120px;object-fit:cover;border-radius:6px;display:block;" />
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      : '';

  const documentsHtml =
    attachedDocuments && attachedDocuments.length > 0
      ? `
      <div style="margin-top:20px;">
        <p style="font-weight:bold;color:#1e293b;margin-bottom:10px;">📋 Hồ sơ tài liệu & File PDF đính kèm (${attachedDocuments.length} tệp):</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${attachedDocuments
            .map(
              (doc) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;background:#f8fafc;font-size:13px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:bold;color:#0f172a;">${doc.name}</span>
            <a href="${doc.url}" style="color:#00529C;font-weight:bold;text-decoration:none;">Tải / Xem tệp ➔</a>
          </div>
        `
            )
            .join('')}
        </div>
      </div>
    `
      : '';

  const qrSection = qrCid
    ? `
    <div style="margin-top:20px;">
      <p style="font-weight:bold;color:#1e293b;margin-bottom:10px;">Mã QR:</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc;text-align:center;">
        <img src="cid:${qrCid}" alt="Mã QR" style="max-width:220px;height:auto;display:block;margin:0 auto;" />
        <p style="font-size:12px;color:#64748b;margin-top:8px;">Quét mã QR để xem thông tin tài sản.</p>
      </div>
    </div>
  `
    : '';

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" style="max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:#00529C;">
              <h1 style="margin:0;font-size:20px;color:#ffffff;">${assetTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <div style="font-size:15px;line-height:1.6;color:#0f172a;">
                ${message}
              </div>
              ${imagesHtml}
              ${documentsHtml}
              ${qrSection}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:18px;">
              Thông báo tự động từ hệ thống định giá QR.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

let resendClient: ReturnType<typeof Resend> | null = null;

export function getResendClient() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      resendClient = new Resend(key);
    }
  }
  return resendClient;
}

export async function sendEmailWithResend(opts: EmailOptions) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not set, so email sending is unavailable.');
  }

  const from =
    opts.senderEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.senderEmail)
      ? opts.senderEmail
      : 'Pricing QR <onboarding@resend.dev>';

  const attachments: Parameters<typeof resend.emails.send>[0]['attachments'] = [];

  if (opts.qrDataUrl && opts.qrCid && opts.qrDataUrl.startsWith('data:image/')) {
    const match = opts.qrDataUrl.match(/^data:([A-Za-z-+/\s]+);base64,(.+)$/);
    if (match) {
      attachments.push({
        filename: `QR_${assetTitleToFilename(opts.subject)}.png`,
        content: match[2],
        contentType: match[1] || 'image/png',
        content_id: opts.qrCid,
      });
    }
  }

  if (opts.attachedDocuments) {
    for (const doc of opts.attachedDocuments) {
      attachments.push({
        filename: doc.name,
        content: `remote:${doc.url}`,
        content_type: doc.type,
      });
    }
  }

  return resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.htmlContent || buildHtml(opts),
    replyTo: opts.replyTo,
    attachments,
  });
}

function assetTitleToFilename(subject?: string) {
  return (subject || 'Thong tin bat dong san').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) || 'QR';
}

export async function sendEmailFallback(opts: EmailOptions) {
  const nodemailer = await import('nodemailer');
  const { createTransport } = nodemailer;

  let transporter: ReturnType<typeof createTransport>;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    } catch (err) {
      transporter = createTransport({ jsonTransport: true });
    }
  }

  const attachments = [];

  if (opts.qrDataUrl && opts.qrCid && opts.qrDataUrl.startsWith('data:image/')) {
    const match = opts.qrDataUrl.match(/^data:([A-Za-z-+/\s]+);base64,(.+)$/);
    if (match) {
      attachments.push({
        filename: `QR_${assetTitleToFilename(opts.subject)}.png`,
        content: Buffer.from(match[2], 'base64'),
        contentType: match[1] || 'image/png',
        cid: opts.qrCid,
      });
    }
  }

  if (opts.attachedDocuments) {
    for (const doc of opts.attachedDocuments) {
      attachments.push({
        filename: doc.name,
        path: doc.url.startsWith('http')
          ? doc.url
          : `http://localhost:${process.env.PORT || 3000}${doc.url}`,
        contentType: doc.type,
      });
    }
  }

  return transporter.sendMail({
    from:
      opts.senderEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.senderEmail)
        ? opts.senderEmail
        : 'Pricing QR <noreply@example.com>',
    to: opts.to,
    subject: opts.subject,
    text: opts.message,
    html: opts.htmlContent || buildHtml(opts),
    attachments,
  });
}

export type { EmailOptions };
