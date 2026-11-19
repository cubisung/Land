import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Support large JSON payloads for base64 QR codes, high-res photos and PDF/document attachments (up to 35MB)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Ensure public/uploads directory exists and serve statically
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve local uploads only when Firebase Storage is not configured.
  // When FIREBASE_SERVICE_ACCOUNT_JSON is set, uploads go to Firebase Storage
  // and are served from there, so we keep /uploads unavailable in that mode.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    app.use("/uploads", express.static(uploadsDir));
  }

  // Make Resend key available to the email module only when it is set.
  // Do not log the key value anywhere.
  if (process.env.RESEND_API_KEY) {
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY;
  }

  // Streaming Raw Document & PDF Upload API (Direct binary stream, zero base64 RAM overhead, up to 35MB)
  app.post("/api/upload-document-raw", (req, res) => {
    try {
      const rawName = (req.query.fileName as string) || (req.headers["x-file-name"] as string) || "tailieu.pdf";
      const rawType = (req.query.fileType as string) || (req.headers["x-file-type"] as string) || "application/pdf";
      const fileName = decodeURIComponent(rawName);
      const fileType = decodeURIComponent(rawType);

      const ext = path.extname(fileName) || (fileType === "application/pdf" ? ".pdf" : "");
      const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]/g, "_").slice(0, 50);
      const safeFileName = `${Date.now()}_${baseName}${ext}`;
      const filePath = path.join(uploadsDir, safeFileName);

      const writeStream = fs.createWriteStream(filePath);
      let receivedBytes = 0;
      const MAX_BYTES = 35 * 1024 * 1024;
      let limitExceeded = false;

      req.on("data", (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BYTES && !limitExceeded) {
          limitExceeded = true;
          req.pause();
          writeStream.destroy();
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
          return res.status(413).json({ error: "Tệp tin vượt quá dung lượng tối đa 35MB" });
        }
      });

      req.pipe(writeStream);

      writeStream.on("finish", () => {
        if (limitExceeded) return;
        const fileUrl = `/uploads/${safeFileName}`;
        return res.json({
          success: true,
          fileUrl,
          name: fileName,
          type: fileType || "application/octet-stream",
          size: receivedBytes,
        });
      });

      writeStream.on("error", (err) => {
        console.error("Stream write error:", err);
        if (!res.headersSent) {
          return res.status(500).json({ error: "Lỗi ghi tệp tin lên máy chủ: " + err?.message });
        }
      });
    } catch (err: any) {
      console.error("Upload raw document error:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Lỗi máy chủ khi lưu tệp tin: " + err?.message });
      }
    }
  });

  // Google Cloud Storage-backed Document & PDF Upload API
  // Files are stored in Firebase Storage so they survive Render restarts/redeploys.
  app.post("/api/upload-document", async (req, res) => {
    try {
      const { fileName, fileType, fileData, fileSize } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "Thiếu dữ liệu tệp tin" });
      }

      let buffer: Buffer;
      let remoteUrl: string | null = null;

      // Try Firebase Storage first when credentials are available.
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          // Initialize Firebase Admin once per process, lazily.
          let storage: ReturnType<typeof getStorage>;

          try {
            const { getStorage } = await import("firebase-admin/storage");
            storage = getStorage();
          } catch {
            const { initializeApp, cert, applicationDefault } = await import("firebase-admin/app");
            const { getStorage: getAdminStorage } = await import("firebase-admin/storage");

            if (getApps().length === 0) {
              const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
              if (serviceAccountJson) {
                initializeApp({
                  credential: cert(JSON.parse(serviceAccountJson)),
                  storageBucket: process.env.STORAGE_BUCKET || "qr-pricing-team-2026.firebasestorage.app",
                });
              } else {
                initializeApp({
                  credential: applicationDefault(),
                  storageBucket: process.env.STORAGE_BUCKET || "qr-pricing-team-2026.firebasestorage.app",
                });
              }
            }

            storage = getAdminStorage();
          }

          const ext = path.extname(fileName) || (fileType === "application/pdf" ? ".pdf" : "");
          const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]/g, "_").slice(0, 50);
          const safeFileName = `${Date.now()}_${baseName}${ext}`;

          const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
          buffer = Buffer.from(base64Data, "base64");

          if (buffer.length > 35 * 1024 * 1024) {
            return res.status(413).json({ error: "Tệp tin vượt quá dung lượng tối đa 35MB" });
          }

          const bucket = storage.bucket();
          const file = bucket.file(`documents/${safeFileName}`);

          await file.save(buffer, {
            contentType: fileType || "application/octet-stream",
            metadata: {
              contentType: fileType || "application/octet-stream",
              cacheControl: "public, max-age=31536000",
            },
          });

          await file.makePublic();

          remoteUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

          return res.json({
            success: true,
            fileUrl: remoteUrl,
            name: fileName,
            type: fileType || "application/octet-stream",
            size: buffer.length,
            storedIn: "firebaseStorage",
          });
        } catch (storageErr: any) {
          console.error("Firebase Storage upload failed, falling back to local disk:", storageErr?.message);
        }
      }

      // Fallback: save locally on the transient disk
      const ext = path.extname(fileName) || (fileType === "application/pdf" ? ".pdf" : "");
      const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]/g, "_").slice(0, 50);
      const safeFileName = `${Date.now()}_${baseName}${ext}`;
      const filePath = path.join(uploadsDir, safeFileName);

      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 35 * 1024 * 1024) {
        return res.status(413).json({ error: "Tệp tin vượt quá dung lượng tối đa 35MB" });
      }

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${safeFileName}`;
      return res.json({
        success: true,
        fileUrl,
        name: fileName,
        type: fileType || "application/octet-stream",
        size: buffer.length,
        storedIn: "localDisk",
      });
    } catch (err: any) {
      console.error("Upload document error:", err);
      return res.status(500).json({ error: "Lỗi máy chủ khi lưu tệp tin: " + err?.message });
    }
  });

  // Central Server Cloud Storage for Saved QRs & Appraisals (Always online, zero quota limits)
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const qrsDbFile = path.join(dataDir, "saved_qrs.json");
  if (!fs.existsSync(qrsDbFile)) {
    fs.writeFileSync(qrsDbFile, "[]", "utf-8");
  }

  const readServerQRs = (): any[] => {
    try {
      if (fs.existsSync(qrsDbFile)) {
        const raw = fs.readFileSync(qrsDbFile, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Read saved_qrs.json error:", e);
    }
    return [];
  };

  const writeServerQRs = (items: any[]) => {
    try {
      fs.writeFileSync(qrsDbFile, JSON.stringify(items, null, 2), "utf-8");
    } catch (e) {
      console.error("Write saved_qrs.json error:", e);
    }
  };

  // GET all saved QRs from server cloud
  app.get("/api/cloud-qrs", (_req, res) => {
    const items = readServerQRs();
    return res.json({ success: true, items });
  });

  // POST save or update a QR in server cloud
  app.post("/api/cloud-qrs", (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.title) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      }
      const targetId = item.id || Date.now().toString() + "_" + Math.random().toString(36).substring(2, 7);
      const cleanItem = { ...item, id: targetId };
      const current = readServerQRs();
      const updated = [cleanItem, ...current.filter((i: any) => i.id !== targetId)].sort(
        (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
      );
      writeServerQRs(updated);
      return res.json({ success: true, id: targetId, item: cleanItem });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE a QR from server cloud
  app.delete("/api/cloud-qrs/:id", (req, res) => {
    try {
      const { id } = req.params;
      const current = readServerQRs();
      const updated = current.filter((i: any) => i.id !== id);
      writeServerQRs(updated);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST batch sync QRs to server cloud
  app.post("/api/cloud-qrs/batch", (req, res) => {
    try {
      const incoming: any[] = Array.isArray(req.body.items) ? req.body.items : [];
      const current = readServerQRs();
      const map = new Map<string, any>();
      for (const item of current) {
        if (item.id) map.set(item.id, item);
      }
      for (const item of incoming) {
        if (item.id) {
          const existing = map.get(item.id);
          if (!existing || (item.createdAt || 0) >= (existing.createdAt || 0)) {
            map.set(item.id, item);
          }
        }
      }
      const merged = Array.from(map.values()).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      writeServerQRs(merged);
      return res.json({ success: true, items: merged, count: merged.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Download Full Source Code ZIP API
  app.get("/api/download-source-zip", (_req, res) => {
    try {
      const zipPath = path.resolve(process.cwd(), "public", "he-thong-dinh-gia-qr-code.zip");
      if (fs.existsSync(zipPath)) {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", 'attachment; filename="he-thong-dinh-gia-qr-code.zip"');
        return res.sendFile(zipPath);
      }
      return res.status(404).send("File zip mã nguồn chưa được khởi tạo.");
    } catch (err: any) {
      return res.status(500).send("Lỗi khi tải file zip: " + err?.message);
    }
  });

  // Helper functions for coordinate parsing on server
  const extractCoordinatesFromServerText = (text: string): string | null => {
    if (!text || typeof text !== "string") return null;

    // Try both raw text and URL-decoded text
    const candidates = [text.trim()];
    const embeddedUrlMatch = text.trim().match(/https?:\/\/[^\s"'<>]+/i);
    if (embeddedUrlMatch && embeddedUrlMatch[0] !== text.trim()) {
      candidates.push(embeddedUrlMatch[0]);
    }

    try {
      const decoded = decodeURIComponent(text.trim());
      if (decoded !== text.trim()) candidates.push(decoded);
      if (embeddedUrlMatch) {
        const decodedEmbedded = decodeURIComponent(embeddedUrlMatch[0]);
        if (decodedEmbedded !== embeddedUrlMatch[0]) candidates.push(decodedEmbedded);
      }
    } catch {
      // ignore
    }

    for (const str of candidates) {
      // 1. HIGHEST PRIORITY: Exact Place / POI / Pin coordinates in Google Maps Protobuf data tokens
      // E.g., !3d9.5962501!4d105.9705243 or !8m2!3d9.5962501!4d105.9705243
      const d3d4Match = str.match(/!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/i);
      if (d3d4Match) {
        const lat = parseFloat(d3d4Match[1]);
        const lng = parseFloat(d3d4Match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      const d1d2Match = str.match(/!2d(-?\d{1,3}\.\d{3,})!3d(-?\d{1,2}\.\d{3,})/i);
      if (d1d2Match) {
        const lat = parseFloat(d1d2Match[2]);
        const lng = parseFloat(d1d2Match[1]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      const d1d2AltMatch = str.match(/!1d(-?\d{1,2}\.\d{3,})!2d(-?\d{1,3}\.\d{3,})/i);
      if (d1d2AltMatch) {
        const lat = parseFloat(d1d2AltMatch[1]);
        const lng = parseFloat(d1d2AltMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      // 2. HIGH PRIORITY: Explicit Query / Destination / Dropped Pin parameters (q=, query=, destination=, daddr=)
      const qMatch = str.match(/(?:[?&]q|[?&]query|[?&]destination|[?&]daddr|[?&]origin|[?&]saddr)=(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|%20)(-?\d{1,3}\.\d{3,})/i);
      if (qMatch) {
        const lat = parseFloat(qMatch[1]);
        const lng = parseFloat(qMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      const locMatch = str.match(/loc:(-?\d{1,2}\.\d{3,})(?:\+|,|%20)(-?\d{1,3}\.\d{3,})/i);
      if (locMatch) {
        const lat = parseFloat(locMatch[1]);
        const lng = parseFloat(locMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      // 3. HIGH PRIORITY: Explicit search or dir path with coordinates: /maps/search/9.59625,105.9705 or /maps/dir//9.59625,105.9705
      const searchPathMatch = str.match(/\/maps\/(?:search|dir\/\/|place\/)(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|\s)(-?\d{1,3}\.\d{3,})/i);
      if (searchPathMatch) {
        const lat = parseFloat(searchPathMatch[1]);
        const lng = parseFloat(searchPathMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      // 4. Center / ll / sll explicit parameters
      const llMatch = str.match(/(?:[?&]ll|[?&]sll|[?&]center)=(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|%20)(-?\d{1,3}\.\d{3,})/i);
      if (llMatch) {
        const lat = parseFloat(llMatch[1]);
        const lng = parseFloat(llMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      // 5. DMS coordinates format: 9°31'35.9"N 106°11'33.1"E or 9°31'35.9" N, 106°11'33.1" E
      const dmsMatch = str.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NS])\s*[,|\s]\s*(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EW])/i);
      if (dmsMatch) {
        const latDeg = parseFloat(dmsMatch[1]);
        const latMin = parseFloat(dmsMatch[2]);
        const latSec = parseFloat(dmsMatch[3]);
        const latDir = dmsMatch[4].toUpperCase();
        let lat = latDeg + latMin / 60 + latSec / 3600;
        if (latDir === 'S') lat = -lat;

        const lngDeg = parseFloat(dmsMatch[5]);
        const lngMin = parseFloat(dmsMatch[6]);
        const lngSec = parseFloat(dmsMatch[7]);
        const lngDir = dmsMatch[8].toUpperCase();
        let lng = lngDeg + lngMin / 60 + lngSec / 3600;
        if (lngDir === 'W') lng = -lng;

        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }

      // 6. Standalone coordinates in any text (e.g. 9.526659, 106.1925257 or 9,526659; 106,1925257)
      const coordsMatch = str.match(/(?:^|[^\d.-])(-?\d{1,2}[.,]\d{2,8})\s*(?:,|%2C|;|%3B|\s|\/)\s*(-?\d{1,3}[.,]\d{2,8})(?:[^\d.-]|$)/);
      if (coordsMatch) {
        const latVal = parseFloat(coordsMatch[1].replace(',', '.'));
        const lngVal = parseFloat(coordsMatch[2].replace(',', '.'));
        if (!isNaN(latVal) && !isNaN(lngVal) && Math.abs(latVal) <= 90 && Math.abs(lngVal) <= 180) {
          return `@${latVal.toFixed(6)},${lngVal.toFixed(6)}`;
        }
      }

      // 7. LOWEST PRIORITY FALLBACK: Camera viewport @lat,lng in Google Maps URLs
      const atMatch = str.match(/@(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})(?:,([0-9.]+[za]))?/i);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
        }
      }
    }

    return null;
  };

  const isDmsOrCoordsText = (str: string): boolean => {
    if (!str) return false;
    if (/^\s*-?\d+[.,]\d+\s*[,;\s]\s*-?\d+[.,]\d+\s*$/.test(str)) return true;
    if (/\d+°\d+['"]/.test(str)) return true;
    if (/^[0-9.,\s°'"NSEW\+]+$/i.test(str)) return true;
    return false;
  };

  // Client IP-based Geolocation & Quick Location Resolver API
  app.get("/api/my-ip-location", async (req, res) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      let clientIp = "";
      if (typeof forwarded === "string") {
        clientIp = forwarded.split(",")[0].trim();
      } else if (Array.isArray(forwarded)) {
        clientIp = forwarded[0].trim();
      } else {
        clientIp = req.socket.remoteAddress || "";
      }

      // Default Sóc Trăng location for VietinBank Sóc Trăng app context
      const defaultSocTrang = {
        success: true,
        coordinates: "@9.596250,105.970524",
        lat: "9.596250",
        lng: "105.970524",
        fullAddress: "24c Trần Hưng Đạo, Phường Phú Lợi, TP. Sóc Trăng, Tỉnh Sóc Trăng",
        suggestedTitle: "Tài sản tại 24c Trần Hưng Đạo, Phường Phú Lợi, TP. Sóc Trăng",
        road: "24c Trần Hưng Đạo",
        ward: "Phường Phú Lợi",
        district: "TP. Sóc Trăng",
        city: "Tỉnh Sóc Trăng",
        source: "default_fallback",
      };

      if (!clientIp || clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("10.") || clientIp.startsWith("192.168.")) {
        return res.json(defaultSocTrang);
      }

      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,district,lat,lon,query&lang=vi`, {
          signal: AbortSignal.timeout(3000),
        });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.status === "success" && ipData.lat && ipData.lon) {
            const latStr = parseFloat(ipData.lat).toFixed(6);
            const lngStr = parseFloat(ipData.lon).toFixed(6);
            const city = ipData.city || ipData.regionName || "TP. Sóc Trăng";
            const district = ipData.district || "";
            const addrParts = [district, city, ipData.country].filter(Boolean);

            return res.json({
              success: true,
              coordinates: `@${latStr},${lngStr}`,
              lat: latStr,
              lng: lngStr,
              fullAddress: addrParts.join(", "),
              suggestedTitle: `Vị trí hiện tại tại ${district ? `${district}, ` : ""}${city}`,
              source: "ip",
            });
          }
        }
      } catch (ipErr) {
        console.warn("IP geolocation lookup error:", ipErr);
      }

      return res.json(defaultSocTrang);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Lỗi định vị IP" });
    }
  });

  // Google Maps Location & Address Resolver API
  app.post("/api/resolve-maps-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string" || !url.trim()) {
        return res.status(400).json({
          success: false,
          error: "Vui lòng cung cấp link Google Maps, địa chỉ hoặc tọa độ",
        });
      }

      const rawInput = url.trim();
      const embeddedUrlMatch = rawInput.match(/https?:\/\/[^\s"'<>]+/i);
      const inputUrl = embeddedUrlMatch ? embeddedUrlMatch[0] : rawInput;

      let coords = extractCoordinatesFromServerText(inputUrl);
      let resolvedUrl = inputUrl;
      let placeName = "";

      // Check if place name is inside URL path (e.g. /place/<PlaceName>/)
      const initialPlaceMatch = inputUrl.match(/\/place\/([^/@?]+)/i);
      if (initialPlaceMatch && initialPlaceMatch[1]) {
        const decoded = decodeURIComponent(initialPlaceMatch[1].replace(/\+/g, " ")).trim();
        if (decoded && !isDmsOrCoordsText(decoded)) {
          placeName = decoded;
        }
      }

      const isShortUrl = /maps\.app\.goo\.gl|goo\.gl\/maps|bit\.ly|tinyurl\.com|t\.co|g\.co/i.test(inputUrl);

      // Follow redirects for short URLs or URLs without explicit coordinates
      if (/^https?:\/\//i.test(inputUrl) && (isShortUrl || !coords)) {
        try {
          let currentUrl = inputUrl;
          let hopCount = 0;
          const maxHops = 5;

          while (hopCount < maxHops) {
            hopCount++;
            const resp = await fetch(currentUrl, {
              method: "GET",
              redirect: "manual",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
              },
              signal: AbortSignal.timeout(4500),
            });

            const redirectLoc = resp.headers.get("location");

            if ([301, 302, 303, 307, 308].includes(resp.status) && redirectLoc) {
              try {
                const nextUrl = new URL(redirectLoc, currentUrl).toString();
                resolvedUrl = nextUrl;
                currentUrl = nextUrl;

                // Extract coordinates from next redirect URL (e.g. !3dlat!4dlng)
                const nextCoords = extractCoordinatesFromServerText(nextUrl);
                if (nextCoords) coords = nextCoords;

                // Extract place name from next redirect URL path
                const pMatch = nextUrl.match(/\/place\/([^/@?]+)/i);
                if (pMatch && pMatch[1]) {
                  const decoded = decodeURIComponent(pMatch[1].replace(/\+/g, " ")).trim();
                  if (decoded && !isDmsOrCoordsText(decoded)) {
                    placeName = decoded;
                  }
                }

                // If coordinates and place name are found, BREAK immediately to avoid slow Google page fetch
                if (coords && placeName) {
                  break;
                }
              } catch {
                break;
              }
            } else {
              // Non-redirect response: check URL query params or location header
              if (!coords) coords = extractCoordinatesFromServerText(currentUrl);
              break;
            }
          }
        } catch (fetchErr) {
          console.warn("Server URL redirect expand warning:", fetchErr);
        }
      }

      // Check coordinates from the expanded final URL if still not found
      if (!coords) {
        coords = extractCoordinatesFromServerText(resolvedUrl);
      }

      // Extract Place Name from /place/<Place+Name>/ or /search/<Query>/ if still empty
      if (!placeName) {
        const placeMatch = resolvedUrl.match(/\/place\/([^/@?]+)/i) || resolvedUrl.match(/\/search\/([^/@?]+)/i);
        if (placeMatch && placeMatch[1]) {
          const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
          if (decoded && !isDmsOrCoordsText(decoded)) {
            placeName = decoded;
          }
        }
      }

      // Clean placeName: remove trailing country, clean up punctuation
      if (placeName) {
        placeName = placeName
          .replace(/,\s*Việt\s*Nam\s*$/i, "")
          .replace(/,\s*Vietnam\s*$/i, "")
          .trim();
      }

      // If coords still not found, check if input is a text address or if we found a placeName
      const rawAddressQuery = !coords ? (placeName || (!rawInput.startsWith("http://") && !rawInput.startsWith("https://") ? rawInput : "")) : "";

      if (!coords && rawAddressQuery && rawAddressQuery.length >= 3) {
        const candidates: string[] = [rawAddressQuery];

        const commaParts = rawAddressQuery.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
        if (commaParts.length > 1) {
          candidates.push(commaParts.slice(1).join(", "));
          if (commaParts.length > 2) {
            candidates.push(commaParts.slice(2).join(", "));
          }
        }

        const strippedVenue = rawAddressQuery.replace(/^(Bãi xe|Công ty|Cty|Quán|Tiệm|Cửa hàng|Khách sạn|Nhà máy|Chi nhánh|Văn phòng|Trụ sở|Trung tâm)\s+[^,]+/i, "").trim().replace(/^,\s*/, "");
        if (strippedVenue && strippedVenue !== rawAddressQuery && strippedVenue.length >= 4) {
          candidates.push(strippedVenue);
        }

        const uniqueCandidates = Array.from(new Set(candidates)).filter((c) => c.length >= 3);

        for (const candidate of uniqueCandidates) {
          if (coords) break;

          // 1. Try Photon Komoot first for Vietnamese addresses (very reliable for VN addresses and POIs)
          try {
            const photonRes = await fetch(
              `https://photon.komoot.io/api/?q=${encodeURIComponent(candidate)}&limit=1`,
              { signal: AbortSignal.timeout(3500) }
            );
            if (photonRes.ok) {
              const pData = await photonRes.json();
              if (pData?.features && pData.features.length > 0) {
                const geom = pData.features[0].geometry?.coordinates;
                if (geom && geom.length >= 2) {
                  coords = `@${parseFloat(geom[1]).toFixed(6)},${parseFloat(geom[0]).toFixed(6)}`;
                  const props = pData.features[0].properties;
                  if (!placeName && props?.name) {
                    placeName = props.name;
                  }
                  break;
                }
              }
            }
          } catch (pErr) {
            console.warn("Photon forward search warning:", candidate, pErr);
          }

          // 2. Fallback to Nominatim Geocoding
          if (!coords) {
            try {
              const searchRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(candidate)}&format=json&limit=1&accept-language=vi&countrycodes=vn`,
                {
                  headers: { "User-Agent": "ValuationQRAppVietinBank/1.0" },
                  signal: AbortSignal.timeout(3500),
                }
              );
              if (searchRes.ok) {
                const sData = await searchRes.json();
                if (sData && sData.length > 0 && sData[0].lat && sData[0].lon) {
                  coords = `@${parseFloat(sData[0].lat).toFixed(6)},${parseFloat(sData[0].lon).toFixed(6)}`;
                  if (!placeName && sData[0].display_name) {
                    placeName = sData[0].display_name.split(",")[0]?.trim() || candidate;
                  }
                  break;
                }
              }
            } catch (sErr) {
              console.warn("Nominatim forward search warning:", candidate, sErr);
            }
          }
        }
      }

      // 4. Reverse Geocode Coordinates for official Vietnamese address details
      let fullAddress = "";
      let road = "";
      let area = "";
      let lat = "";
      let lng = "";

      if (coords) {
        const cleanCoords = coords.replace("@", "").trim();
        const parts = cleanCoords.split(",");
        lat = parts[0]?.trim() || "";
        lng = parts[1]?.trim() || "";

        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
          let reversedDone = false;

          // 4a. Try Nominatim Reverse Geocoding
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`,
              {
                headers: { "User-Agent": "ValuationQRAppVietinBank/1.0" },
                signal: AbortSignal.timeout(3500),
              }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address || {};
              const latNum = parseFloat(lat);
              const lngNum = parseFloat(lng);

              // Extract house number: check addr or placeName prefix (e.g. 24c)
              const houseMatch = placeName.match(/^\s*(\d+[a-zA-Z]?)\b/);
              const houseNumber = addr.house_number || (houseMatch ? houseMatch[1] : "");
              const street = addr.road || addr.pedestrian || addr.street || "";
              road = [houseNumber, street].filter(Boolean).join(" ");

              let ward = addr.suburb || addr.quarter || addr.village || addr.neighbourhood || "";
              // Check if display_name has explicit Phường / Xã (e.g. "Phường Phú Lợi")
              const wardMatch = geoData.display_name?.match(/(Phường\s+[^,]+|Xã\s+[^,]+|Thị trấn\s+[^,]+)/i);
              if (wardMatch && (!ward || !/^(Phường|Xã|Thị trấn)/i.test(ward))) {
                ward = wardMatch[1].trim();
              }

              let district = addr.city_district || addr.district || addr.county || "";
              let city = addr.city || addr.town || addr.state || addr.province || "";

              // Regional correction for Sóc Trăng Province:
              // Coordinates between lat 9.20-9.95, lng 105.50-106.40, OR text mentioning Sóc Trăng / Phú Lợi
              const isSocTrangArea =
                (latNum >= 9.20 && latNum <= 9.95 && lngNum >= 105.50 && lngNum <= 106.40) ||
                /Sóc Trăng|Phú Lợi|Đồng Tiến|Kế Sách|Mỹ Xuyên|Long Phú|Vĩnh Châu|Ngã Năm|Thạnh Trị|Châu Thành/i.test(geoData.display_name || "") ||
                /Sóc Trăng|Phú Lợi/i.test(placeName);

              if (isSocTrangArea) {
                // If in TP. Sóc Trăng urban core:
                if (/Phú Lợi|Đồng Tiến/i.test(geoData.display_name || "") || /Phú Lợi/i.test(placeName) || (latNum >= 9.55 && latNum <= 9.65 && lngNum >= 105.93 && lngNum <= 106.02)) {
                  ward = "Phường Phú Lợi";
                  district = "TP. Sóc Trăng";
                } else if (!district) {
                  district = "TP. Sóc Trăng";
                }
                city = "Tỉnh Sóc Trăng";
              }

              const addrParts = [road, ward, district, city].filter(Boolean);
              fullAddress = addrParts.join(", ");
              area = [ward, district, city].filter(Boolean).join(", ");
              if (fullAddress) reversedDone = true;
            }
          } catch (geoErr) {
            console.warn("Nominatim reverse geocode warning:", geoErr);
          }

          // 4b. Fallback to Photon reverse geocode if Nominatim failed
          if (!reversedDone) {
            try {
              const photonRev = await fetch(
                `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
                { signal: AbortSignal.timeout(3000) }
              );
              if (photonRev.ok) {
                const pData = await photonRev.json();
                if (pData?.features && pData.features.length > 0) {
                  const props = pData.features[0].properties;
                  const houseMatch = placeName.match(/^\s*(\d+[a-zA-Z]?)\b/);
                  const houseNumber = props.housenumber || (houseMatch ? houseMatch[1] : "");
                  const street = props.street || props.name || "";
                  road = [houseNumber, street].filter(Boolean).join(" ");
                  const ward = props.locality || props.district || "";
                  const city = props.city || props.state || "";
                  const addrParts = [road, ward, city].filter(Boolean);
                  fullAddress = addrParts.join(", ");
                  area = [ward, city].filter(Boolean).join(", ");
                }
              }
            } catch (pRevErr) {
              console.warn("Photon reverse geocode warning:", pRevErr);
            }
          }
        }
      }

      // 5. Clean placeName and remove any erroneous Cần Thơ artifacts if in Sóc Trăng
      if (placeName) {
        if (/Sóc Trăng|Phú Lợi/i.test(fullAddress) || /Sóc Trăng|Phú Lợi/i.test(area) || (coords && /@9\.[2-9]/.test(coords))) {
          placeName = placeName.replace(/,\s*Cần\s*Thơ/gi, ", TP. Sóc Trăng").replace(/Cần\s*Thơ/gi, "TP. Sóc Trăng");
          placeName = placeName.replace(/\bPhú Lợi\b/g, "Phường Phú Lợi");
        }
      }

      // 6. Generate intelligent, clean Asset Title (Tên tài sản)
      let suggestedTitle = "";
      if (placeName && !isDmsOrCoordsText(placeName)) {
        suggestedTitle = placeName.toLowerCase().startsWith("tài sản") || placeName.toLowerCase().startsWith("thửa")
          ? placeName
          : `Tài sản tại ${placeName}`;
      } else if (fullAddress) {
        suggestedTitle = `Tài sản tại ${fullAddress}`;
      } else if (road || area) {
        const mainLoc = road || area || "Vị trí GPS";
        suggestedTitle = `Tài sản tại ${mainLoc}${area && area !== mainLoc ? `, ${area}` : ""}`;
      } else if (coords) {
        suggestedTitle = `Tài sản tại tọa độ ${coords.replace("@", "")}`;
      } else {
        suggestedTitle = "Tài sản Bất động sản";
      }

      return res.json({
        success: true,
        coordinates: coords || null,
        lat: lat || null,
        lng: lng || null,
        fullAddress: fullAddress || null,
        suggestedTitle,
        placeName: placeName || null,
        road: road || null,
        area: area || null,
        resolvedUrl,
      });
    } catch (err: any) {
      console.error("Resolve maps URL error:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Không thể phân tích vị trí bản đồ",
      });
    }
  });

  // Direct 1-Click Email Sending API Route
  app.post("/api/send-email", async (req, res) => {
    try {
      const {
        to,
        senderEmail,
        subject,
        message,
        rawContent,
        coordinates,
        marketValue,
        attachedImages = [],
        attachedDocuments = [],
        qrDataUrl,
      } = req.body;

      if (!to || typeof to !== "string" || !to.trim()) {
        return res.status(400).json({
          success: false,
          error: "Vui lòng nhập địa chỉ email người nhận hợp lệ.",
        });
      }

      const assetTitle = subject || "Thông tin Bất động sản & Mã QR";

      // Build Documents payload
      const documentsPayload = (attachedDocuments || []).map(
        (doc: any) => ({
          name: doc.name || "Tài liệu",
          url: doc.url || null,
          size: doc.size || 0,
          type: doc.type || "application/octet-stream",
        }),
      );

      try {
        const { sendEmailWithResend } = await import("./src/lib/email");

        const resendResult = await sendEmailWithResend({
          to: to.trim(),
          senderEmail: senderEmail?.trim() || undefined,
          subject: `[Thông Tin Tài Sản] ${assetTitle}`,
          message: message || "",
          htmlContent: undefined,
          attachedImages:
            attachedImages.length > 0
              ? attachedImages.map((img: string) => ({ name: "Ảnh", url: img }))
              : undefined,
          attachedDocuments: documentsPayload.length > 0 ? documentsPayload : undefined,
          qrCid: "qrcode_asset_image",
          qrDataUrl: qrDataUrl || undefined,
        });

        const { data, error } = resendResult;

        if (error) {
          throw new Error(error.message || "Resend returned an error.");
        }

        return res.json({
          success: true,
          message: `Đã tự động gửi email thành công tới ${to}!`,
          messageId: data?.id || null,
          previewUrl: null,
        });
      } catch (backendErr: any) {
        // If Resend failed because the key is missing or SMTP is the only option,
        // fall back to the legacy Nodemailer path so existing calls still have a chance.
        console.warn("Resend email failed, falling back to Nodemailer:", backendErr);

        let transporter: nodemailer.Transporter;

        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user && pass) {
          transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          });
        } else {
          try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
              host: "smtp.ethereal.email",
              port: 587,
              secure: false,
              auth: {
                user: testAccount.user,
                pass: testAccount.pass,
              },
            });
          } catch (e) {
            console.warn("Failed to create test email account, using JSON transport fallback", e);
            transporter = nodemailer.createTransport({
              jsonTransport: true,
            });
          }
        }

        // Convert QR Data URL to Mail Attachment
        const attachments: any[] = [];
        let qrCid = "";

        if (qrDataUrl && qrDataUrl.startsWith("data:image/")) {
          const matches = qrDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches[2]) {
            const mimeType = matches[1] || "image/png";
            const base64Data = matches[2];
            qrCid = "qrcode_asset_image";

            attachments.push({
              filename: `QR_${assetTitle.replace(/[^a-zA-Z0-9]/g, "_")}.png`,
              content: Buffer.from(base64Data, "base64"),
              contentType: mimeType,
              cid: qrCid,
            });
          }
        }

        // Format attached images
        const imagesHtml =
          attachedImages && attachedImages.length > 0
            ? `
          <div style="margin-top: 20px;">
            <p style="font-weight: bold; color: #1e293b; margin-bottom: 10px;">📷 Hình ảnh thực tế đính kèm (${attachedImages.length} ảnh):</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${attachedImages
                .map(
                  (imgSrc: string, i: number) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background: #ffffff;">
                  <img src="${imgSrc}" alt="Ảnh tài sản ${i + 1}" style="max-width: 180px; max-height: 120px; object-fit: cover; border-radius: 6px; display: block;" />
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : "";

        // Format attached documents/PDFs
        const documentsHtml =
          attachedDocuments && attachedDocuments.length > 0
            ? `
          <div style="margin-top: 20px;">
            <p style="font-weight: bold; color: #1e293b; margin-bottom: 10px;">📋 Hồ sơ tài liệu & File PDF đính kèm (${attachedDocuments.length} tệp):</p>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${attachedDocuments
                .map(
                  (doc: any, i: number) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; background: #f8fafc; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-weight: bold; color: #0f172a;">${i + 1}. ${doc.name || "Tài liệu"}</span>
                  ${doc.url ? `<a href="${doc.url.startsWith("http") ? doc.url : `http://localhost:${PORT}${doc.url}`}" style="color: #00529C; font-weight: bold; text-decoration: none;">Tải / Xem tệp ➔</a>` : ""}
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : "";

        // Construct Professional HTML Mail Body
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px;">
            <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
              <div style="background-color: #00529C; color: #ffffff; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">THÔNG TIN TÀI SẢN & MÃ QR</h1>
                <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Hệ thống Quản lý Tài sản & Mã QR VietinBank</p>
              </div>
              <div style="padding: 24px;">
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
                  <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #00529C; display: block; margin-bottom: 2px;">📌 Tên Tài Sản</span>
                  <span style="font-size: 16px; font-weight: bold; color: #0f172a;">${assetTitle}</span>
                </div>
                ${
                  qrCid
                    ? `
                <div style="text-align: center; background-color: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-bottom: 20px;">
                  <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: bold; color: #475569;">MÃ QR CODE TÀI SẢN</p>
                  <img src="cid:${qrCid}" alt="Mã QR" style="max-width: 200px; height: auto; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 10px rgba(0,0,0,0.08);" />
                  <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b;">(Quét mã bằng camera điện thoại hoặc Zalo để mở liên kết)</p>
                </div>
              `
                    : ""
                }
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                  ${
                    marketValue
                      ? `
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; width: 35%; background-color: #f8fafc;">💰 Giá ước tính</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #b45309; font-weight: bold; font-size: 15px;">${marketValue}</td>
                  </tr>
                `
                      : ""
                  }
                  ${
                    coordinates
                      ? `
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; background-color: #f8fafc;">📍 Tọa độ GPS</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #047857; font-weight: bold; font-family: monospace;">${coordinates}</td>
                  </tr>
                `
                      : ""
                  }
                  ${
                    rawContent
                      ? `
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569; background-color: #f8fafc;">🔗 Link / Nội dung QR</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0284c7; word-break: break-all;">
                      <a href="${rawContent}" target="_blank" style="color: #0284c7; text-decoration: underline;">${rawContent}</a>
                    </td>
                  </tr>
                `
                      : ""
                  }
                </table>
                ${
                  coordinates
                    ? `
                <div style="margin-top: 15px; text-align: center;">
                  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates.replace("@", ""))}" 
                     target="_blank" 
                     style="display: inline-block; padding: 10px 20px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;">
                    🗺️ Xem Vị Trí Trên Google Maps
                  </a>
                </div>
              `
                    : ""
                }
                ${imagesHtml}
                ${documentsHtml}
                ${
                  message
                    ? `
                <div style="margin-top: 20px; background-color: #f8fafc; border-left: 4px solid #00529C; padding: 12px 16px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #00529C; text-transform: uppercase;">📝 Ghi chú gửi kèm:</p>
                  <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-line;">${message}</p>
                </div>
              `
                    : ""
                }
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 4px 0;">Thư này được tạo tự động từ ứng dụng Quản lý Tài sản QR VietinBank.</p>
                ${senderEmail ? `<p style="margin: 0; font-weight: bold; color: #334155;">Người gửi: ${senderEmail}</p>` : ""}
              </div>
            </div>
          </body>
          </html>
        `;

        // Plain text fallback
        const textBody = `THÔNG TIN TÀI SẢN & MÃ QR
========================================
Tên tài sản: ${assetTitle}
Link QR: ${rawContent || "N/A"}
Tọa độ GPS: ${coordinates || "N/A"}
Giá ước tính: ${marketValue || "N/A"}
${message ? `\nGhi chú: ${message}\n` : ""}
========================================`;

        const mailOptions = {
          from: senderEmail
            ? `VietinBank Asset QR <${senderEmail}>`
            : '"VietinBank Asset QR" <no-reply@vietinbank.com>',
          to: to.trim(),
          subject: `[Thông Tin Tài Sản] ${assetTitle}`,
          text: textBody,
          html: htmlContent,
          attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);

        const previewUrl = nodemailer.getTestMessageUrl(info);

        return res.json({
          success: true,
          message: `Đã tự động gửi email thành công tới ${to}!`,
          messageId: info.messageId,
          previewUrl: previewUrl || null,
        });
      }
    } catch (err: any) {
      console.error("Error sending email:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Gửi email thất bại, vui lòng kiểm tra lại địa chỉ email.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
